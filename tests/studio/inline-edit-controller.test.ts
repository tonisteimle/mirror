/**
 * QP tests for studio/inline-edit/inline-edit-controller.ts
 *
 * The controller orchestrates inline-edit sessions: it owns the dblclick
 * listener on the preview container, validates editability against the
 * SourceMap, and bridges the session's onEnd into the studio state store
 * + event bus. Tests use the real `core` (state/actions/events) plus a
 * real SourceMap so behavior matches production wiring.
 *
 * Coverage focus:
 *  - lifecycle: attach/detach, dispose, listener leak guard
 *  - startEdit: success path, missing element, non-editable type, no SourceMap
 *  - startEdit on same node returns false; on different node ends current
 *  - endEdit clears state + emits inline-edit:ended
 *  - dblclick: delay-activation, mouse-drift cancellation, cancel on outside click
 *  - editability check: uses SourceMap.getNodeById + isEditableType
 *  - state-store wiring: setInlineEditActive(true/false, nodeId)
 *  - event-bus wiring: inline-edit:started/input/ended fire
 *  - callbacks: onEditStart and onEditEnd from config invoked
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  InlineEditController,
  createInlineEditController,
} from '../../studio/inline-edit/inline-edit-controller'
import type { InlineEditConfig } from '../../studio/inline-edit/types'
import { state, events, actions } from '../../studio/core'
import { SourceMap, type NodeMapping } from '../../compiler/ir/source-map'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSourceMap(nodes: Array<{ nodeId: string; componentName: string }>): SourceMap {
  const sm = new SourceMap()
  for (const n of nodes) {
    sm.addNode({
      nodeId: n.nodeId,
      componentName: n.componentName,
      position: { line: 1, column: 1, length: 1 },
      properties: new Map(),
      isDefinition: false,
    } as NodeMapping)
  }
  return sm
}

function makePreviewElement(nodeId: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-mirror-id', nodeId)
  el.textContent = 'Hello'
  return el
}

let container: HTMLElement
let onEditStart: ReturnType<typeof vi.fn>
let onEditEnd: ReturnType<typeof vi.fn>

function makeConfig(overrides: Partial<InlineEditConfig> = {}): InlineEditConfig {
  return { container, onEditStart, onEditEnd, ...overrides }
}

beforeEach(() => {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  onEditStart = vi.fn()
  onEditEnd = vi.fn()
  // Reset shared state between tests so leakage doesn't fake passes.
  actions.setInlineEditActive(false, null)
  state.set({ sourceMap: null })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('InlineEditController — lifecycle', () => {
  it('createInlineEditController factory returns a working instance', () => {
    const ctrl = createInlineEditController(makeConfig())
    expect(ctrl).toBeInstanceOf(InlineEditController)
  })

  it('attach() binds a dblclick listener; detach() removes it', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    const sm = makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }])
    ctrl.setSourceMap(sm)

    ctrl.attach()
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(150)
    expect(ctrl.isEditing()).toBe(true)

    ctrl.endEdit(false)
    ctrl.detach()

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('detach() ends an in-progress edit and clears state', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    const sm = makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }])
    ctrl.setSourceMap(sm)
    ctrl.attach()

    ctrl.startEdit('node-1')
    expect(state.get().inlineEditActive).toBe(true)

    ctrl.detach()
    expect(state.get().inlineEditActive).toBe(false)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('dispose() is a one-shot detach + cleanup', () => {
    const ctrl = new InlineEditController(makeConfig())
    ctrl.attach()
    expect(() => ctrl.dispose()).not.toThrow()
    expect(() => ctrl.dispose()).not.toThrow() // idempotent
  })

  it('uses a custom nodeIdAttribute when configured', () => {
    const ctrl = new InlineEditController(makeConfig({ nodeIdAttribute: 'data-id' }))
    const el = document.createElement('div')
    el.setAttribute('data-id', 'node-X')
    el.textContent = 'Hello'
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-X', componentName: 'Text' }]))
    ctrl.attach()

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(150)
    expect(ctrl.isEditing()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// startEdit — success and failure paths
// ---------------------------------------------------------------------------

describe('InlineEditController — startEdit', () => {
  it('returns true and starts session for an editable Text node', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]))

    expect(ctrl.startEdit('node-1')).toBe(true)
    expect(ctrl.isEditing()).toBe(true)
    expect(ctrl.getEditingNodeId()).toBe('node-1')
  })

  it('updates the studio state store with active=true, nodeId set', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Button' }]))

    ctrl.startEdit('node-1')

    expect(state.get().inlineEditActive).toBe(true)
    expect(state.get().inlineEditNodeId).toBe('node-1')
  })

  it('invokes the onEditStart callback with nodeId and element', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'H1' }]))

    ctrl.startEdit('node-1')

    expect(onEditStart).toHaveBeenCalledWith('node-1', el)
  })

  it('emits inline-edit:started on the event bus', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]))

    const spy = vi.fn()
    const off = events.on('inline-edit:started', spy)
    ctrl.startEdit('node-1')
    off()

    expect(spy).toHaveBeenCalledWith({ nodeId: 'node-1', element: el })
  })

  it('returns false when the element is not in the container', () => {
    const ctrl = new InlineEditController(makeConfig())
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-missing', componentName: 'Text' }]))

    expect(ctrl.startEdit('node-missing')).toBe(false)
    expect(ctrl.isEditing()).toBe(false)
    expect(state.get().inlineEditActive).toBe(false)
  })

  it('returns false when the component type is not editable (e.g. Frame)', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Frame' }]))

    expect(ctrl.startEdit('node-1')).toBe(false)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('returns false when no SourceMap is available', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    // No setSourceMap and no state.sourceMap

    expect(ctrl.startEdit('node-1')).toBe(false)
  })

  it('returns false when SourceMap has no entry for the node', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-other', componentName: 'Text' }]))

    expect(ctrl.startEdit('node-1')).toBe(false)
  })

  it('falls back to state.sourceMap when controller has no local SourceMap', () => {
    // The studio bootstraps a global SourceMap on state; the controller
    // should use it when setSourceMap was never called.
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    state.set({
      sourceMap: makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]),
    })

    expect(ctrl.startEdit('node-1')).toBe(true)
  })

  it('returns false when called for the same node already being edited', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]))

    ctrl.startEdit('node-1')
    expect(ctrl.startEdit('node-1')).toBe(false)
  })

  it('switching to a different node ends the previous session and starts the new one', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el1 = makePreviewElement('node-1')
    const el2 = makePreviewElement('node-2')
    container.appendChild(el1)
    container.appendChild(el2)
    ctrl.setSourceMap(
      makeSourceMap([
        { nodeId: 'node-1', componentName: 'Text' },
        { nodeId: 'node-2', componentName: 'Button' },
      ])
    )

    ctrl.startEdit('node-1')
    expect(ctrl.getEditingNodeId()).toBe('node-1')

    expect(ctrl.startEdit('node-2')).toBe(true)
    expect(ctrl.getEditingNodeId()).toBe('node-2')
    // The first session's onEditEnd should have fired (with saved=false or true; just check it fired)
    expect(onEditEnd).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// endEdit — state cleanup
// ---------------------------------------------------------------------------

describe('InlineEditController — endEdit', () => {
  function startEditing(): { ctrl: InlineEditController; el: HTMLElement } {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]))
    ctrl.startEdit('node-1')
    return { ctrl, el }
  }

  it('endEdit(true) sets state.inlineEditActive to false and clears nodeId', () => {
    const { ctrl } = startEditing()
    ctrl.endEdit(true)

    expect(state.get().inlineEditActive).toBe(false)
    expect(state.get().inlineEditNodeId).toBe(null)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('endEdit invokes the onEditEnd callback with (nodeId, newText, saved)', () => {
    const { ctrl } = startEditing()
    ctrl.endEdit(false)

    expect(onEditEnd).toHaveBeenCalledTimes(1)
    const [nodeId, newText, saved] = onEditEnd.mock.calls[0]
    expect(nodeId).toBe('node-1')
    expect(typeof newText).toBe('string')
    expect(typeof saved).toBe('boolean')
  })

  it('endEdit emits inline-edit:ended on the event bus', () => {
    const { ctrl } = startEditing()

    const spy = vi.fn()
    const off = events.on('inline-edit:ended', spy)
    ctrl.endEdit(true)
    off()

    expect(spy).toHaveBeenCalled()
  })

  it('endEdit when no session is active is a no-op', () => {
    const ctrl = new InlineEditController(makeConfig())
    expect(() => ctrl.endEdit(false)).not.toThrow()
    expect(onEditEnd).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// dblclick — delayed activation + drift detection
// ---------------------------------------------------------------------------

describe('InlineEditController — dblclick activation', () => {
  function setup(componentName = 'Text') {
    const ctrl = new InlineEditController(makeConfig())
    const el = makePreviewElement('node-1')
    container.appendChild(el)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName }]))
    ctrl.attach()
    return { ctrl, el }
  }

  it('dblclick on an editable element does not start the session synchronously, but does after the delay', () => {
    const { ctrl, el } = setup()

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    // No synchronous activation — guards against accidental double-clicks.
    expect(ctrl.isEditing()).toBe(false)

    vi.advanceTimersByTime(200) // safely past the 150ms delay
    expect(ctrl.isEditing()).toBe(true)
  })

  it('dblclick on a non-editable element does not start an edit session', () => {
    const { ctrl, el } = setup('Frame')

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('dblclick on an element without a node-id is ignored', () => {
    const ctrl = new InlineEditController(makeConfig())
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Text' }]))
    ctrl.attach()

    const noIdEl = document.createElement('div')
    noIdEl.textContent = 'no id here'
    container.appendChild(noIdEl)

    noIdEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('dblclick walks up the DOM to find the closest [data-mirror-id]', () => {
    const ctrl = new InlineEditController(makeConfig())
    const wrapper = makePreviewElement('node-1')
    const inner = document.createElement('span')
    inner.textContent = 'inner'
    wrapper.appendChild(inner)
    container.appendChild(wrapper)
    ctrl.setSourceMap(makeSourceMap([{ nodeId: 'node-1', componentName: 'Button' }]))
    ctrl.attach()

    inner.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(150)
    expect(ctrl.getEditingNodeId()).toBe('node-1')
  })

  it('mouse-drift > 10px during the delay cancels the pending activation', () => {
    const { ctrl, el } = setup()

    el.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    )

    // Move 11px before the timer fires
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 111, clientY: 100 }))

    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('small mouse movement (<= 10px) during the delay does not cancel', () => {
    const { ctrl, el } = setup()

    el.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    )

    // Move 8px — within the 10px tolerance
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 108, clientY: 100 }))

    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(true)
  })

  it('mousedown elsewhere during the delay cancels the pending activation', () => {
    const { ctrl, el } = setup()

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    vi.advanceTimersByTime(200)
    expect(ctrl.isEditing()).toBe(false)
  })

  it('a second dblclick during the delay supersedes the first pending activation', () => {
    const ctrl = new InlineEditController(makeConfig())
    const el1 = makePreviewElement('node-1')
    const el2 = makePreviewElement('node-2')
    container.appendChild(el1)
    container.appendChild(el2)
    ctrl.setSourceMap(
      makeSourceMap([
        { nodeId: 'node-1', componentName: 'Text' },
        { nodeId: 'node-2', componentName: 'Text' },
      ])
    )
    ctrl.attach()

    el1.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    el2.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

    vi.advanceTimersByTime(150)
    // Second one wins
    expect(ctrl.getEditingNodeId()).toBe('node-2')
  })

  it('after the delay fires, mouse-drift listeners are detached (no leak)', () => {
    const { ctrl, el } = setup()
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(150)
    expect(ctrl.isEditing()).toBe(true)

    // After activation, a moving mouse must NOT dismiss the active edit.
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 9999, clientY: 9999 }))
    expect(ctrl.isEditing()).toBe(true)
  })
})
