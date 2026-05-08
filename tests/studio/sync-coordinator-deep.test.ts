// @vitest-environment jsdom
/**
 * Tests for studio/sync/sync-coordinator.ts — coverage gaps
 *
 * The existing test file covers Construction/Subscription/Selection-
 * Propagation/Cursor-Debouncing/Sync-Queueing/Preview-Click. It leaves
 * untested:
 *  - triggerInitialSync (rAF + DOM-root selection on first compile)
 *  - handleEditorSelection (multi-line range → multiSelection, with
 *    parent/child filtering against the rendered DOM)
 *  - handleSelectionChange (legacy entry that re-fans through actions)
 *  - resetInitialSync (flag reset for file-switch)
 *  - executeCursorSync's definition path (no instance node, but
 *    sourceMap.getDefinitionAtLine returns a hit → emits
 *    'definition:selected')
 *  - computeBreadcrumbFromDOM (parent-walk through `data-mirror-id`)
 *
 * Plus 3 P3 mutation-driven cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncCoordinator, createSyncCoordinator } from '../../studio/sync/sync-coordinator'
import {
  createMockSourceMap,
  createMockSyncTargets,
  type MockSourceMap,
  type MockSyncTargets,
} from '../utils/mocks/sync-mocks'
import { resetStudioState } from '../utils/helpers/sync-helpers'
import { state, events, actions } from '../../studio/core'
import type { SourceMap } from '../../../compiler/ir/source-map'

let coordinator: SyncCoordinator
let sourceMap: MockSourceMap
let targets: MockSyncTargets

beforeEach(() => {
  vi.useFakeTimers()
  resetStudioState()
  sourceMap = createMockSourceMap()
  targets = createMockSyncTargets()
  document.body.innerHTML = ''
})

afterEach(() => {
  coordinator?.dispose()
  vi.useRealTimers()
})

// =============================================================================
// triggerInitialSync
// =============================================================================

describe('triggerInitialSync', () => {
  it('runs only once — second call is a no-op', () => {
    coordinator = createSyncCoordinator()
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)

    sourceMap._setNode('root', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="root">root</div></div>
    `

    coordinator.triggerInitialSync()
    coordinator.triggerInitialSync() // second call should be a no-op

    // Force the rAF callback to run.
    vi.runAllTimers()

    // setSelection should be invoked exactly once with origin 'preview'.
    expect(state.get().selection.nodeId).toBe('root')
  })

  it('is a no-op when no SourceMap is set', () => {
    coordinator = createSyncCoordinator()
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="x">x</div></div>
    `
    coordinator.triggerInitialSync()
    vi.runAllTimers()
    expect(state.get().selection.nodeId).toBeNull()
  })

  it('preserves an existing selection (re-syncs instead of picking root)', () => {
    coordinator = createSyncCoordinator()
    coordinator.setTargets({
      scrollEditorToLine: targets.scrollEditorToLine,
      highlightPreviewElement: targets.highlightPreviewElement,
    })
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
    coordinator.subscribe()

    // Set up state with an existing selection BEFORE triggering initial sync.
    sourceMap._setNode('btn', {
      componentName: 'Button',
      position: { line: 5, column: 0, offset: 0 },
    })
    sourceMap._setNode('root', {
      componentName: 'Frame',
      position: { line: 1, column: 0, offset: 0 },
    })
    actions.setSelection('btn', 'editor')
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="root"><div data-mirror-id="btn">btn</div></div></div>
    `

    coordinator.triggerInitialSync()
    vi.runAllTimers()

    // Existing selection should remain 'btn', not get replaced by root.
    expect(state.get().selection.nodeId).toBe('btn')
  })

  it('does NOT pick a root when the preview DOM has no [data-mirror-id]', () => {
    coordinator = createSyncCoordinator()
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
    document.body.innerHTML = `<div id="preview"><div>no mirror id</div></div>`
    coordinator.triggerInitialSync()
    vi.runAllTimers()
    expect(state.get().selection.nodeId).toBeNull()
  })
})

// =============================================================================
// resetInitialSync
// =============================================================================

describe('resetInitialSync', () => {
  it('after reset, triggerInitialSync runs again on next call (file-switch behavior)', () => {
    coordinator = createSyncCoordinator()
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)

    sourceMap._setNode('a', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="a">a</div></div>
    `
    coordinator.triggerInitialSync()
    vi.runAllTimers()
    expect(state.get().selection.nodeId).toBe('a')

    // Switch "files" — replace DOM with a different root.
    actions.setSelection(null, 'editor')
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="b">b</div></div>
    `
    sourceMap._setNode('b', { componentName: 'Frame' })

    // WITHOUT reset, triggerInitialSync is a no-op.
    coordinator.triggerInitialSync()
    vi.runAllTimers()
    expect(state.get().selection.nodeId).toBeNull()

    // After reset, it works again.
    coordinator.resetInitialSync()
    coordinator.triggerInitialSync()
    vi.runAllTimers()
    expect(state.get().selection.nodeId).toBe('b')
  })
})

// =============================================================================
// handleEditorSelection (multi-line range)
// =============================================================================

describe('handleEditorSelection — multi-line', () => {
  beforeEach(() => {
    coordinator = createSyncCoordinator()
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
  })

  it('is a no-op when no SourceMap is set', () => {
    coordinator.setSourceMap(null)
    coordinator.handleEditorSelection(1, 5)
    expect(state.get().selection.nodeId).toBeNull()
  })

  it('collects nodeIds across the line range and sets multiSelection', () => {
    sourceMap._setNode('a', {
      componentName: 'Frame',
      position: { line: 2, column: 0, offset: 0 },
    })
    sourceMap._setNode('b', {
      componentName: 'Frame',
      position: { line: 4, column: 0, offset: 0 },
    })
    sourceMap._setNodeAtLine(2, 'a')
    sourceMap._setNodeAtLine(4, 'b')

    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="a">a</div>
        <div data-mirror-id="b">b</div>
      </div>
    `

    coordinator.handleEditorSelection(2, 4)

    expect(state.get().multiSelection).toEqual(['a', 'b'])
    // Primary selection points at the first item.
    expect(state.get().selection.nodeId).toBe('a')
  })

  it('filters out CHILDREN whose ancestor is already in the selection (rooted DOM)', () => {
    sourceMap._setNode('parent', {
      componentName: 'Frame',
      position: { line: 1, column: 0, offset: 0 },
    })
    sourceMap._setNode('child', {
      componentName: 'Text',
      position: { line: 2, column: 2, offset: 0 },
    })
    sourceMap._setNodeAtLine(1, 'parent')
    sourceMap._setNodeAtLine(2, 'child')

    // child is rendered INSIDE parent
    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="parent">
          <div data-mirror-id="child">child</div>
        </div>
      </div>
    `

    coordinator.handleEditorSelection(1, 2)
    // Only 'parent' should remain — 'child' is filtered out as a descendant.
    expect(state.get().multiSelection).toEqual([])
    expect(state.get().selection.nodeId).toBe('parent')
  })

  it('reduces single-element range to plain (non-multi) selection', () => {
    sourceMap._setNode('one', {
      componentName: 'Frame',
      position: { line: 3, column: 0, offset: 0 },
    })
    sourceMap._setNodeAtLine(3, 'one')
    document.body.innerHTML = `<div id="preview"><div data-mirror-id="one">one</div></div>`

    coordinator.handleEditorSelection(3, 3)
    expect(state.get().multiSelection).toEqual([])
    expect(state.get().selection.nodeId).toBe('one')
  })

  it('clears multiSelection when no nodes match the range', () => {
    coordinator.handleEditorSelection(50, 60) // no nodes in this range
    expect(state.get().multiSelection).toEqual([])
  })

  it('deduplicates nodes that appear on the SAME line range (no double-add)', () => {
    sourceMap._setNode('a', {
      componentName: 'Frame',
      position: { line: 2, column: 0, offset: 0 },
    })
    // Make every line in the range return the SAME node — verifies the
    // `!nodeIds.includes(node.nodeId)` guard.
    sourceMap.getNodeAtLine = vi.fn(() => sourceMap._nodes.get('a'))
    document.body.innerHTML = `<div id="preview"><div data-mirror-id="a">a</div></div>`

    coordinator.handleEditorSelection(1, 5)
    // 'a' appears once even though 5 lines were scanned.
    expect(state.get().selection.nodeId).toBe('a')
    expect(state.get().multiSelection).toEqual([])
  })
})

// =============================================================================
// handleSelectionChange (legacy entry)
// =============================================================================

describe('handleSelectionChange', () => {
  beforeEach(() => {
    coordinator = createSyncCoordinator()
  })

  it('forwards to actions.setSelection with the given origin', () => {
    coordinator.handleSelectionChange('node-1', 'preview')
    expect(state.get().selection.nodeId).toBe('node-1')
    expect(state.get().selection.origin).toBe('preview')
  })

  it('is a no-op when re-selecting the SAME node (prevents sync loops)', () => {
    actions.setSelection('node-1', 'editor')
    const setSpy = vi.spyOn(actions, 'setSelection')
    coordinator.handleSelectionChange('node-1', 'preview') // same node, different origin
    expect(setSpy).not.toHaveBeenCalled()
    setSpy.mockRestore()
  })
})

// =============================================================================
// executeCursorSync — definition-path
// =============================================================================

describe('executeCursorSync — definition path', () => {
  beforeEach(() => {
    coordinator = createSyncCoordinator()
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
  })

  it('emits definition:selected when no instance node exists but a definition is found', () => {
    // No instance node at line 5 — but getDefinitionAtLine returns a match.
    sourceMap.getNodeAtLine = vi.fn(() => undefined)
    sourceMap.getDefinitionAtLine = vi.fn(() => ({ componentName: 'Card' }))

    let captured: { componentName: string; origin: string } | null = null
    const off = events.on('definition:selected', payload => {
      captured = payload as never
    })

    coordinator.handleCursorMove(5)
    vi.advanceTimersByTime(100) // past cursorDebounce default 50ms

    expect(captured).not.toBeNull()
    expect(captured!.componentName).toBe('Card')
    expect(captured!.origin).toBe('editor')
    off()
  })

  it('falls through silently when neither instance nor definition match', () => {
    sourceMap.getNodeAtLine = vi.fn(() => undefined)
    sourceMap.getDefinitionAtLine = vi.fn(() => undefined)

    let fired = false
    const off = events.on('definition:selected', () => {
      fired = true
    })

    coordinator.handleCursorMove(99)
    vi.advanceTimersByTime(100)

    expect(fired).toBe(false)
    off()
  })

  it('clears multiSelection when cursor moves into a single-line context', () => {
    actions.setMultiSelection(['a', 'b'])
    expect(state.get().multiSelection).toEqual(['a', 'b'])

    sourceMap._setNode('one', { componentName: 'Frame' })
    sourceMap._setNodeAtLine(3, 'one')

    coordinator.handleCursorMove(3)
    vi.advanceTimersByTime(100)

    expect(state.get().multiSelection).toEqual([])
  })
})

// =============================================================================
// computeBreadcrumbFromDOM (exercised through doSync via setSelection)
// =============================================================================

describe('computeBreadcrumbFromDOM', () => {
  beforeEach(() => {
    coordinator = createSyncCoordinator()
    coordinator.setTargets({
      scrollEditorToLine: targets.scrollEditorToLine,
      highlightPreviewElement: targets.highlightPreviewElement,
    })
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
    coordinator.subscribe()
  })

  it('builds breadcrumb path from leaf upward, stopping at #preview root', () => {
    sourceMap._setNode('outer', { componentName: 'Card' })
    sourceMap._setNode('mid', { componentName: 'Frame' })
    sourceMap._setNode('leaf', { componentName: 'Button' })

    document.body.innerHTML = `
      <div id="preview">
        <div data-mirror-id="outer">
          <div data-mirror-id="mid">
            <div data-mirror-id="leaf">leaf</div>
          </div>
        </div>
      </div>
    `

    actions.setSelection('leaf', 'editor')

    const crumbs = state.get().breadcrumb
    expect(crumbs.map(c => c.name)).toEqual(['Card', 'Frame', 'Button'])
    expect(crumbs.map(c => c.nodeId)).toEqual(['outer', 'mid', 'leaf'])
  })

  it('clears the breadcrumb when selection moves to null', () => {
    // First seed a non-empty breadcrumb so the assertion below is meaningful.
    sourceMap._setNode('seed', { componentName: 'Frame' })
    document.body.innerHTML = `
      <div id="preview"><div data-mirror-id="seed">seed</div></div>
    `
    actions.setSelection('seed', 'editor')
    expect(state.get().breadcrumb.length).toBeGreaterThan(0)

    // Now clear — breadcrumb must reset to [].
    actions.setSelection(null, 'editor')
    expect(state.get().breadcrumb).toEqual([])
  })

  it('returns empty when the nodeId is not present in the DOM', () => {
    sourceMap._setNode('ghost', { componentName: 'Frame' })
    actions.setSelection('ghost', 'editor')
    expect(state.get().breadcrumb).toEqual([])
  })

  it('stops at .mirror-root container when no #preview is present', () => {
    sourceMap._setNode('root', { componentName: 'Frame' })
    sourceMap._setNode('inner', { componentName: 'Button' })

    document.body.innerHTML = `
      <div class="mirror-root">
        <div data-mirror-id="root">
          <div data-mirror-id="inner">x</div>
        </div>
      </div>
    `

    actions.setSelection('inner', 'editor')
    const names = state.get().breadcrumb.map(c => c.name)
    expect(names).toEqual(['Frame', 'Button'])
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  beforeEach(() => {
    coordinator = createSyncCoordinator()
    coordinator.setTargets({
      scrollEditorToLine: targets.scrollEditorToLine,
      highlightPreviewElement: targets.highlightPreviewElement,
    })
    coordinator.setSourceMap(sourceMap as unknown as SourceMap)
    coordinator.subscribe()
  })

  it('M1: preview origin must NOT scroll editor (origin === editor guard)', () => {
    sourceMap._setNode('node-1', {
      componentName: 'Btn',
      position: { line: 5, column: 0, offset: 0 },
    })
    actions.setSelection('node-1', 'editor') // editor origin → must NOT scroll

    expect(targets._scrollHistory).toEqual([])
  })

  it('M2: editor origin MUST trigger preview highlight (origin !== preview branch)', () => {
    sourceMap._setNode('node-2', {
      componentName: 'Btn',
      position: { line: 7, column: 0, offset: 0 },
    })
    actions.setSelection('node-2', 'editor')
    expect(targets._highlightHistory[targets._highlightHistory.length - 1]).toBe('node-2')
  })

  it('M3: cursor-line dedup — moving back to same line is a no-op (prevents re-sync)', () => {
    sourceMap._setNode('one', { componentName: 'Frame' })
    sourceMap._setNodeAtLine(3, 'one')

    coordinator.handleCursorMove(3)
    vi.advanceTimersByTime(100)
    expect(state.get().selection.nodeId).toBe('one')

    // Manually clear selection to detect a re-fire from a duplicate line.
    actions.setSelection(null, 'editor')

    // Move to SAME line — dedup must skip.
    coordinator.handleCursorMove(3)
    vi.advanceTimersByTime(100)
    expect(state.get().selection.nodeId).toBeNull()
  })
})
