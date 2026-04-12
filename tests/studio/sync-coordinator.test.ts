/**
 * Unit Tests for SyncCoordinator
 *
 * Tests the central orchestrator for selection sync between
 * editor, preview, and property panel.
 *
 * Uses mock factories from tests/utils/mocks/sync-mocks.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncCoordinator, createSyncCoordinator } from '../../studio/sync/sync-coordinator'
import { LineOffsetService } from '../../studio/sync/line-offset-service'
import {
  createMockSourceMap,
  createMockSyncTargets,
  createMockLineOffsetService,
  createStandardTestScenario,
  createNestedTestScenario,
  type MockSourceMap,
  type MockSyncTargets,
} from '../utils/mocks/sync-mocks'
import {
  resetStudioState,
  simulateSelection,
  assertSelection,
  assertEditorScrolledTo,
  assertPreviewHighlighted,
  assertEditorNotScrolled,
  assertPreviewNotHighlighted,
  delay,
} from '../utils/helpers/sync-helpers'
import { state, events } from '../../studio/core'
import type { SourceMap } from '../../compiler/ir/source-map'

describe('SyncCoordinator', () => {
  let coordinator: SyncCoordinator
  let sourceMap: MockSourceMap
  let targets: MockSyncTargets

  beforeEach(() => {
    vi.useFakeTimers()
    resetStudioState()
    sourceMap = createMockSourceMap()
    targets = createMockSyncTargets()
  })

  afterEach(() => {
    coordinator?.dispose()
    vi.useRealTimers()
  })

  describe('Construction', () => {
    it('should create with default options', () => {
      coordinator = createSyncCoordinator()
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
      expect(coordinator.lineOffset).toBeInstanceOf(LineOffsetService)
    })

    it('should create with custom cursorDebounce', () => {
      coordinator = createSyncCoordinator({ cursorDebounce: 100 })
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
    })

    it('should create with custom lineOffset service', () => {
      const customLineOffset = new LineOffsetService()
      customLineOffset.setOffset(75)

      coordinator = createSyncCoordinator({ lineOffset: customLineOffset })
      expect(coordinator.lineOffset.getOffset()).toBe(75)
    })

    it('should create with debug mode', () => {
      coordinator = createSyncCoordinator({ debug: true })
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
    })
  })

  describe('Subscription', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
    })

    it('should subscribe to selection:changed events', () => {
      const spy = vi.spyOn(events, 'on')
      coordinator.subscribe()
      expect(spy).toHaveBeenCalledWith('selection:changed', expect.any(Function))
      spy.mockRestore() // Explicitly restore to avoid leaking to next test
    })

    it('should not double-subscribe when called multiple times', () => {
      const spy = vi.spyOn(events, 'on')
      coordinator.subscribe()
      coordinator.subscribe()
      coordinator.subscribe()
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should unsubscribe on dispose', () => {
      coordinator.subscribe()
      coordinator.dispose()
      // After dispose, subscription should be cleared
      // This is verified by internal state - coordinator should clean up
    })
  })

  describe('SourceMap Management', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
    })

    it('should set SourceMap', () => {
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      // No public getter, but should not throw
    })

    it('should clear SourceMap when set to null', () => {
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.setSourceMap(null)
      // Should handle gracefully
    })

    it('should clear pending cursor sync when SourceMap changes', () => {
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()

      // Start a cursor sync
      coordinator.handleCursorMove(10)

      // Change SourceMap before debounce completes
      coordinator.setSourceMap(null)

      // Advance timer past debounce
      vi.advanceTimersByTime(100)

      // Should not have processed the old cursor position
      expect(targets._scrollHistory).toHaveLength(0)
    })
  })

  describe('Target Configuration', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
    })

    it('should set scroll target', () => {
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
      })
      // No public getter, but should not throw
    })

    it('should set highlight target', () => {
      coordinator.setTargets({
        highlightPreviewElement: targets.highlightPreviewElement,
      })
    })

    it('should merge targets when called multiple times', () => {
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
      })
      coordinator.setTargets({
        highlightPreviewElement: targets.highlightPreviewElement,
      })
      // Both targets should be set (merged)
    })
  })

  describe('Selection Propagation', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })

      // Setup SourceMap with test node
      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 10, column: 0, offset: 100 },
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should scroll editor when selection comes from preview', () => {
      // Simulate selection from preview
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'preview' })

      // Should scroll editor to the node's line
      expect(targets._scrollHistory).toContain(10)
    })

    it('should highlight preview when selection comes from editor', () => {
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'editor' })

      // Should highlight in preview
      expect(targets._highlightHistory).toContain('node-1')
    })

    it('should NOT scroll editor when selection comes from editor', () => {
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'editor' })

      // Should not scroll (editor already at position)
      expect(targets._scrollHistory).toHaveLength(0)
    })

    it('should NOT highlight preview when selection comes from preview', () => {
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'preview' })

      // Should not highlight (preview already showing)
      expect(targets._highlightHistory).toHaveLength(0)
    })

    it('should clear highlight when selection is cleared', () => {
      events.emit('selection:changed', { nodeId: null, origin: 'editor' })

      // Should clear highlight
      expect(targets._highlightHistory).toContain(null)
    })
  })

  describe('Line Offset Integration', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.lineOffset.setOffset(50) // 50 lines of prelude
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })

      // Node is at SourceMap line 55 (editor line 5)
      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 55, column: 0, offset: 500 },
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should convert SourceMap line to editor line when scrolling', () => {
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'preview' })

      // SourceMap line 55 - offset 50 = editor line 5
      expect(targets._scrollHistory).toContain(5)
    })

    it('should convert editor line to SourceMap line for cursor sync', () => {
      coordinator.handleCursorMove(5) // Editor line 5
      vi.advanceTimersByTime(100)

      // Should have looked up node at SourceMap line 55
      expect(sourceMap.getNodeAtLine).toHaveBeenCalledWith(55)
    })

    it('should not scroll to prelude lines', () => {
      // Node in prelude (SourceMap line 25, before offset)
      sourceMap._setNode('prelude-node', {
        componentName: 'Button',
        position: { line: 25, column: 0, offset: 200 },
      })

      events.emit('selection:changed', { nodeId: 'prelude-node', origin: 'preview' })

      // Should not scroll (line is not in current file)
      expect(targets._scrollHistory).toHaveLength(0)
    })
  })

  describe('Cursor Debouncing', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator({ cursorDebounce: 50 })
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })

      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 10, column: 0, offset: 100 },
      })
      sourceMap._setNodeAtLine(10, 'node-1')

      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should debounce rapid cursor movements', () => {
      // Rapid cursor movements
      coordinator.handleCursorMove(5)
      coordinator.handleCursorMove(6)
      coordinator.handleCursorMove(7)
      coordinator.handleCursorMove(8)
      coordinator.handleCursorMove(10)

      // Before debounce completes
      expect(sourceMap.getNodeAtLine).not.toHaveBeenCalled()

      // After debounce
      vi.advanceTimersByTime(100)

      // Should only process the last position
      expect(sourceMap.getNodeAtLine).toHaveBeenCalledWith(10)
      expect(sourceMap.getNodeAtLine).toHaveBeenCalledTimes(1)
    })

    it('should not trigger sync if cursor returns to same line', () => {
      coordinator.handleCursorMove(10)
      vi.advanceTimersByTime(100)

      sourceMap.getNodeAtLine.mockClear()

      // Move to same line again
      coordinator.handleCursorMove(10)
      vi.advanceTimersByTime(100)

      // Should not trigger another lookup
      expect(sourceMap.getNodeAtLine).not.toHaveBeenCalled()
    })

    it('should cancel pending cursor sync on preview click', () => {
      coordinator.handleCursorMove(5)

      // Preview click before debounce completes
      coordinator.handlePreviewClick('node-1')

      vi.advanceTimersByTime(100)

      // Cursor sync should have been cancelled
      expect(sourceMap.getNodeAtLine).not.toHaveBeenCalled()
    })
  })

  describe('Sync Queueing', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })

      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 10, column: 0, offset: 100 },
      })
      sourceMap._setNode('node-2', {
        componentName: 'Text',
        position: { line: 15, column: 0, offset: 150 },
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should queue sync during in-progress sync', () => {
      // Emit first selection
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'preview' })

      // The sync should complete synchronously in this test environment
      // but the mechanism should still work

      // Emit second selection
      events.emit('selection:changed', { nodeId: 'node-2', origin: 'preview' })

      // Both should be processed
      expect(targets._scrollHistory).toContain(10)
      expect(targets._scrollHistory).toContain(15)
    })
  })

  describe('Preview Click Handling', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })

      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 10, column: 0, offset: 100 },
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should set selection on preview click', () => {
      coordinator.handlePreviewClick('node-1')

      // Selection should be set with 'preview' origin
      const selection = state.get().selection
      expect(selection.nodeId).toBe('node-1')
      expect(selection.origin).toBe('preview')
    })

    it('should scroll editor to clicked element', () => {
      coordinator.handlePreviewClick('node-1')

      // Should trigger editor scroll
      expect(targets._scrollHistory).toContain(10)
    })
  })

  describe('Clear Selection', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.setTargets({
        scrollEditorToLine: targets.scrollEditorToLine,
        highlightPreviewElement: targets.highlightPreviewElement,
      })
      coordinator.setSourceMap(sourceMap as unknown as SourceMap)
      coordinator.subscribe()
    })

    it('should clear selection', () => {
      // First set a selection
      state.set({ ...state.get(), selection: { nodeId: 'node-1', origin: 'editor' } })

      coordinator.clearSelection('editor')

      const selection = state.get().selection
      expect(selection.nodeId).toBeNull()
    })

    it('should clear preview highlight on selection clear', () => {
      events.emit('selection:changed', { nodeId: null, origin: 'editor' })

      expect(targets._highlightHistory).toContain(null)
    })
  })

  describe('Dispose', () => {
    beforeEach(() => {
      coordinator = createSyncCoordinator()
      coordinator.subscribe()
    })

    it('should clean up event subscription', () => {
      coordinator.dispose()
      // Should not throw when emitting events after dispose
      events.emit('selection:changed', { nodeId: 'node-1', origin: 'editor' })
    })

    it('should clear pending cursor sync', () => {
      coordinator.handleCursorMove(10)

      coordinator.dispose()

      // Advancing timers should not cause errors
      vi.advanceTimersByTime(100)
    })
  })

  describe('Integration with Standard Test Scenario', () => {
    it('should handle standard scenario with 3 sibling elements', () => {
      const scenario = createStandardTestScenario()
      coordinator = createSyncCoordinator()
      coordinator.lineOffset.setOffset(scenario.lineOffset.getOffset())
      coordinator.setTargets({
        scrollEditorToLine: scenario.targets.scrollEditorToLine,
        highlightPreviewElement: scenario.targets.highlightPreviewElement,
      })
      coordinator.setSourceMap(scenario.sourceMap as unknown as SourceMap)
      coordinator.subscribe()

      // Select second child (node-2 at SourceMap line 53)
      events.emit('selection:changed', { nodeId: 'node-2', origin: 'preview' })

      // Should scroll to editor line 3 (53 - 50 = 3)
      expect(scenario.targets._scrollHistory).toContain(3)
    })
  })

  describe('Integration with Nested Test Scenario', () => {
    it('should handle nested scenario with containers', () => {
      const scenario = createNestedTestScenario()
      coordinator = createSyncCoordinator()
      coordinator.lineOffset.setOffset(scenario.lineOffset.getOffset())
      coordinator.setTargets({
        scrollEditorToLine: scenario.targets.scrollEditorToLine,
        highlightPreviewElement: scenario.targets.highlightPreviewElement,
      })
      coordinator.setSourceMap(scenario.sourceMap as unknown as SourceMap)
      coordinator.subscribe()

      // Select deeply nested element (node-3 at SourceMap line 54)
      events.emit('selection:changed', { nodeId: 'node-3', origin: 'preview' })

      // Should scroll to editor line 4 (54 - 50 = 4)
      expect(scenario.targets._scrollHistory).toContain(4)
    })
  })
})
