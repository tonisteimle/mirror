/**
 * Race Condition Tests
 *
 * Tests for edge cases and race conditions in the drag-drop system.
 * Verifies that the system handles rapid event sequences gracefully.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPorts, type MockPorts } from '../../../studio/drag-drop/system/adapters/mock-adapters'
import {
  DragDropController,
  createDragDropController,
} from '../../../studio/drag-drop/system/drag-drop-controller'
import type { DragSource, Point, DropTarget, DropResult } from '../../../studio/drag-drop/types'

// ============================================
// Test Data
// ============================================

const mockPaletteSource: DragSource = {
  type: 'palette',
  componentName: 'Frame',
}

const mockCanvasSource: DragSource = {
  type: 'canvas',
  nodeId: 'node-1',
}

const startPosition: Point = { x: 100, y: 100 }
const movePosition: Point = { x: 150, y: 150 }

// ============================================
// Tests
// ============================================

describe('Race Conditions', () => {
  let ports: MockPorts
  let controller: DragDropController
  let onDragStart: ReturnType<typeof vi.fn>
  let onDragEnd: ReturnType<typeof vi.fn>
  let onDrop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ports = createMockPorts()
    onDragStart = vi.fn()
    onDragEnd = vi.fn()
    onDrop = vi.fn()
    controller = createDragDropController(ports, {
      onDragStart,
      onDragEnd,
      onDrop,
    })
    controller.init()
  })

  // ============================================
  // Rapid Event Sequences
  // ============================================

  describe('rapid event sequences', () => {
    it('handles rapid start-cancel sequence', () => {
      // Start then immediately cancel
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragCancel()

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).toHaveBeenCalledTimes(1)
      expect(onDragEnd).toHaveBeenCalledWith(mockPaletteSource, false)
    })

    it('handles rapid start-end sequence', () => {
      // Start then immediately end
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragEnd()

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).toHaveBeenCalledTimes(1)
      // End without valid target = success false
      expect(onDragEnd).toHaveBeenCalledWith(mockPaletteSource, false)
    })

    it('handles multiple start attempts without end', () => {
      // First start
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')

      // Second start while already dragging - should be ignored
      ports.events.simulateDragStart(mockCanvasSource, movePosition)

      // Should still be in original drag
      expect(controller.getState().type).toBe('dragging')
      expect(onDragStart).toHaveBeenCalledTimes(1)

      // Clean up
      ports.events.simulateDragCancel()
    })

    it('handles cancel before start', () => {
      // Cancel without prior start
      ports.events.simulateDragCancel()

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).not.toHaveBeenCalled()
      expect(onDragEnd).not.toHaveBeenCalled()
    })

    it('handles end before start', () => {
      // End without prior start
      ports.events.simulateDragEnd()

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).not.toHaveBeenCalled()
      expect(onDragEnd).not.toHaveBeenCalled()
    })

    it('handles move before start', () => {
      // Move without prior start
      ports.events.simulateDragMove(movePosition)

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Events After End
  // ============================================

  describe('events after drag end', () => {
    it('ignores move after end', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragEnd()

      // Move after end
      ports.events.simulateDragMove(movePosition)

      expect(controller.getState().type).toBe('idle')
    })

    it('ignores cancel after end', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragEnd()

      // Cancel after end
      ports.events.simulateDragCancel()

      expect(controller.getState().type).toBe('idle')
      // onDragEnd should only be called once
      expect(onDragEnd).toHaveBeenCalledTimes(1)
    })

    it('ignores end after cancel', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragCancel()

      // End after cancel
      ports.events.simulateDragEnd()

      expect(controller.getState().type).toBe('idle')
      // onDragEnd should only be called once (from cancel)
      expect(onDragEnd).toHaveBeenCalledTimes(1)
    })

    it('allows new drag after end', () => {
      // First drag
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragEnd()
      expect(controller.getState().type).toBe('idle')

      // Second drag should work
      ports.events.simulateDragStart(mockCanvasSource, startPosition)
      expect(controller.getState().type).toBe('dragging')
      expect(onDragStart).toHaveBeenCalledTimes(2)

      ports.events.simulateDragCancel()
    })
  })

  // ============================================
  // Rapid Drag Cycles
  // ============================================

  describe('rapid drag cycles', () => {
    it('handles many rapid start-cancel cycles', () => {
      for (let i = 0; i < 10; i++) {
        ports.events.simulateDragStart(mockPaletteSource, startPosition)
        ports.events.simulateDragCancel()
      }

      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).toHaveBeenCalledTimes(10)
      expect(onDragEnd).toHaveBeenCalledTimes(10)
    })

    it('handles alternating palette and canvas drags', () => {
      // Palette drag
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragCancel()

      // Canvas drag
      ports.events.simulateDragStart(mockCanvasSource, startPosition)
      ports.events.simulateDragCancel()

      // Palette drag again
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragCancel()

      expect(onDragStart).toHaveBeenCalledTimes(3)
      expect(onDragEnd).toHaveBeenCalledTimes(3)
    })
  })

  // ============================================
  // Keyboard Events During Drag
  // ============================================

  describe('keyboard events during drag', () => {
    it('handles Alt key press/release during drag', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)

      // Alt down
      ports.events.simulateKeyDown('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(true)

      // Alt up
      ports.events.simulateKeyUp('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(false)

      ports.events.simulateDragCancel()
    })

    it('handles Alt key while not dragging', () => {
      // Alt press while idle should still update context
      ports.events.simulateKeyDown('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(true)

      ports.events.simulateKeyUp('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(false)
    })

    it('handles rapid Alt key toggling', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)

      for (let i = 0; i < 5; i++) {
        ports.events.simulateKeyDown('Alt')
        ports.events.simulateKeyUp('Alt')
      }

      expect(controller.getContext().isAltKeyPressed).toBe(false)
      expect(controller.getState().type).toBe('dragging')

      ports.events.simulateDragCancel()
    })

    it('Alt key state resets on drag end', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateKeyDown('Alt')
      expect(controller.getContext().isAltKeyPressed).toBe(true)

      ports.events.simulateDragEnd()

      // Context preserves Alt state (it's global, not drag-specific)
      // This is intentional - Alt key state is about physical key state
      expect(controller.getContext().isAltKeyPressed).toBe(true)

      // Clean up
      ports.events.simulateKeyUp('Alt')
    })
  })

  // ============================================
  // Disable/Enable During Drag
  // ============================================

  describe('disable/enable during drag', () => {
    it('handles disable during active drag', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')

      controller.disable()

      expect(controller.isDisabled()).toBe(true)
      // Drag state should be reset
      expect(controller.getState().type).toBe('idle')
    })

    it('handles enable after disable during drag', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      controller.disable()
      controller.enable()

      expect(controller.isDisabled()).toBe(false)
      expect(controller.getState().type).toBe('idle')

      // New drag should work
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')

      ports.events.simulateDragCancel()
    })

    it('ignores drag events while disabled', () => {
      controller.disable()

      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('idle')
      expect(onDragStart).not.toHaveBeenCalled()

      controller.enable()
    })

    it('handles rapid disable/enable cycles', () => {
      for (let i = 0; i < 5; i++) {
        controller.disable()
        controller.enable()
      }

      expect(controller.isDisabled()).toBe(false)

      // Should still work
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')

      ports.events.simulateDragCancel()
    })
  })

  // ============================================
  // Dispose Race Conditions
  // ============================================

  describe('dispose race conditions', () => {
    it('handles events after dispose', () => {
      controller.dispose()

      // Events after dispose should not throw
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      ports.events.simulateDragMove(movePosition)
      ports.events.simulateDragEnd()
      ports.events.simulateDragCancel()
      ports.events.simulateKeyDown('Alt')
      ports.events.simulateKeyUp('Alt')

      // No callbacks should have been called (handlers removed)
      expect(onDragStart).not.toHaveBeenCalled()
    })

    it('handles dispose during active drag', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')

      controller.dispose()

      expect(controller.getState().type).toBe('idle')
      expect(onDragEnd).toHaveBeenCalledWith(mockPaletteSource, false)
    })

    it('handles multiple dispose calls', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)

      // Multiple dispose should not throw
      controller.dispose()
      controller.dispose()
      controller.dispose()

      // onDragEnd should only be called once
      expect(onDragEnd).toHaveBeenCalledTimes(1)
    })

    it('handles dispose-init-dispose cycle', () => {
      controller.dispose()

      // Re-init
      controller.init()

      // Should work again
      ports.events.simulateDragStart(mockPaletteSource, startPosition)
      expect(controller.getState().type).toBe('dragging')
      expect(onDragStart).toHaveBeenCalledTimes(1)

      controller.dispose()
      expect(onDragEnd).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Move During Various States
  // ============================================

  describe('move during various states', () => {
    it('handles move while idle', () => {
      ports.events.simulateDragMove(movePosition)

      expect(controller.getState().type).toBe('idle')
    })

    it('handles move while disabled', () => {
      controller.disable()
      ports.events.simulateDragMove(movePosition)

      expect(controller.getState().type).toBe('idle')
      controller.enable()
    })

    it('handles rapid move events during drag', () => {
      ports.events.simulateDragStart(mockPaletteSource, startPosition)

      // Simulate rapid mouse movement
      for (let i = 0; i < 20; i++) {
        ports.events.simulateDragMove({ x: 100 + i * 5, y: 100 + i * 5 })
      }

      expect(controller.getState().type).toBe('dragging')

      ports.events.simulateDragCancel()
    })
  })
})
