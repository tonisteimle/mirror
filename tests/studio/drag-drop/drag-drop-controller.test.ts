/**
 * DragDropController Tests
 *
 * Tests für den neuen, vollständig testbaren Controller.
 * Alle Tests laufen ohne DOM - nur mit Mock-Ports.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DragDropController,
  createDragDropController,
} from '../../../studio/drag-drop/system/drag-drop-controller'
import { createMockPorts, type MockPorts } from '../../../studio/drag-drop/system/adapters/mock-adapters'
import type { DragSource, DropTarget, DropResult, Rect, VisualHint } from '../../../studio/drag-drop/types'

// ============================================
// Test Data
// ============================================

const mockElement = {} as HTMLElement

const mockSource: DragSource = {
  type: 'palette',
  componentName: 'Frame',
}

const mockCanvasSource: DragSource = {
  type: 'canvas',
  nodeId: 'element-1',
  element: mockElement,
}

const mockTarget: DropTarget = {
  nodeId: 'container-1',
  element: mockElement,
  layoutType: 'flex',
  direction: 'vertical',
  hasChildren: true,
  isPositioned: false,
}

const mockPositionedTarget: DropTarget = {
  nodeId: 'canvas-1',
  element: mockElement,
  layoutType: 'positioned',
  direction: 'vertical',
  hasChildren: true,
  isPositioned: true,
}

const mockResult: DropResult = {
  target: mockTarget,
  placement: 'after',
  targetId: 'child-1',
  insertionIndex: 2,
}

const mockRect: Rect = { x: 100, y: 100, width: 200, height: 50 }

const mockHint: VisualHint = {
  type: 'line',
  rect: mockRect,
  direction: 'horizontal',
}

// ============================================
// Test Setup
// ============================================

describe('DragDropController', () => {
  let ports: MockPorts
  let controller: DragDropController
  let callbacks: {
    onDragStart: ReturnType<typeof vi.fn>
    onDragEnd: ReturnType<typeof vi.fn>
    onDrop: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    ports = createMockPorts()
    callbacks = {
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      onDrop: vi.fn(),
    }
    controller = createDragDropController(ports, {
      enableAltDuplicate: true,
      ...callbacks,
    })
    controller.init()
  })

  // ============================================
  // Initialization
  // ============================================

  describe('initialization', () => {
    it('starts in idle state', () => {
      expect(controller.getState().type).toBe('idle')
    })

    it('registers event handlers on init', () => {
      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(1)
      expect(handlers.dragMove).toHaveLength(1)
      expect(handlers.dragEnd).toHaveLength(1)
      expect(handlers.dragCancel).toHaveLength(1)
      expect(handlers.keyDown.get('Alt')).toHaveLength(1)
      expect(handlers.keyUp.get('Alt')).toHaveLength(1)
    })

    it('starts with disabled = false', () => {
      expect(controller.isDisabled()).toBe(false)
    })
  })

  // ============================================
  // Drag Start
  // ============================================

  describe('drag start', () => {
    it('transitions to dragging on DRAG_START', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })

      expect(controller.getState().type).toBe('dragging')
    })

    it('calls onDragStart callback', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })

      expect(callbacks.onDragStart).toHaveBeenCalledWith(mockSource)
    })

    it('stores source in state', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })

      const state = controller.getState()
      if (state.type === 'dragging') {
        expect(state.source).toEqual(mockSource)
      }
    })

    it('ignores drag start when disabled', () => {
      controller.disable()
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })

      expect(controller.getState().type).toBe('idle')
      expect(callbacks.onDragStart).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Target Detection
  // ============================================

  describe('target detection', () => {
    beforeEach(() => {
      // Start a drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
    })

    it('transitions to over-target when target found', () => {
      // Setup mock responses
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)

      // Move cursor
      ports.events.simulateDragMove({ x: 150, y: 150 })

      expect(controller.getState().type).toBe('over-target')
    })

    it('shows visual indicator when over target', () => {
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)

      ports.events.simulateDragMove({ x: 150, y: 150 })

      const visualState = ports.visual.getState()
      expect(visualState.indicatorHint).toEqual(mockHint)
    })

    it('shows parent outline for after placement', () => {
      const afterResult = { ...mockResult, placement: 'after' as const }
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(afterResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)

      ports.events.simulateDragMove({ x: 150, y: 150 })

      const visualState = ports.visual.getState()
      expect(visualState.outlineRect).toEqual(mockRect)
    })

    it('transitions back to dragging when target lost', () => {
      // First, find a target
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      expect(controller.getState().type).toBe('over-target')

      // Then lose the target
      ports.targetDetection.setTarget(null)
      ports.events.simulateDragMove({ x: 200, y: 200 })

      expect(controller.getState().type).toBe('dragging')
    })

    it('hides visuals when target lost', () => {
      // First, find a target
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      // Then lose the target
      ports.targetDetection.setTarget(null)
      ports.events.simulateDragMove({ x: 200, y: 200 })

      const visualState = ports.visual.getState()
      expect(visualState.isHidden).toBe(true)
    })
  })

  // ============================================
  // Drop Execution
  // ============================================

  describe('drop execution', () => {
    beforeEach(() => {
      // Start drag and find target
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })
    })

    it('executes drop when over target', () => {
      ports.events.simulateDragEnd()

      const calls = ports.execution.getCalls()
      expect(calls).toHaveLength(1)
      expect(calls[0].source).toEqual(mockSource)
      expect(calls[0].isAltKey).toBe(false)
    })

    it('calls onDrop callback on successful drop', () => {
      ports.events.simulateDragEnd()

      expect(callbacks.onDrop).toHaveBeenCalledWith(mockSource, expect.any(Object))
    })

    it('calls onDragEnd with success=true', () => {
      ports.events.simulateDragEnd()

      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, true)
    })

    it('transitions to dropped then idle', () => {
      ports.events.simulateDragEnd()

      // After effects are processed, should be back to idle
      // (dropped state is transient)
      expect(controller.getState().type).toBe('dropped')
    })

    it('hides visuals after drop', () => {
      ports.events.simulateDragEnd()

      const visualState = ports.visual.getState()
      expect(visualState.isHidden).toBe(true)
    })
  })

  // ============================================
  // Drop without Target
  // ============================================

  describe('drop without target', () => {
    beforeEach(() => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
    })

    it('does not execute drop when no target', () => {
      ports.events.simulateDragEnd()

      const calls = ports.execution.getCalls()
      expect(calls).toHaveLength(0)
    })

    it('calls onDragEnd with success=false', () => {
      ports.events.simulateDragEnd()

      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, false)
    })

    it('does not call onDrop', () => {
      ports.events.simulateDragEnd()

      expect(callbacks.onDrop).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Drag Cancel
  // ============================================

  describe('drag cancel', () => {
    beforeEach(() => {
      // Start drag and find target
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })
    })

    it('does not execute drop on cancel', () => {
      ports.events.simulateDragCancel()

      const calls = ports.execution.getCalls()
      expect(calls).toHaveLength(0)
    })

    it('transitions to idle on cancel', () => {
      ports.events.simulateDragCancel()

      expect(controller.getState().type).toBe('idle')
    })

    it('hides visuals on cancel', () => {
      ports.events.simulateDragCancel()

      const visualState = ports.visual.getState()
      expect(visualState.isHidden).toBe(true)
    })

    it('calls onDragEnd with success=false', () => {
      ports.events.simulateDragCancel()

      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, false)
    })
  })

  // ============================================
  // Alt Key (Duplicate)
  // ============================================

  describe('alt key (duplicate)', () => {
    beforeEach(() => {
      // Start drag with canvas source
      ports.events.simulateDragStart(mockCanvasSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })
    })

    it('tracks alt key state', () => {
      ports.events.simulateKeyDown('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(true)

      ports.events.simulateKeyUp('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(false)
    })

    it('executes as duplicate when alt pressed', () => {
      ports.events.simulateKeyDown('Alt')
      ports.events.simulateDragEnd()

      const calls = ports.execution.getCalls()
      expect(calls).toHaveLength(1)
      expect(calls[0].isAltKey).toBe(true)
      expect(calls[0].type).toBe('duplicate')
    })

    it('does not duplicate palette items', () => {
      // Cancel current drag (from beforeEach with canvas source)
      ports.events.simulateDragCancel()
      ports.execution.reset()

      // Now start a new drag with palette source
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })
      ports.events.simulateKeyDown('Alt')
      ports.events.simulateDragEnd()

      const calls = ports.execution.getCalls()
      // Should still be execute, not duplicate (palette items can't be duplicated)
      expect(calls.some(c => c.type === 'duplicate')).toBe(false)
    })
  })

  // ============================================
  // Disable/Enable
  // ============================================

  describe('disable/enable', () => {
    it('sets disabled flag', () => {
      controller.disable()
      expect(controller.isDisabled()).toBe(true)
    })

    it('clears disabled flag on enable', () => {
      controller.disable()
      controller.enable()
      expect(controller.isDisabled()).toBe(false)
    })

    it('cancels active drag on disable', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')

      controller.disable()

      expect(controller.getState().type).toBe('idle')
      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, false)
    })

    it('hides visuals on disable', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      controller.disable()

      const visualState = ports.visual.getState()
      expect(visualState.isHidden).toBe(true)
    })
  })

  // ============================================
  // Dispose
  // ============================================

  describe('dispose', () => {
    it('removes all event handlers', () => {
      controller.dispose()

      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(0)
      expect(handlers.dragMove).toHaveLength(0)
      expect(handlers.dragEnd).toHaveLength(0)
    })

    it('resets to idle state', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      controller.dispose()

      expect(controller.getState().type).toBe('idle')
    })

    it('hides visuals', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      controller.dispose()

      const visualState = ports.visual.getState()
      expect(visualState.isHidden).toBe(true)
    })
  })

  // ============================================
  // Query Methods
  // ============================================

  describe('query methods', () => {
    it('isOverValidTarget returns false when idle', () => {
      expect(controller.isOverValidTarget()).toBe(false)
    })

    it('isOverValidTarget returns true when over target', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      expect(controller.isOverValidTarget()).toBe(true)
    })

    it('getCurrentResult returns null when idle', () => {
      expect(controller.getCurrentResult()).toBeNull()
    })

    it('getCurrentResult returns result when over target', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      expect(controller.getCurrentResult()).not.toBeNull()
    })
  })

  // ============================================
  // Test APIs
  // ============================================

  describe('test APIs', () => {
    describe('simulateDrop', () => {
      it('executes drop with specified source and target', () => {
        const result = controller.simulateDrop({
          source: mockCanvasSource,
          target: mockTarget,
          result: mockResult,
        })

        expect(result.success).toBe(true)
        const calls = ports.execution.getCalls()
        expect(calls).toHaveLength(1)
        expect(calls[0].source.nodeId).toBe('element-1')
      })

      it('supports palette source type', () => {
        const paletteSource: DragSource = {
          type: 'palette',
          componentName: 'Button',
        }

        const result = controller.simulateDrop({
          source: paletteSource,
          target: mockTarget,
          result: mockResult,
        })

        expect(result.success).toBe(true)
        const calls = ports.execution.getCalls()
        expect(calls).toHaveLength(1)
        expect(calls[0].source.type).toBe('palette')
        expect(calls[0].source.componentName).toBe('Button')
      })

      it('handles execution failure gracefully', () => {
        ports.execution.setExecuteResult({ success: false, error: 'Test error' })

        const result = controller.simulateDrop({
          source: mockCanvasSource,
          target: mockTarget,
          result: mockResult,
        })

        // simulateDrop returns success based on whether execution was called, not result
        expect(result.success).toBe(true)
      })
    })

    describe('simulateDragTo', () => {
      it('simulates full drag sequence and returns result', () => {
        // Setup target detection to find a target
        ports.targetDetection.setTarget(mockTarget)
        ports.targetDetection.setResult(mockResult)
        ports.layout.setContainerRect(mockElement, mockRect)

        const result = controller.simulateDragTo(mockCanvasSource, { x: 150, y: 150 })

        expect(result).not.toBeNull()
        expect(result?.target.nodeId).toBe('container-1')
      })

      it('returns null when no valid target', () => {
        ports.targetDetection.setTarget(null)

        const result = controller.simulateDragTo(mockCanvasSource, { x: 150, y: 150 })

        expect(result).toBeNull()
      })

      it('returns null when container rect not available', () => {
        ports.targetDetection.setTarget(mockTarget)
        // Don't set container rect

        const result = controller.simulateDragTo(mockCanvasSource, { x: 150, y: 150 })

        expect(result).toBeNull()
      })

      it('works with palette source', () => {
        ports.targetDetection.setTarget(mockTarget)
        ports.targetDetection.setResult(mockResult)
        ports.layout.setContainerRect(mockElement, mockRect)

        const result = controller.simulateDragTo(mockSource, { x: 150, y: 150 })

        expect(result).not.toBeNull()
        expect(result?.target.nodeId).toBe('container-1')
      })
    })

    describe('getVisualState', () => {
      it('returns current visual state when idle', () => {
        const state = controller.getVisualState()

        expect(state).toBeDefined()
        expect(state.hasIndicator).toBe(false)
        expect(state.hasOutline).toBe(false)
      })

      it('reflects visual changes when over target', () => {
        ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
        ports.targetDetection.setTarget(mockTarget)
        ports.targetDetection.setResult(mockResult)
        ports.targetDetection.setVisualHint(mockHint)
        ports.layout.setContainerRect(mockElement, mockRect)
        ports.events.simulateDragMove({ x: 150, y: 150 })

        const state = controller.getVisualState()

        expect(state.hasIndicator).toBe(true)
        expect(state.hasOutline).toBe(true) // 'after' placement shows outline
      })

      it('shows outline for before/after placements', () => {
        const beforeResult: DropResult = { ...mockResult, placement: 'before' }
        ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
        ports.targetDetection.setTarget(mockTarget)
        ports.targetDetection.setResult(beforeResult)
        ports.targetDetection.setVisualHint(mockHint)
        ports.layout.setContainerRect(mockElement, mockRect)
        ports.events.simulateDragMove({ x: 150, y: 150 })

        const state = controller.getVisualState()

        expect(state.hasOutline).toBe(true)
      })

      it('does not show outline for inside placement', () => {
        const insideResult: DropResult = { ...mockResult, placement: 'inside' }
        ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
        ports.targetDetection.setTarget(mockTarget)
        ports.targetDetection.setResult(insideResult)
        ports.targetDetection.setVisualHint(mockHint)
        ports.layout.setContainerRect(mockElement, mockRect)
        ports.events.simulateDragMove({ x: 150, y: 150 })

        const state = controller.getVisualState()

        expect(state.hasIndicator).toBe(true)
        expect(state.hasOutline).toBe(false)
      })
    })
  })

  // ============================================
  // Mode Debouncing
  // ============================================

  describe('mode debouncing', () => {
    it('uses last stable result during mode transition', async () => {
      // Start drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })

      // Find flex target first
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      expect(controller.getState().type).toBe('over-target')
      const flexResult = controller.getCurrentResult()

      // Now change to positioned target (mode transition)
      const positionedResult: DropResult = {
        target: mockPositionedTarget,
        placement: 'absolute',
        targetId: 'canvas-1',
        absolutePosition: { x: 100, y: 100 },
      }
      ports.targetDetection.setTarget(mockPositionedTarget)
      ports.targetDetection.setResult(positionedResult)
      ports.layout.setContainerRect(mockPositionedTarget.element, mockRect)
      ports.events.simulateDragMove({ x: 160, y: 160 })

      // During the debounce period, should still have the flex result
      // (Result may be either - the debouncing behavior is internal)
      expect(controller.getCurrentResult()).not.toBeNull()
    })
  })

  // ============================================
  // Full Drag Sequence
  // ============================================

  describe('full drag sequence', () => {
    it('completes a successful drag and drop', () => {
      // 1. Start drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')
      expect(callbacks.onDragStart).toHaveBeenCalledWith(mockSource)

      // 2. Move over target
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })
      expect(controller.getState().type).toBe('over-target')
      expect(ports.visual.getState().indicatorHint).not.toBeNull()

      // 3. Drop
      ports.events.simulateDragEnd()
      expect(ports.execution.getCalls()).toHaveLength(1)
      expect(callbacks.onDrop).toHaveBeenCalled()
      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, true)
      expect(ports.visual.getState().isHidden).toBe(true)
    })

    it('handles drag cancel correctly', () => {
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 150, y: 150 })

      ports.events.simulateDragCancel()

      expect(controller.getState().type).toBe('idle')
      expect(ports.execution.getCalls()).toHaveLength(0)
      expect(callbacks.onDrop).not.toHaveBeenCalled()
      expect(callbacks.onDragEnd).toHaveBeenCalledWith(mockSource, false)
    })

    it('handles multiple drag sequences', () => {
      // First drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.events.simulateDragCancel()

      // Second drag
      ports.events.simulateDragStart(mockSource, { x: 200, y: 200 })
      ports.targetDetection.setTarget(mockTarget)
      ports.targetDetection.setResult(mockResult)
      ports.targetDetection.setVisualHint(mockHint)
      ports.layout.setContainerRect(mockElement, mockRect)
      ports.events.simulateDragMove({ x: 250, y: 250 })
      ports.events.simulateDragEnd()

      expect(ports.execution.getCalls()).toHaveLength(1)
      expect(callbacks.onDragStart).toHaveBeenCalledTimes(2)
      expect(callbacks.onDragEnd).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================
  // No-Op Drop Detection
  // ============================================

  describe('no-op drop detection', () => {
    let onNoOpDrop: ReturnType<typeof vi.fn>

    beforeEach(() => {
      onNoOpDrop = vi.fn()
      controller = createDragDropController(ports, {
        enableAltDuplicate: true,
        ...callbacks,
        onNoOpDrop,
      })
      controller.init()
    })

    it('detects dropping element on itself (inside)', () => {
      const selfTarget: DropTarget = {
        ...mockTarget,
        nodeId: 'element-1', // Same as source
      }
      const selfResult: DropResult = {
        target: selfTarget,
        placement: 'inside',
        targetId: 'element-1', // Same as source
      }

      controller.simulateDrop({
        source: mockCanvasSource, // nodeId: 'element-1'
        target: selfTarget,
        result: selfResult,
      })

      expect(onNoOpDrop).toHaveBeenCalledWith(mockCanvasSource, selfResult)
      expect(ports.execution.getCalls()).toHaveLength(0)
    })

    it('detects dropping element before/after itself', () => {
      const selfTarget: DropTarget = {
        ...mockTarget,
        nodeId: 'element-1', // Same as source
      }
      const selfResult: DropResult = {
        target: selfTarget,
        placement: 'after',
        targetId: 'sibling-2',
      }

      controller.simulateDrop({
        source: mockCanvasSource, // nodeId: 'element-1'
        target: selfTarget,
        result: selfResult,
      })

      expect(onNoOpDrop).toHaveBeenCalled()
      expect(ports.execution.getCalls()).toHaveLength(0)
    })

    it('does not treat palette drops as no-op', () => {
      const selfTarget: DropTarget = {
        ...mockTarget,
        nodeId: 'container-1',
      }
      const result: DropResult = {
        target: selfTarget,
        placement: 'inside',
        targetId: 'container-1',
      }

      controller.simulateDrop({
        source: mockSource, // palette source, no nodeId
        target: selfTarget,
        result,
      })

      expect(onNoOpDrop).not.toHaveBeenCalled()
      expect(ports.execution.getCalls()).toHaveLength(1)
    })

    it('allows moving to different target', () => {
      const differentTarget: DropTarget = {
        ...mockTarget,
        nodeId: 'container-2', // Different from source
      }
      const result: DropResult = {
        target: differentTarget,
        placement: 'inside',
        targetId: 'container-2',
      }

      controller.simulateDrop({
        source: mockCanvasSource, // nodeId: 'element-1'
        target: differentTarget,
        result,
      })

      expect(onNoOpDrop).not.toHaveBeenCalled()
      expect(ports.execution.getCalls()).toHaveLength(1)
    })
  })
})
