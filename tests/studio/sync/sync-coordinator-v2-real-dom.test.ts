// @vitest-environment jsdom
/**
 * v2 SyncCoordinator — real-DOM regression tests.
 *
 * The existing `sync-coordinator-ports.test.ts` exercises the algorithm
 * against mock ports; that catches algorithm bugs but cannot catch bugs
 * that live in the contract between the coordinator and the production
 * DOM/State adapters. This suite plugs `createProductionSyncPorts` into
 * a jsdom DOM and the real `state`/`events` modules, then asserts the
 * user-observable outcomes (selected DOM, breadcrumb content) for the
 * scenarios that have historically broken or are easy to break:
 *
 *  - the user's actual root carries `data-mirror-root="true"` — it must
 *    appear in the breadcrumb, not be filtered out.
 *  - the synthetic empty-state wrapper has `data-mirror-id="node-1"` but
 *    is *not* registered in the SourceMap; the breadcrumb walk must drop
 *    it implicitly.
 *  - clearing selection clears the breadcrumb.
 *
 * If any of these regress, the user-visible cursor↔preview↔breadcrumb
 * sync that's central to Mirror Studio breaks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  SyncCoordinator,
  createSyncCoordinatorWithPorts,
  type ExtendedSyncPorts,
} from '../../../studio/sync/sync-coordinator-v2'
import {
  createProductionSyncPorts,
  type ProductionSyncPorts,
} from '../../../studio/sync/adapters/production-adapters'
import { createMockSourceMap, type MockSourceMap } from '../../utils/mocks/sync-mocks'
import { resetStudioState } from '../../utils/helpers/sync-helpers'
import { state, actions } from '../../../studio/core'
import type { SourceMap } from '../../../compiler/ir/source-map'

let coordinator: SyncCoordinator
let ports: ProductionSyncPorts
let sourceMap: MockSourceMap
let highlightHistory: (string | null)[]

beforeEach(() => {
  resetStudioState()
  document.body.innerHTML = ''

  sourceMap = createMockSourceMap()
  ports = createProductionSyncPorts({ sourceMap: sourceMap as unknown as SourceMap })

  highlightHistory = []
  coordinator = createSyncCoordinatorWithPorts(ports as ExtendedSyncPorts, {
    cursorDebounce: 0,
  })
  coordinator.setTargets({
    highlightPreviewElement: nodeId => highlightHistory.push(nodeId),
  })
  coordinator.subscribe()
})

afterEach(() => {
  coordinator?.dispose()
})

// =============================================================================
// Breadcrumb against real DOM
// =============================================================================

describe('breadcrumb (real DOM via production adapters)', () => {
  it('includes the user root when it carries data-mirror-root="true"', () => {
    // The DOM emitter sets data-mirror-root on the user's actual top-level
    // element so runtime/state-machine can find the canvas. A naive filter
    // on that attribute would hide the user's real root from the breadcrumb.
    sourceMap._setNode('node-1', { componentName: 'Frame' })
    sourceMap._setNode('node-2', { componentName: 'Text' })

    document.body.innerHTML = `
      <div id="preview">
        <div class="mirror-root">
          <div data-mirror-id="node-1" data-mirror-root="true">
            <span data-mirror-id="node-2">hello</span>
          </div>
        </div>
      </div>
    `

    actions.setSelection('node-2', 'editor')
    expect(state.get().breadcrumb.map(c => c.name)).toEqual(['Frame', 'Text'])

    actions.setSelection('node-1', 'editor')
    expect(state.get().breadcrumb.map(c => c.name)).toEqual(['Frame'])
  })

  it('drops the synthetic empty-state wrapper (data-mirror-synthetic="true")', () => {
    // When code is empty, compile-service emits a synthetic wrapper with
    // data-mirror-synthetic="true". The walk must skip it; otherwise "App"
    // shows up as a phantom breadcrumb entry even though the user wrote
    // nothing.
    document.body.innerHTML = `
      <div id="preview">
        <div class="mirror-root">
          <div data-mirror-id="node-1" data-mirror-root="true" data-mirror-synthetic="true"
               data-mirror-name="App" data-component="App"></div>
        </div>
      </div>
    `

    actions.setSelection('node-1', 'editor')
    expect(state.get().breadcrumb).toEqual([])
  })

  it('explicitly skips data-mirror-synthetic="true" even if SourceMap has the node', () => {
    // Defense-in-depth: even if the SourceMap *does* have node-1 registered
    // (say after a stale compile or test misconfiguration), the synthetic
    // attribute alone must cause the walk to skip the wrapper. The
    // SourceMap-absence filter is no longer the only line of defense.
    sourceMap._setNode('node-1', { componentName: 'App' })
    document.body.innerHTML = `
      <div id="preview">
        <div class="mirror-root">
          <div data-mirror-id="node-1" data-mirror-root="true" data-mirror-synthetic="true"></div>
        </div>
      </div>
    `

    actions.setSelection('node-1', 'editor')
    expect(state.get().breadcrumb).toEqual([])
  })

  it('clears the breadcrumb when selection moves to null', () => {
    sourceMap._setNode('node-1', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="node-1" data-mirror-root="true">x</div>
      </div>
    `

    actions.setSelection('node-1', 'editor')
    expect(state.get().breadcrumb.length).toBeGreaterThan(0)

    actions.setSelection(null, 'editor')
    expect(state.get().breadcrumb).toEqual([])
  })

  it('walks deeply nested children all the way up', () => {
    sourceMap._setNode('outer', { componentName: 'Card' })
    sourceMap._setNode('mid', { componentName: 'Frame' })
    sourceMap._setNode('leaf', { componentName: 'Button' })

    document.body.innerHTML = `
      <div id="preview">
        <div class="mirror-root">
          <div data-mirror-id="outer" data-mirror-root="true">
            <div data-mirror-id="mid">
              <button data-mirror-id="leaf">leaf</button>
            </div>
          </div>
        </div>
      </div>
    `

    actions.setSelection('leaf', 'editor')
    expect(state.get().breadcrumb.map(c => c.name)).toEqual(['Card', 'Frame', 'Button'])
    expect(state.get().breadcrumb.map(c => c.nodeId)).toEqual(['outer', 'mid', 'leaf'])
  })

  it('stops at .mirror-root container when no #preview is present', () => {
    sourceMap._setNode('root', { componentName: 'Frame' })
    sourceMap._setNode('inner', { componentName: 'Button' })

    document.body.innerHTML = `
      <div class="mirror-root">
        <div data-mirror-id="root" data-mirror-root="true">
          <div data-mirror-id="inner">x</div>
        </div>
      </div>
    `

    actions.setSelection('inner', 'editor')
    expect(state.get().breadcrumb.map(c => c.name)).toEqual(['Frame', 'Button'])
  })
})

// =============================================================================
// Selection → preview highlight
// =============================================================================

describe('selection → highlightPreviewElement (real DOM)', () => {
  it('forwards a non-null nodeId to the highlight target on editor selection', () => {
    sourceMap._setNode('node-2', { componentName: 'Text' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="node-2">hi</div>
      </div>
    `
    actions.setSelection('node-2', 'editor')
    expect(highlightHistory).toEqual(['node-2'])
  })

  it('forwards null on clear-selection', () => {
    sourceMap._setNode('node-2', { componentName: 'Text' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="node-2">hi</div>
      </div>
    `
    actions.setSelection('node-2', 'editor')
    actions.setSelection(null, 'editor')
    expect(highlightHistory).toEqual(['node-2', null])
  })

  it('does not call highlight when the selection origin is preview (avoids loops)', () => {
    sourceMap._setNode('node-2', { componentName: 'Text' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="node-2">hi</div>
      </div>
    `
    actions.setSelection('node-2', 'preview')
    expect(highlightHistory).toEqual([])
  })
})

// =============================================================================
// handleEditorSelection — multi-line ranges in real DOM
// =============================================================================

describe('handleEditorSelection (real DOM)', () => {
  it('promotes a multi-line range to multiSelection, filtering descendants', () => {
    // Lines 1..3 contain a parent and two of its children. The walk should
    // strip the children (since their parent is already in the range) and
    // multi-select only the top-level node — that's the contract that
    // prevents "select-all" from highlighting both Frame and its Texts.
    sourceMap._setNode('parent', {
      componentName: 'Frame',
      position: { line: 1, column: 0, offset: 0 },
    })
    sourceMap._setNode('child-a', {
      componentName: 'Text',
      position: { line: 2, column: 0, offset: 0 },
    })
    sourceMap._setNode('child-b', {
      componentName: 'Text',
      position: { line: 3, column: 0, offset: 0 },
    })
    sourceMap._setNodeAtLine(1, 'parent')
    sourceMap._setNodeAtLine(2, 'child-a')
    sourceMap._setNodeAtLine(3, 'child-b')

    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="parent">
          <span data-mirror-id="child-a">a</span>
          <span data-mirror-id="child-b">b</span>
        </div>
      </div>
    `

    coordinator.handleEditorSelection(1, 3)
    // Only `parent` survives the descendant-filter, so single-select fires
    // (multiSelection only kicks in for ≥2 filtered nodes).
    expect(state.get().selection.nodeId).toBe('parent')
    expect(state.get().multiSelection).toEqual([])
  })

  it('keeps multiple sibling nodes in multiSelection', () => {
    sourceMap._setNode('a', { componentName: 'Text', position: { line: 1, column: 0, offset: 0 } })
    sourceMap._setNode('b', { componentName: 'Text', position: { line: 2, column: 0, offset: 0 } })
    sourceMap._setNodeAtLine(1, 'a')
    sourceMap._setNodeAtLine(2, 'b')

    document.body.innerHTML = `
      <div id="preview">
        <span data-mirror-id="a">a</span>
        <span data-mirror-id="b">b</span>
      </div>
    `

    coordinator.handleEditorSelection(1, 2)
    expect(state.get().multiSelection.sort()).toEqual(['a', 'b'])
  })

  it('falls back to single selection when only one node lies in the range', () => {
    sourceMap._setNode('only', {
      componentName: 'Frame',
      position: { line: 4, column: 0, offset: 0 },
    })
    sourceMap._setNodeAtLine(4, 'only')

    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="only">x</div></div>
    `

    coordinator.handleEditorSelection(4, 4)
    expect(state.get().selection.nodeId).toBe('only')
    expect(state.get().multiSelection).toEqual([])
  })
})

// =============================================================================
// triggerInitialSync — first compile + DOM-root selection
// =============================================================================

describe('triggerInitialSync (real DOM)', () => {
  it('selects the root element on first call (origin: preview, no editor scroll)', async () => {
    sourceMap._setNode('root', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="root" data-mirror-root="true">root</div>
      </div>
    `

    coordinator.triggerInitialSync()
    // wait for the rAF callback inside the coordinator
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    expect(state.get().selection.nodeId).toBe('root')
    expect(state.get().selection.origin).toBe('preview')
  })

  it('is a no-op on second call (initial-sync flag latches once)', async () => {
    sourceMap._setNode('root', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="root" data-mirror-root="true">root</div>
      </div>
    `

    coordinator.triggerInitialSync()
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    // Manually clear, then call again — should NOT re-select.
    actions.setSelection(null, 'editor')
    coordinator.triggerInitialSync()
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    expect(state.get().selection.nodeId).toBeNull()
  })

  it('resetInitialSync re-arms triggerInitialSync after file switch', async () => {
    sourceMap._setNode('root', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="root" data-mirror-root="true">root</div>
      </div>
    `

    coordinator.triggerInitialSync()
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
    actions.setSelection(null, 'editor')

    coordinator.resetInitialSync()
    coordinator.triggerInitialSync()
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    expect(state.get().selection.nodeId).toBe('root')
  })
})

// =============================================================================
// handleSelectionChange — legacy compat entry
// =============================================================================

describe('handleSelectionChange (real DOM)', () => {
  it('updates state when called with a different nodeId', () => {
    sourceMap._setNode('a', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="a">a</div></div>
    `

    coordinator.handleSelectionChange('a', 'editor')
    expect(state.get().selection.nodeId).toBe('a')
  })

  it('is a no-op when the selection is unchanged (prevents sync loops)', () => {
    sourceMap._setNode('a', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="a">a</div></div>
    `

    actions.setSelection('a', 'editor')
    const beforeLen = highlightHistory.length

    coordinator.handleSelectionChange('a', 'editor')
    expect(highlightHistory.length).toBe(beforeLen)
  })
})
