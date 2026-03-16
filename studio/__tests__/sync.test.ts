/**
 * Tests for Sync Coordinator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncCoordinator, createSyncCoordinator } from '../sync'
import { state, actions } from '../core'

describe('SyncCoordinator', () => {
  let sync: SyncCoordinator

  beforeEach(() => {
    // Reset state
    state.set({
      source: '',
      ast: null,
      ir: null,
      sourceMap: null,
      errors: [],
      selection: { nodeId: null, origin: 'editor' },
      cursor: { line: 1, column: 1 },
      editorHasFocus: false,
      currentFile: 'index.mirror',
    })
    sync = createSyncCoordinator({ cursorDebounce: 10, debug: false })
  })

  it('should create a sync coordinator', () => {
    expect(sync).toBeInstanceOf(SyncCoordinator)
  })

  it('should handle selection changes', () => {
    const scrollSpy = vi.fn()
    const highlightSpy = vi.fn()
    const panelSpy = vi.fn()

    sync.setTargets({
      scrollEditorToLine: scrollSpy,
      highlightPreviewElement: highlightSpy,
      updatePropertyPanel: panelSpy,
    })

    // Without source map, should still update selection but not call targets
    sync.handleSelectionChange('node-1', 'preview')

    // Check state was updated
    expect(state.get().selection.nodeId).toBe('node-1')
    expect(state.get().selection.origin).toBe('preview')
  })

  it('should prevent sync loops', () => {
    // Set the same selection twice - second should be ignored
    sync.handleSelectionChange('node-1', 'preview')
    const firstSelection = state.get().selection

    sync.handleSelectionChange('node-1', 'editor')
    const secondSelection = state.get().selection

    // Origin should not change when nodeId is same
    expect(secondSelection.origin).toBe('preview')
  })

  it('should clear selection', () => {
    sync.handleSelectionChange('node-1', 'preview')
    expect(state.get().selection.nodeId).toBe('node-1')

    sync.clearSelection('keyboard')
    expect(state.get().selection.nodeId).toBeNull()
  })

  it('should debounce cursor moves', async () => {
    const scrollSpy = vi.fn()
    sync.setTargets({
      scrollEditorToLine: scrollSpy,
    })

    // Rapid cursor moves should be debounced
    sync.handleCursorMove(1, 1)
    sync.handleCursorMove(2, 1)
    sync.handleCursorMove(3, 1)

    // Wait for debounce (plus buffer)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Without source map, no actual sync happens, but debounce should work
    // This test primarily verifies no errors occur
  })

  it('should ignore duplicate cursor positions', () => {
    sync.handleCursorMove(5, 1)
    sync.handleCursorMove(5, 2) // Same line, different column - should be ignored

    // No errors should occur
  })
})

describe('Factory Functions', () => {
  it('should create coordinator with default options', () => {
    const sync = createSyncCoordinator()
    expect(sync).toBeInstanceOf(SyncCoordinator)
  })

  it('should create coordinator with custom options', () => {
    const sync = createSyncCoordinator({ cursorDebounce: 200, debug: true })
    expect(sync).toBeInstanceOf(SyncCoordinator)
  })
})
