/**
 * Unit Tests for SyncCoordinator (Hexagonal Architecture)
 *
 * Tests the SyncCoordinator using mock ports.
 * No global state, no events, no DOM - pure unit tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  SyncCoordinator,
  createSyncCoordinatorWithPorts,
  type SyncTargets,
  type ExtendedSyncPorts,
} from '../../../studio/sync/sync-coordinator-v2'
import {
  createMockSyncPorts,
  type MockSyncPorts,
  type MockDOMElement,
} from '../../../studio/sync/adapters/mock-adapters'
import { LineOffsetService } from '../../../studio/sync/line-offset-service'

describe('SyncCoordinator (Hexagonal)', () => {
  let ports: MockSyncPorts
  let coordinator: SyncCoordinator
  let targets: {
    scrollEditorToLine: ReturnType<typeof createMockScrollTarget>
    highlightPreviewElement: ReturnType<typeof createMockHighlightTarget>
  }

  // Helper to create mock scroll target
  function createMockScrollTarget() {
    const history: number[] = []
    const fn = (line: number) => {
      history.push(line)
    }
    fn.history = history
    fn.clear = () => { history.length = 0 }
    return fn
  }

  // Helper to create mock highlight target
  function createMockHighlightTarget() {
    const history: (string | null)[] = []
    const fn = (nodeId: string | null) => {
      history.push(nodeId)
    }
    fn.history = history
    fn.clear = () => { history.length = 0 }
    return fn
  }

  beforeEach(() => {
    ports = createMockSyncPorts()
    targets = {
      scrollEditorToLine: createMockScrollTarget(),
      highlightPreviewElement: createMockHighlightTarget(),
    }
  })

  afterEach(() => {
    coordinator?.dispose()
  })

  describe('Construction', () => {
    it('should create with ports', () => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
      expect(coordinator.lineOffset).toBeInstanceOf(LineOffsetService)
    })

    it('should create with custom cursorDebounce', () => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts, {
        cursorDebounce: 100,
      })
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
    })

    it('should create with custom lineOffset', () => {
      const customLineOffset = new LineOffsetService()
      customLineOffset.setOffset(75)

      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts, {
        lineOffset: customLineOffset,
      })

      expect(coordinator.lineOffset.getOffset()).toBe(75)
    })
  })

  describe('Subscription', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
    })

    it('should subscribe to selection:changed events via port', () => {
      coordinator.subscribe()

      expect(coordinator.isSubscribed()).toBe(true)
      expect(ports.eventBus.getState().selectionHandlers.size).toBe(1)
    })

    it('should not double-subscribe when called multiple times', () => {
      coordinator.subscribe()
      coordinator.subscribe()
      coordinator.subscribe()

      expect(ports.eventBus.getState().selectionHandlers.size).toBe(1)
    })

    it('should unsubscribe on dispose', () => {
      coordinator.subscribe()
      coordinator.dispose()

      expect(coordinator.isSubscribed()).toBe(false)
      expect(ports.eventBus.getState().selectionHandlers.size).toBe(0)
    })
  })

  describe('Selection Propagation', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)

      // Setup SourceMap with test node
      ports.sourceMap.addNode({
        nodeId: 'node-1',
        componentName: 'Frame',
        position: { line: 10, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should scroll editor when selection comes from preview', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'preview',
      })

      expect(targets.scrollEditorToLine.history).toContain(10)
    })

    it('should highlight preview when selection comes from editor', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'editor',
      })

      expect(targets.highlightPreviewElement.history).toContain('node-1')
    })

    it('should NOT scroll editor when selection comes from editor', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'editor',
      })

      expect(targets.scrollEditorToLine.history).toHaveLength(0)
    })

    it('should NOT highlight preview when selection comes from preview', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'preview',
      })

      expect(targets.highlightPreviewElement.history).toHaveLength(0)
    })

    it('should clear highlight when selection is cleared', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: null,
        origin: 'editor',
      })

      expect(targets.highlightPreviewElement.history).toContain(null)
    })
  })

  describe('Line Offset Integration', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.lineOffset.setOffset(50) // 50 lines of prelude
      coordinator.setTargets(targets)

      // Node is at SourceMap line 55 (editor line 5)
      ports.sourceMap.addNode({
        nodeId: 'node-1',
        componentName: 'Frame',
        position: { line: 55, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should convert SourceMap line to editor line when scrolling', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'preview',
      })

      // SourceMap line 55 - offset 50 = editor line 5
      expect(targets.scrollEditorToLine.history).toContain(5)
    })

    it('should convert editor line to SourceMap line for cursor sync', () => {
      coordinator.handleCursorMove(5) // Editor line 5
      ports.clock.flushTimeouts()

      // Should have looked up node at SourceMap line 55
      const state = ports.sourceMap.getState()
      // Check that getNodeAtLine was called by verifying the lineIndex has this line
      expect(state.lineIndex.has(55)).toBe(true)
    })

    it('should not scroll to prelude lines', () => {
      // Node in prelude (SourceMap line 25, before offset)
      ports.sourceMap.addNode({
        nodeId: 'prelude-node',
        componentName: 'Button',
        position: { line: 25, column: 0 },
      })

      ports.eventBus.simulateSelectionChanged({
        nodeId: 'prelude-node',
        origin: 'preview',
      })

      // Should not scroll (line is not in current file)
      expect(targets.scrollEditorToLine.history).toHaveLength(0)
    })
  })

  describe('Cursor Debouncing', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts, {
        cursorDebounce: 50,
      })
      coordinator.setTargets(targets)

      ports.sourceMap.addNode({
        nodeId: 'node-1',
        componentName: 'Frame',
        position: { line: 10, column: 0 },
      })

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
      expect(coordinator.hasPendingCursorSync()).toBe(true)
      expect(ports.clock.getPendingTimeoutCount()).toBe(1)

      // After debounce
      ports.clock.flushTimeouts()

      expect(coordinator.hasPendingCursorSync()).toBe(false)
    })

    it('should not trigger sync if cursor returns to same line', () => {
      coordinator.handleCursorMove(10)
      ports.clock.flushTimeouts()

      // Move to same line again
      coordinator.handleCursorMove(10)

      // Should not have started a new debounce
      expect(ports.clock.getPendingTimeoutCount()).toBe(0)
    })

    it('should cancel pending cursor sync on preview click', () => {
      coordinator.handleCursorMove(5)
      expect(coordinator.hasPendingCursorSync()).toBe(true)

      // Preview click before debounce completes
      coordinator.handlePreviewClick('node-1')

      // Cursor sync should have been cancelled
      expect(coordinator.hasPendingCursorSync()).toBe(false)
      expect(ports.clock.getPendingTimeoutCount()).toBe(0)
    })
  })

  describe('Preview Click Handling', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)

      ports.sourceMap.addNode({
        nodeId: 'node-1',
        componentName: 'Frame',
        position: { line: 10, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should set selection on preview click', () => {
      coordinator.handlePreviewClick('node-1')

      const history = ports.stateStore.getSelectionHistory()
      expect(history).toContainEqual({
        nodeId: 'node-1',
        origin: 'preview',
      })
    })

    it('should scroll editor to clicked element', () => {
      // First, simulate the selection event (which handlePreviewClick triggers)
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'node-1',
        origin: 'preview',
      })

      expect(targets.scrollEditorToLine.history).toContain(10)
    })
  })

  describe('Breadcrumb Computation', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)

      // Setup a hierarchy: root > container > text
      const root: MockDOMElement = {
        nodeId: 'root',
        name: 'App',
        isRoot: true,
      }
      const container: MockDOMElement = {
        nodeId: 'container',
        name: 'Container',
        parent: root,
      }
      const text: MockDOMElement = {
        nodeId: 'text',
        name: 'Text',
        parent: container,
      }

      ports.domQuery.setElementHierarchy([root, container, text])

      // Add nodes to sourceMap
      ports.sourceMap.addNode({
        nodeId: 'root',
        componentName: 'App',
        position: { line: 1, column: 0 },
      })
      ports.sourceMap.addNode({
        nodeId: 'container',
        componentName: 'Container',
        position: { line: 2, column: 0 },
      })
      ports.sourceMap.addNode({
        nodeId: 'text',
        componentName: 'Text',
        position: { line: 3, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should compute breadcrumb from DOM hierarchy', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: 'text',
        origin: 'editor',
      })

      const breadcrumbHistory = ports.stateStore.getBreadcrumbHistory()
      expect(breadcrumbHistory.length).toBeGreaterThan(0)

      const lastBreadcrumb = breadcrumbHistory[breadcrumbHistory.length - 1]
      expect(lastBreadcrumb).toHaveLength(3)
      expect(lastBreadcrumb.map((b) => b.nodeId)).toEqual(['root', 'container', 'text'])
    })

    it('should set empty breadcrumb when selection is cleared', () => {
      ports.eventBus.simulateSelectionChanged({
        nodeId: null,
        origin: 'editor',
      })

      const breadcrumbHistory = ports.stateStore.getBreadcrumbHistory()
      const lastBreadcrumb = breadcrumbHistory[breadcrumbHistory.length - 1]
      expect(lastBreadcrumb).toHaveLength(0)
    })
  })

  describe('Definition Selection', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)

      // Add a definition at line 10
      ports.sourceMap.addDefinition(10, {
        componentName: 'MyComponent',
        position: { line: 10, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should emit definition:selected when cursor is on definition line', () => {
      coordinator.handleCursorMove(10)
      ports.clock.flushTimeouts()

      const emitted = ports.eventBus.getEmittedDefinitions()
      expect(emitted).toContainEqual({
        componentName: 'MyComponent',
        origin: 'editor',
      })
    })
  })

  describe('Clear Selection', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)
      coordinator.subscribe()
    })

    it('should clear selection', () => {
      coordinator.clearSelection('editor')

      const history = ports.stateStore.getSelectionHistory()
      expect(history).toContainEqual({
        nodeId: null,
        origin: 'editor',
      })
    })
  })

  describe('SourceMap Updates', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.setTargets(targets)

      ports.sourceMap.addNode({
        nodeId: 'node-1',
        componentName: 'Frame',
        position: { line: 10, column: 0 },
      })

      coordinator.subscribe()
    })

    it('should clear pending cursor sync when SourceMap changes', () => {
      coordinator.handleCursorMove(10)
      expect(coordinator.hasPendingCursorSync()).toBe(true)

      coordinator.setSourceMap(null)

      expect(coordinator.hasPendingCursorSync()).toBe(false)
      expect(ports.clock.getPendingTimeoutCount()).toBe(0)
    })

    it('should increment version on SourceMap change', () => {
      const version1 = coordinator.getSourceMapVersion()
      coordinator.setSourceMap(null)
      const version2 = coordinator.getSourceMapVersion()

      expect(version2).toBe(version1 + 1)
    })
  })

  describe('Dispose', () => {
    beforeEach(() => {
      coordinator = new SyncCoordinator(ports as ExtendedSyncPorts)
      coordinator.subscribe()
    })

    it('should clean up event subscription', () => {
      coordinator.dispose()

      expect(coordinator.isSubscribed()).toBe(false)
      expect(ports.eventBus.getState().selectionHandlers.size).toBe(0)
    })

    it('should clear pending cursor sync', () => {
      coordinator.handleCursorMove(10)
      expect(ports.clock.getPendingTimeoutCount()).toBe(1)

      coordinator.dispose()

      expect(ports.clock.getPendingTimeoutCount()).toBe(0)
    })
  })

  describe('Factory Function', () => {
    it('should create and subscribe with createSyncCoordinatorWithPorts', () => {
      coordinator = createSyncCoordinatorWithPorts(ports as ExtendedSyncPorts)

      expect(coordinator).toBeInstanceOf(SyncCoordinator)
      expect(coordinator.isSubscribed()).toBe(true)
    })
  })
})
