// @vitest-environment jsdom
/**
 * Tests for studio/sync/adapters/production-adapters.ts
 *
 * Production sync adapters wrap the real studio infrastructure (events,
 * state, DOM, timing) for the SyncCoordinator V2 ports. Previously 0%
 * coverage. These tests pin:
 *  - createEventBusPort: wraps events.on / events.emit
 *  - createStateStorePort: wraps actions/state for selection + breadcrumb
 *  - createDOMQueryPort: DOM walks (root finder, parent walker, boundary
 *    detection); custom previewSelector + boundaryClass
 *  - createClockPort: setTimeout/rAF parity with window
 *  - createSourceMapPort: getNodeById / getNodeAtLine / getDefinitionAtLine,
 *    null-safety when no sourceMap is set, setSourceMap mutability
 *  - createProductionSyncPorts: factory wires all five ports
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createEventBusPort,
  createStateStorePort,
  createDOMQueryPort,
  createClockPort,
  createSourceMapPort,
  createProductionSyncPorts,
} from '../../studio/sync/adapters/production-adapters'
import { state, events, actions } from '../../studio/core'
import type { SourceMap } from '../../compiler'

// =============================================================================
// EventBusPort
// =============================================================================

describe('createEventBusPort', () => {
  let port: ReturnType<typeof createEventBusPort>
  beforeEach(() => {
    port = createEventBusPort()
  })

  it('subscribes to selection:changed via events.on and returns a cleanup fn', () => {
    const calls: unknown[] = []
    const cleanup = port.onSelectionChanged(payload => calls.push(payload))

    events.emit('selection:changed', { nodeId: 'n1', origin: 'editor' })
    expect(calls.length).toBe(1)

    cleanup()
    events.emit('selection:changed', { nodeId: 'n2', origin: 'preview' })
    // After cleanup, no further calls.
    expect(calls.length).toBe(1)
  })

  it('emitDefinitionSelected fires definition:selected with payload', () => {
    let captured: { componentName: string; origin: string } | null = null
    const off = events.on('definition:selected', p => (captured = p as never))
    port.emitDefinitionSelected('Card', 'editor')
    expect(captured).toEqual({ componentName: 'Card', origin: 'editor' })
    off()
  })
})

// =============================================================================
// StateStorePort
// =============================================================================

describe('createStateStorePort', () => {
  let port: ReturnType<typeof createStateStorePort>
  beforeEach(() => {
    port = createStateStorePort()
    // Reset selection
    actions.setSelection(null, 'editor')
    actions.clearMultiSelection()
    actions.setBreadcrumb([])
  })

  it('getSelection reflects state.selection', () => {
    actions.setSelection('xx', 'preview')
    expect(port.getSelection()).toEqual({ nodeId: 'xx', origin: 'preview' })
  })

  it('setSelection delegates to actions.setSelection', () => {
    port.setSelection('yy', 'editor')
    expect(state.get().selection.nodeId).toBe('yy')
    expect(state.get().selection.origin).toBe('editor')
  })

  it('setMultiSelection / clearMultiSelection mutate state.multiSelection', () => {
    port.setMultiSelection(['a', 'b', 'c'])
    expect(state.get().multiSelection).toEqual(['a', 'b', 'c'])
    port.clearMultiSelection()
    expect(state.get().multiSelection).toEqual([])
  })

  it('setBreadcrumb writes to state.breadcrumb', () => {
    port.setBreadcrumb([
      { nodeId: 'r', name: 'Root' },
      { nodeId: 'k', name: 'Kid' },
    ])
    expect(state.get().breadcrumb).toEqual([
      { nodeId: 'r', name: 'Root' },
      { nodeId: 'k', name: 'Kid' },
    ])
  })
})

// =============================================================================
// DOMQueryPort
// =============================================================================

describe('createDOMQueryPort — defaults (#preview / .mirror-root)', () => {
  let port: ReturnType<typeof createDOMQueryPort>

  beforeEach(() => {
    port = createDOMQueryPort()
    document.body.innerHTML = ''
  })

  it('findRootMirrorElement returns the FIRST [data-mirror-id] inside #preview', () => {
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="root">root</div>
        <div data-mirror-id="other">other</div>
      </div>
    `
    expect(port.findRootMirrorElement()).toEqual({ nodeId: 'root' })
  })

  it('findRootMirrorElement returns null when #preview is missing', () => {
    document.body.innerHTML = `<div data-mirror-id="orphan">x</div>`
    expect(port.findRootMirrorElement()).toBeNull()
  })

  it('findRootMirrorElement returns null when #preview has no [data-mirror-id]', () => {
    document.body.innerHTML = `<div id="preview"><div>no mirror</div></div>`
    expect(port.findRootMirrorElement()).toBeNull()
  })

  it('findElementByMirrorId returns the wrapped element + DOM ref', () => {
    document.body.innerHTML = `<div data-mirror-id="x" id="x">x</div>`
    const el = port.findElementByMirrorId('x')
    expect(el).not.toBeNull()
    expect(el?.nodeId).toBe('x')
    expect((el?._ref as HTMLElement).id).toBe('x')
  })

  it('findElementByMirrorId returns null when no element matches', () => {
    document.body.innerHTML = `<div></div>`
    expect(port.findElementByMirrorId('nope')).toBeNull()
  })

  it('getParentWithMirrorId walks upward to the nearest [data-mirror-id]', () => {
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="grand">
          <div data-mirror-id="parent">
            <div data-mirror-id="leaf">leaf</div>
          </div>
        </div>
      </div>
    `
    const leaf = port.findElementByMirrorId('leaf')!
    const parent = port.getParentWithMirrorId(leaf)
    expect(parent?.nodeId).toBe('parent')

    const grand = port.getParentWithMirrorId(parent!)
    expect(grand?.nodeId).toBe('grand')
  })

  it('getParentWithMirrorId stops at the #preview boundary', () => {
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="root">root</div>
      </div>
    `
    const root = port.findElementByMirrorId('root')!
    expect(port.getParentWithMirrorId(root)).toBeNull()
  })

  it('getParentWithMirrorId stops at .mirror-root when #preview is absent', () => {
    document.body.innerHTML = `
      <div class="mirror-root">
        <div data-mirror-id="root">root</div>
      </div>
    `
    const root = port.findElementByMirrorId('root')!
    expect(port.getParentWithMirrorId(root)).toBeNull()
  })

  it('getParentWithMirrorId returns null for an element with no _ref', () => {
    expect(port.getParentWithMirrorId({ nodeId: 'x' })).toBeNull()
  })

  it('isPreviewBoundary returns true for #preview / .mirror-root, false otherwise', () => {
    document.body.innerHTML = `
      <div id="preview"></div>
      <div class="mirror-root"></div>
      <div id="other"></div>
    `
    const preview = document.getElementById('preview')!
    const mirror = document.querySelector('.mirror-root')!
    const other = document.getElementById('other')!

    expect(port.isPreviewBoundary({ nodeId: 'p', _ref: preview })).toBe(true)
    expect(port.isPreviewBoundary({ nodeId: 'm', _ref: mirror })).toBe(true)
    expect(port.isPreviewBoundary({ nodeId: 'o', _ref: other })).toBe(false)
  })

  it('isPreviewBoundary returns false when _ref is missing', () => {
    expect(port.isPreviewBoundary({ nodeId: 'x' })).toBe(false)
  })
})

describe('createDOMQueryPort — custom selector + boundaryClass', () => {
  it('honors custom previewSelector', () => {
    const port = createDOMQueryPort({ previewSelector: '#stage' })
    document.body.innerHTML = `
      <div id="stage"><div data-mirror-id="r">r</div></div>
      <div id="preview"><div data-mirror-id="x">x</div></div>
    `
    expect(port.findRootMirrorElement()).toEqual({ nodeId: 'r' })
  })

  it('honors custom boundaryClass for parent-walk termination', () => {
    const port = createDOMQueryPort({ boundaryClass: 'my-app' })
    document.body.innerHTML = `
      <div class="my-app">
        <div data-mirror-id="root">root</div>
      </div>
    `
    const root = port.findElementByMirrorId('root')!
    expect(port.getParentWithMirrorId(root)).toBeNull()
  })

  it('isPreviewBoundary honors the custom boundaryClass', () => {
    const port = createDOMQueryPort({ boundaryClass: 'app-root' })
    document.body.innerHTML = `<div class="app-root" id="x"></div>`
    const el = document.getElementById('x')!
    expect(port.isPreviewBoundary({ nodeId: 'x', _ref: el })).toBe(true)
  })
})

// =============================================================================
// ClockPort
// =============================================================================

describe('createClockPort', () => {
  let port: ReturnType<typeof createClockPort>
  beforeEach(() => {
    port = createClockPort()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('setTimeout schedules + clearTimeout cancels', () => {
    const fired: string[] = []
    const id = port.setTimeout(() => fired.push('a'), 100)
    port.clearTimeout(id)
    vi.advanceTimersByTime(200)
    expect(fired).toEqual([])
  })

  it('setTimeout fires after delay', () => {
    const fired: string[] = []
    port.setTimeout(() => fired.push('a'), 100)
    vi.advanceTimersByTime(99)
    expect(fired).toEqual([])
    vi.advanceTimersByTime(2)
    expect(fired).toEqual(['a'])
  })

  it('requestAnimationFrame schedules + cancelAnimationFrame cancels', () => {
    const fired: string[] = []
    const id = port.requestAnimationFrame(() => fired.push('rAF'))
    port.cancelAnimationFrame(id)
    vi.runAllTimers()
    expect(fired).toEqual([])
  })

  it('requestAnimationFrame fires when timers advance', () => {
    const fired: string[] = []
    port.requestAnimationFrame(() => fired.push('rAF'))
    vi.runAllTimers()
    expect(fired).toEqual(['rAF'])
  })
})

// =============================================================================
// SourceMapPort
// =============================================================================

describe('createSourceMapPort', () => {
  function fakeSourceMap(
    overrides: Partial<{
      nodes: Record<
        string,
        {
          nodeId: string
          componentName: string
          position: { line: number; column: number; offset?: number }
        }
      >
      lineToNode: Record<number, string>
      lineToDef: Record<
        number,
        { componentName: string; position?: { line: number; column: number } }
      >
    }> = {}
  ) {
    const nodes = overrides.nodes || {}
    const lineToNode = overrides.lineToNode || {}
    const lineToDef = overrides.lineToDef || {}
    return {
      getNodeById: (id: string) => nodes[id],
      getNodeAtLine: (line: number) => {
        const id = lineToNode[line]
        return id ? nodes[id] : undefined
      },
      getDefinitionAtLine: (line: number) => lineToDef[line],
    } as unknown as SourceMap
  }

  it('returns null from all getters when no sourceMap is set', () => {
    const port = createSourceMapPort(null)
    expect(port.getNodeById('x')).toBeNull()
    expect(port.getNodeAtLine(5)).toBeNull()
    expect(port.getDefinitionAtLine(5)).toBeNull()
  })

  it('getNodeById returns the canonical node shape', () => {
    const sm = fakeSourceMap({
      nodes: { x: { nodeId: 'x', componentName: 'Btn', position: { line: 3, column: 0 } } },
    })
    const port = createSourceMapPort(sm)
    expect(port.getNodeById('x')).toEqual({
      nodeId: 'x',
      componentName: 'Btn',
      position: { line: 3, column: 0 },
    })
  })

  it('getNodeById returns null when id is unknown', () => {
    const sm = fakeSourceMap({ nodes: {} })
    const port = createSourceMapPort(sm)
    expect(port.getNodeById('absent')).toBeNull()
  })

  it('getNodeAtLine resolves through line-to-node mapping', () => {
    const sm = fakeSourceMap({
      nodes: {
        a: { nodeId: 'a', componentName: 'Frame', position: { line: 7, column: 0 } },
      },
      lineToNode: { 7: 'a' },
    })
    const port = createSourceMapPort(sm)
    expect(port.getNodeAtLine(7)?.nodeId).toBe('a')
    expect(port.getNodeAtLine(8)).toBeNull()
  })

  it('getDefinitionAtLine returns canonical shape with default position when missing', () => {
    const sm = fakeSourceMap({
      lineToDef: { 4: { componentName: 'Card' } }, // no position
    })
    const port = createSourceMapPort(sm)
    expect(port.getDefinitionAtLine(4)).toEqual({
      componentName: 'Card',
      position: { line: 0, column: 0 },
    })
  })

  it('getDefinitionAtLine preserves an explicit position', () => {
    const sm = fakeSourceMap({
      lineToDef: { 9: { componentName: 'Btn', position: { line: 9, column: 2 } } },
    })
    const port = createSourceMapPort(sm)
    expect(port.getDefinitionAtLine(9)).toEqual({
      componentName: 'Btn',
      position: { line: 9, column: 2 },
    })
  })

  it('setSourceMap swaps the underlying SourceMap (later calls see new data)', () => {
    const port = createSourceMapPort(null)
    expect(port.getNodeById('x')).toBeNull()

    const sm = fakeSourceMap({
      nodes: { x: { nodeId: 'x', componentName: 'Frame', position: { line: 1, column: 0 } } },
    })
    port.setSourceMap(sm)
    expect(port.getNodeById('x')?.componentName).toBe('Frame')

    port.setSourceMap(null)
    expect(port.getNodeById('x')).toBeNull()
  })
})

// =============================================================================
// createProductionSyncPorts factory
// =============================================================================

describe('createProductionSyncPorts', () => {
  it('returns all five ports wired', () => {
    const ports = createProductionSyncPorts()
    expect(typeof ports.eventBus.onSelectionChanged).toBe('function')
    expect(typeof ports.stateStore.getSelection).toBe('function')
    expect(typeof ports.domQuery.findRootMirrorElement).toBe('function')
    expect(typeof ports.clock.setTimeout).toBe('function')
    expect(typeof ports.sourceMap.getNodeById).toBe('function')
    expect(typeof ports.sourceMap.setSourceMap).toBe('function')
  })

  it('forwards DOM config to the domQuery port', () => {
    document.body.innerHTML = `<div id="stage"><div data-mirror-id="r">r</div></div>`
    const ports = createProductionSyncPorts({ dom: { previewSelector: '#stage' } })
    expect(ports.domQuery.findRootMirrorElement()).toEqual({ nodeId: 'r' })
  })

  it('forwards initial sourceMap into the sourceMap port', () => {
    const sm = {
      getNodeById: (id: string) =>
        id === 'x'
          ? { nodeId: 'x', componentName: 'Frame', position: { line: 1, column: 0 } }
          : undefined,
      getNodeAtLine: () => undefined,
      getDefinitionAtLine: () => undefined,
    } as unknown as SourceMap
    const ports = createProductionSyncPorts({ sourceMap: sm })
    expect(ports.sourceMap.getNodeById('x')?.componentName).toBe('Frame')
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  it('M1: getParentWithMirrorId terminates at #preview even with mirror-IDs outside', () => {
    // Catches the mutation that inverts the boundary id-check. Setup: a
    // mirror-id-bearing ancestor lives OUTSIDE #preview (in body). Without
    // the boundary check, the walker would climb out of #preview and
    // incorrectly return the outer element.
    const port = createDOMQueryPort()
    document.body.innerHTML = `
      <div data-mirror-id="outer-bogus">
        <div id="preview">
          <div data-mirror-id="root">
            <div data-mirror-id="leaf">leaf</div>
          </div>
        </div>
      </div>
    `
    const root = port.findElementByMirrorId('root')!
    // root's parent walk must STOP at #preview, not cross into outer-bogus.
    expect(port.getParentWithMirrorId(root)).toBeNull()
  })

  it('M2: SourceMapPort propagates null when getNodeById returns null/undefined', () => {
    // Catches the mutation that removes the early-return for unknown ids.
    const sm = {
      getNodeById: () => null,
      getNodeAtLine: () => null,
      getDefinitionAtLine: () => null,
    } as unknown as SourceMap
    const port = createSourceMapPort(sm)
    expect(port.getNodeById('x')).toBeNull()
  })

  it('M3: emitDefinitionSelected origin is "editor" verbatim (no defaults)', () => {
    let captured: { componentName: string; origin: string } | null = null
    const off = events.on('definition:selected', p => (captured = p as never))
    const port = createEventBusPort()
    port.emitDefinitionSelected('Card', 'editor')
    expect(captured?.origin).toBe('editor')
    off()
  })
})
