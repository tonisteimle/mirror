/**
 * EventPort Cleanup Tests
 *
 * Tests for memory leak prevention in the EventPort implementation.
 * Verifies that all event handlers are properly cleaned up when:
 * - Individual cleanup functions are called
 * - Controller is disposed
 * - Multiple handlers are registered and unregistered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPorts, type MockPorts } from '../../../studio/drag-drop/system/adapters/mock-adapters'
import {
  DragDropController,
  createDragDropController,
} from '../../../studio/drag-drop/system/drag-drop-controller'
import type { DragSource, Point } from '../../../studio/drag-drop/types'

// ============================================
// Test Data
// ============================================

const mockSource: DragSource = {
  type: 'palette',
  componentName: 'Frame',
}

// ============================================
// Tests
// ============================================

describe('EventPort Cleanup', () => {
  let ports: MockPorts
  let controller: DragDropController

  beforeEach(() => {
    ports = createMockPorts()
    controller = createDragDropController(ports, {})
    controller.init()
  })

  // ============================================
  // Handler Registration Tracking
  // ============================================

  describe('handler registration tracking', () => {
    it('tracks all registered handlers', () => {
      const handlers = ports.events.getHandlers()

      // Controller registers these handlers in init()
      expect(handlers.dragStart.length).toBeGreaterThan(0)
      expect(handlers.dragMove.length).toBeGreaterThan(0)
      expect(handlers.dragEnd.length).toBeGreaterThan(0)
      expect(handlers.dragCancel.length).toBeGreaterThan(0)
    })

    it('tracks keyboard handlers', () => {
      const handlers = ports.events.getHandlers()

      // Controller registers Alt key handlers
      expect(handlers.keyDown.has('Alt')).toBe(true)
      expect(handlers.keyUp.has('Alt')).toBe(true)
    })
  })

  // ============================================
  // Cleanup on Dispose
  // ============================================

  describe('cleanup on dispose', () => {
    it('removes all drag handlers on dispose', () => {
      controller.dispose()

      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(0)
      expect(handlers.dragMove).toHaveLength(0)
      expect(handlers.dragEnd).toHaveLength(0)
      expect(handlers.dragCancel).toHaveLength(0)
    })

    it('removes keyboard handlers on dispose', () => {
      controller.dispose()

      const handlers = ports.events.getHandlers()
      expect(handlers.keyDown.get('Alt') ?? []).toHaveLength(0)
      expect(handlers.keyUp.get('Alt') ?? []).toHaveLength(0)
    })

    it('can be called multiple times safely', () => {
      // Should not throw
      controller.dispose()
      controller.dispose()
      controller.dispose()

      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(0)
    })
  })

  // ============================================
  // Multiple Controller Lifecycle
  // ============================================

  describe('multiple controller lifecycle', () => {
    it('does not accumulate handlers across multiple init calls', () => {
      // Multiple init calls should clean up previous handlers
      controller.init()
      controller.init()
      controller.init()

      const handlers = ports.events.getHandlers()

      // Should only have one handler of each type, not accumulated
      expect(handlers.dragStart).toHaveLength(1)
      expect(handlers.dragMove).toHaveLength(1)
      expect(handlers.dragEnd).toHaveLength(1)
    })

    it('supports create-dispose-create cycle', () => {
      controller.dispose()

      // Create new controller on same ports
      const controller2 = createDragDropController(ports, {})
      controller2.init()

      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(1)

      // New controller should work after old one is disposed
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller2.getState().type).toBe('dragging')

      controller2.dispose()
    })
  })

  // ============================================
  // Active Drag Cleanup
  // ============================================

  describe('active drag cleanup', () => {
    it('cleans up during active drag', () => {
      // Start a drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')

      // Dispose during active drag
      controller.dispose()

      // Should be back to idle and all handlers removed
      expect(controller.getState().type).toBe('idle')
      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(0)
    })

    it('fires onDragEnd callback with success=false on dispose during drag', () => {
      // Dispose original controller first
      controller.dispose()

      const onDragEnd = vi.fn()
      const controller2 = createDragDropController(ports, { onDragEnd })
      controller2.init()

      // Start drag
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller2.getState().type).toBe('dragging')

      // Dispose during drag
      controller2.dispose()

      // Should have fired onDragEnd with success=false
      expect(onDragEnd).toHaveBeenCalledWith(mockSource, false)
    })
  })

  // ============================================
  // Handler Isolation
  // ============================================

  describe('handler isolation', () => {
    it('one controller cleanup does not affect another', () => {
      // Create second controller
      const ports2 = createMockPorts()
      const controller2 = createDragDropController(ports2, {})
      controller2.init()

      // Dispose first controller
      controller.dispose()

      // Second controller should still work
      expect(ports2.events.getHandlers().dragStart).toHaveLength(1)
      ports2.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      expect(controller2.getState().type).toBe('dragging')

      controller2.dispose()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('handles dispose before init', () => {
      const newPorts = createMockPorts()
      const newController = createDragDropController(newPorts, {})

      // Dispose before init - should not throw
      newController.dispose()

      // Should still be able to init after
      newController.init()
      expect(newPorts.events.getHandlers().dragStart).toHaveLength(1)

      newController.dispose()
    })

    it('handles rapid init-dispose cycles', () => {
      for (let i = 0; i < 10; i++) {
        controller.init()
        controller.dispose()
      }

      // Should have no handlers left
      const handlers = ports.events.getHandlers()
      expect(handlers.dragStart).toHaveLength(0)
    })

    it('handles events after dispose gracefully', () => {
      controller.dispose()

      // These should not throw or have any effect
      ports.events.simulateDragStart(mockSource, { x: 100, y: 100 })
      ports.events.simulateDragMove({ x: 150, y: 150 })
      ports.events.simulateDragEnd()
      ports.events.simulateKeyDown('Alt')
      ports.events.simulateKeyUp('Alt')

      // State should remain idle
      expect(controller.getState().type).toBe('idle')
    })
  })
})
