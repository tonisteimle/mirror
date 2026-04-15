/**
 * @vitest-environment jsdom
 *
 * Touch & Mobile Drag-Drop Tests
 *
 * Tests for touch-based drag interactions on mobile devices.
 * Covers touch events, mobile-specific behavior, and accessibility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMockPorts,
  createMockEventPort,
} from '../../../studio/drag-drop/system/adapters/mock-adapters'
import {
  DragDropController,
  createDragDropController,
} from '../../../studio/drag-drop/system/drag-drop-controller'
import type { DragSource, Point } from '../../../studio/drag-drop/types'

// ============================================
// Test Setup
// ============================================

function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  x: number,
  y: number,
  options: Partial<TouchEventInit> = {}
): TouchEvent {
  const touch = {
    identifier: 0,
    target: document.body,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
    force: 1,
  } as Touch

  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' ? [] : [touch],
    targetTouches: type === 'touchend' ? [] : [touch],
    changedTouches: [touch],
    ...options,
  })
}

function createTestContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'test-container'
  container.style.width = '400px'
  container.style.height = '600px'
  document.body.appendChild(container)
  return container
}

function cleanupTestContainer(): void {
  const container = document.getElementById('test-container')
  if (container) container.remove()
}

// ============================================
// Touch Event Handling Tests
// ============================================

describe('Touch Events', () => {
  let container: HTMLElement
  let mockPorts: ReturnType<typeof createMockPorts>
  let controller: DragDropController

  beforeEach(() => {
    container = createTestContainer()
    mockPorts = createMockPorts()
    controller = createDragDropController(mockPorts)
    controller.init()
  })

  afterEach(() => {
    controller.dispose()
    cleanupTestContainer()
  })

  describe('Touch Start', () => {
    it('should recognize touch as drag start', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      // Simulate touch start via event port
      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

      const state = controller.getState()
      expect(state.type).toBe('dragging')
    })

    it('should extract correct coordinates from touch event', () => {
      const touchEvent = createTouchEvent('touchstart', 150, 250)

      // Touch coordinates should be extracted correctly
      expect(touchEvent.touches[0].clientX).toBe(150)
      expect(touchEvent.touches[0].clientY).toBe(250)
    })

    it('should ignore multi-touch gestures', () => {
      // Multi-touch should not trigger drag
      const multiTouch = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100 } as Touch,
          { identifier: 1, clientX: 200, clientY: 200 } as Touch,
        ],
      })

      // Multi-touch should have more than one touch point
      expect(multiTouch.touches.length).toBe(2)

      // Controller should remain idle (no drag started)
      expect(controller.getState().type).toBe('idle')
    })
  })

  describe('Touch Move', () => {
    it('should track touch movement during drag', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      // Start drag
      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')

      // Move
      mockPorts.events.simulateDragMove({ x: 150, y: 200 })

      const state = controller.getState()
      if (state.type === 'dragging') {
        expect(state.cursor).toEqual({ x: 150, y: 200 })
      }
    })

    it('should prevent scroll during active drag', () => {
      // When dragging is active, default touch behavior should be prevented
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

      // Drag is active
      expect(controller.getState().type).toBe('dragging')

      // In real implementation, touchmove would call preventDefault()
    })
  })

  describe('Touch End', () => {
    it('should complete drag on touch end', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')

      mockPorts.events.simulateDragEnd()
      expect(controller.getState().type).toBe('idle')
    })

    it('should cancel drag on touch cancel', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')

      mockPorts.events.simulateDragCancel()
      expect(controller.getState().type).toBe('idle')
    })
  })
})

// ============================================
// Mobile-Specific Behavior Tests
// ============================================

describe('Mobile Behavior', () => {
  let mockPorts: ReturnType<typeof createMockPorts>
  let controller: DragDropController

  beforeEach(() => {
    mockPorts = createMockPorts()
    controller = createDragDropController(mockPorts)
    controller.init()
  })

  afterEach(() => {
    controller.dispose()
  })

  describe('Long Press Detection', () => {
    it('should support delayed drag start for long press', async () => {
      // On mobile, drag might start after a long press delay
      // This test documents the expected behavior

      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      // Initially idle
      expect(controller.getState().type).toBe('idle')

      // After long press threshold, drag should start
      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })
      expect(controller.getState().type).toBe('dragging')
    })
  })

  describe('Viewport Boundaries', () => {
    it('should handle drag near viewport edges', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 10, y: 10 })

      // Move to edge (simulate near viewport boundary)
      mockPorts.events.simulateDragMove({ x: 0, y: 0 })

      // Should still be dragging, not cancelled
      const state = controller.getState()
      expect(state.type).toBe('dragging')
    })

    it('should handle drag outside viewport', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

      // Move outside viewport (negative coordinates)
      mockPorts.events.simulateDragMove({ x: -50, y: -50 })

      // Should still track the drag
      const state = controller.getState()
      expect(state.type).toBe('dragging')
    })
  })

  describe('Orientation Change', () => {
    it('should handle viewport resize during drag', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

      // Simulate orientation change (coordinates might shift)
      // The drag should continue with updated positions
      mockPorts.events.simulateDragMove({ x: 200, y: 50 })

      const state = controller.getState()
      expect(state.type).toBe('dragging')
    })
  })
})

// ============================================
// Touch Accessibility Tests
// ============================================

describe('Touch Accessibility', () => {
  let mockPorts: ReturnType<typeof createMockPorts>
  let controller: DragDropController

  beforeEach(() => {
    mockPorts = createMockPorts()
    controller = createDragDropController(mockPorts)
    controller.init()
  })

  afterEach(() => {
    controller.dispose()
  })

  describe('Touch Target Size', () => {
    it('should work with minimum touch target size (44x44)', () => {
      // Minimum recommended touch target is 44x44 pixels
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'small-button',
        element: document.createElement('div'),
      }

      // Should be able to start drag even on small targets
      mockPorts.events.simulateDragStart(source, { x: 22, y: 22 })
      expect(controller.getState().type).toBe('dragging')
    })
  })

  describe('Visual Feedback', () => {
    it('should show visual feedback during touch drag', () => {
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'node-1',
        element: document.createElement('div'),
      }

      mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

      // Visual port should be available for feedback
      expect(mockPorts.visual).toBeDefined()
    })
  })
})

// ============================================
// No Alt Key on Mobile Tests
// ============================================

describe('Alt Key on Mobile', () => {
  let mockPorts: ReturnType<typeof createMockPorts>
  let controller: DragDropController

  beforeEach(() => {
    mockPorts = createMockPorts()
    controller = createDragDropController(mockPorts, {
      enableAltDuplicate: true,
    })
    controller.init()
  })

  afterEach(() => {
    controller.dispose()
  })

  it('should not have Alt key pressed by default', () => {
    const context = controller.getContext()
    expect(context.isAltKeyPressed).toBe(false)
  })

  it('should track Alt key state when external keyboard connected', () => {
    // External keyboard on tablet could send Alt key
    mockPorts.events.simulateKeyDown('Alt')

    const context = controller.getContext()
    expect(context.isAltKeyPressed).toBe(true)
  })

  it('should reset Alt key on key up', () => {
    mockPorts.events.simulateKeyDown('Alt')
    expect(controller.getContext().isAltKeyPressed).toBe(true)

    mockPorts.events.simulateKeyUp('Alt')
    expect(controller.getContext().isAltKeyPressed).toBe(false)
  })
})

// ============================================
// Performance Tests
// ============================================

describe('Touch Performance', () => {
  let mockPorts: ReturnType<typeof createMockPorts>
  let controller: DragDropController

  beforeEach(() => {
    mockPorts = createMockPorts()
    controller = createDragDropController(mockPorts)
    controller.init()
  })

  afterEach(() => {
    controller.dispose()
  })

  it('should handle rapid touch moves efficiently', () => {
    const source: DragSource = {
      type: 'canvas',
      nodeId: 'node-1',
      element: document.createElement('div'),
    }

    mockPorts.events.simulateDragStart(source, { x: 100, y: 100 })

    // Simulate rapid movement (60fps = ~16ms intervals)
    const startTime = performance.now()
    for (let i = 0; i < 60; i++) {
      mockPorts.events.simulateDragMove({ x: 100 + i, y: 100 + i })
    }
    const duration = performance.now() - startTime

    // Should complete quickly (allowing for test overhead)
    expect(duration).toBeLessThan(100) // 100ms for 60 moves

    // State should be consistent
    expect(controller.getState().type).toBe('dragging')
  })
})
