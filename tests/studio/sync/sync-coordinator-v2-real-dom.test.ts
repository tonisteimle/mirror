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

  it('drops the synthetic empty-state wrapper (not in SourceMap)', () => {
    // When code is empty, compile-service emits a synthetic <div data-mirror-id="node-1"
    // data-mirror-root="true" data-mirror-name="App" data-component="App"> as a drop
    // target. That node is *not* in the SourceMap. The walk must skip it
    // implicitly via the SourceMap-presence check; otherwise the breadcrumb
    // would show "App" even though the user wrote nothing.
    document.body.innerHTML = `
      <div id="preview">
        <div class="mirror-root">
          <div data-mirror-id="node-1" data-mirror-root="true"
               data-mirror-name="App" data-component="App"></div>
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
