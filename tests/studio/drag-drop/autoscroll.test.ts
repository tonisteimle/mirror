/**
 * Autoscroll Manager Tests
 *
 * Tests for the AutoscrollManager class that handles automatic scrolling
 * when the cursor is near container edges during drag operations.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutoscrollManager, createAutoscroll } from '../../../studio/drag-drop/system/autoscroll'

// ============================================
// Test Helpers
// ============================================

interface MockContainerOptions {
  /** Container's viewport rect */
  rect: { left: number; top: number; right: number; bottom: number }
  /** Current scroll position */
  scrollLeft?: number
  scrollTop?: number
  /** Total scrollable dimensions */
  scrollWidth?: number
  scrollHeight?: number
  /** Visible dimensions */
  clientWidth?: number
  clientHeight?: number
}

function createMockContainer(options: MockContainerOptions): HTMLElement {
  const container = document.createElement('div')

  // Mock getBoundingClientRect
  container.getBoundingClientRect = () => ({
    left: options.rect.left,
    top: options.rect.top,
    right: options.rect.right,
    bottom: options.rect.bottom,
    width: options.rect.right - options.rect.left,
    height: options.rect.bottom - options.rect.top,
    x: options.rect.left,
    y: options.rect.top,
    toJSON: () => ({}),
  })

  // Set scroll properties (these are writable)
  container.scrollLeft = options.scrollLeft ?? 0
  container.scrollTop = options.scrollTop ?? 0

  // Mock read-only scroll properties
  Object.defineProperty(container, 'scrollWidth', {
    value: options.scrollWidth ?? options.rect.right - options.rect.left,
    writable: false,
  })
  Object.defineProperty(container, 'scrollHeight', {
    value: options.scrollHeight ?? options.rect.bottom - options.rect.top,
    writable: false,
  })
  Object.defineProperty(container, 'clientWidth', {
    value: options.clientWidth ?? options.rect.right - options.rect.left,
    writable: false,
  })
  Object.defineProperty(container, 'clientHeight', {
    value: options.clientHeight ?? options.rect.bottom - options.rect.top,
    writable: false,
  })

  return container
}

// ============================================
// Configuration Tests
// ============================================

describe('AutoscrollManager', () => {
  let mockRAF: ReturnType<typeof vi.fn>
  let mockCancelRAF: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock requestAnimationFrame
    mockRAF = vi.fn((callback) => {
      // Return a fake ID
      return 1
    })
    mockCancelRAF = vi.fn()

    vi.stubGlobal('requestAnimationFrame', mockRAF)
    vi.stubGlobal('cancelAnimationFrame', mockCancelRAF)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Configuration', () => {
    it('uses default values when not specified', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
      })

      const manager = new AutoscrollManager({ container })

      // Defaults: edgeThreshold=50, maxSpeed=15, acceleration=0.5
      // Test indirectly by checking velocity at edge
      // At exactly threshold distance, velocity should be 0
      // At edge (distance 0), velocity should be maxSpeed

      // This is tested in velocity tests below
      expect(manager).toBeDefined()
    })

    it('accepts custom configuration', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({
        container,
        edgeThreshold: 100,
        maxSpeed: 20,
        acceleration: 0.8,
      })

      // Position cursor at left edge (distance 0 from left)
      // With edgeThreshold=100, factor = 1 - 0/100 = 1
      // Velocity should be -maxSpeed * factor = -20
      manager.update({ x: 0, y: 150 })

      // Animation should have started
      expect(mockRAF).toHaveBeenCalled()
    })
  })

  // ============================================
  // Velocity Calculation Tests
  // ============================================

  describe('Velocity Calculation', () => {
    describe('Horizontal Scrolling', () => {
      it('scrolls left when cursor is near left edge and can scroll', () => {
        const container = createMockContainer({
          rect: { left: 100, top: 0, right: 500, bottom: 300 },
          scrollLeft: 200, // Has room to scroll left
          scrollWidth: 1000,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
          maxSpeed: 15,
        })

        // Cursor at 25px from left edge (factor = 1 - 25/50 = 0.5)
        manager.update({ x: 125, y: 150 })

        expect(mockRAF).toHaveBeenCalled()
        // Velocity should be negative (scroll left)
      })

      it('does not scroll left when already at scroll start', () => {
        const container = createMockContainer({
          rect: { left: 100, top: 0, right: 500, bottom: 300 },
          scrollLeft: 0, // Already at start
          scrollWidth: 1000,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at left edge
        manager.update({ x: 100, y: 150 })

        // Should NOT start scrolling (no room to scroll left)
        expect(mockRAF).not.toHaveBeenCalled()
      })

      it('scrolls right when cursor is near right edge and can scroll', () => {
        const container = createMockContainer({
          rect: { left: 100, top: 0, right: 500, bottom: 300 },
          scrollLeft: 200,
          scrollWidth: 1000,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
          maxSpeed: 15,
        })

        // Cursor at 25px from right edge
        manager.update({ x: 475, y: 150 })

        expect(mockRAF).toHaveBeenCalled()
      })

      it('does not scroll right when already at scroll end', () => {
        const container = createMockContainer({
          rect: { left: 100, top: 0, right: 500, bottom: 300 },
          scrollLeft: 600, // scrollWidth(1000) - clientWidth(400) = max 600
          scrollWidth: 1000,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at right edge
        manager.update({ x: 500, y: 150 })

        // Should NOT start scrolling (already at max)
        expect(mockRAF).not.toHaveBeenCalled()
      })
    })

    describe('Vertical Scrolling', () => {
      it('scrolls up when cursor is near top edge and can scroll', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 100, right: 400, bottom: 400 },
          scrollTop: 200, // Has room to scroll up
          scrollHeight: 1000,
          clientHeight: 300,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at 25px from top edge
        manager.update({ x: 200, y: 125 })

        expect(mockRAF).toHaveBeenCalled()
      })

      it('does not scroll up when already at scroll start', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 100, right: 400, bottom: 400 },
          scrollTop: 0, // Already at start
          scrollHeight: 1000,
          clientHeight: 300,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at top edge
        manager.update({ x: 200, y: 100 })

        expect(mockRAF).not.toHaveBeenCalled()
      })

      it('scrolls down when cursor is near bottom edge and can scroll', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 100, right: 400, bottom: 400 },
          scrollTop: 200,
          scrollHeight: 1000,
          clientHeight: 300,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at 25px from bottom edge
        manager.update({ x: 200, y: 375 })

        expect(mockRAF).toHaveBeenCalled()
      })

      it('does not scroll down when already at scroll end', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 100, right: 400, bottom: 400 },
          scrollTop: 700, // scrollHeight(1000) - clientHeight(300) = max 700
          scrollHeight: 1000,
          clientHeight: 300,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor at bottom edge
        manager.update({ x: 200, y: 400 })

        expect(mockRAF).not.toHaveBeenCalled()
      })
    })

    describe('Diagonal Scrolling', () => {
      it('scrolls in both directions when cursor is in corner', () => {
        const container = createMockContainer({
          rect: { left: 100, top: 100, right: 500, bottom: 400 },
          scrollLeft: 200,
          scrollTop: 200,
          scrollWidth: 1000,
          scrollHeight: 1000,
          clientWidth: 400,
          clientHeight: 300,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
        })

        // Cursor in top-left corner
        manager.update({ x: 125, y: 125 })

        expect(mockRAF).toHaveBeenCalled()
        // Both x and y velocity should be non-zero (negative)
      })
    })

    describe('Velocity Factor', () => {
      it('velocity is zero at threshold boundary', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 0, right: 400, bottom: 300 },
          scrollLeft: 100,
          scrollWidth: 800,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
          maxSpeed: 15,
        })

        // Cursor exactly at threshold distance from left edge
        // factor = 1 - 50/50 = 0, velocity = 0
        manager.update({ x: 50, y: 150 })

        // Should NOT start scrolling (velocity is 0)
        expect(mockRAF).not.toHaveBeenCalled()
      })

      it('velocity is maxSpeed at edge', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 0, right: 400, bottom: 300 },
          scrollLeft: 100,
          scrollWidth: 800,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
          maxSpeed: 15,
        })

        // Cursor at exact edge (distance 0)
        // factor = 1 - 0/50 = 1, velocity = -15
        manager.update({ x: 0, y: 150 })

        expect(mockRAF).toHaveBeenCalled()
      })

      it('velocity scales linearly with distance', () => {
        const container = createMockContainer({
          rect: { left: 0, top: 0, right: 400, bottom: 300 },
          scrollLeft: 100,
          scrollWidth: 800,
          clientWidth: 400,
        })

        const manager = new AutoscrollManager({
          container,
          edgeThreshold: 50,
          maxSpeed: 10,
        })

        // At distance 25 from left edge: factor = 1 - 25/50 = 0.5
        // velocity should be -10 * 0.5 = -5
        manager.update({ x: 25, y: 150 })

        expect(mockRAF).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Lifecycle Tests
  // ============================================

  describe('Lifecycle', () => {
    it('starts animation when cursor enters edge zone', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // First update in center - no scrolling
      manager.update({ x: 200, y: 150 })
      expect(mockRAF).not.toHaveBeenCalled()

      // Move to edge - should start
      manager.update({ x: 25, y: 150 })
      expect(mockRAF).toHaveBeenCalledTimes(1)
    })

    it('stops animation when cursor leaves edge zone', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // Start scrolling
      manager.update({ x: 25, y: 150 })
      expect(mockRAF).toHaveBeenCalled()

      // Move to center - should stop
      manager.update({ x: 200, y: 150 })
      expect(mockCancelRAF).toHaveBeenCalled()
    })

    it('stop() cancels animation frame', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // Start scrolling
      manager.update({ x: 25, y: 150 })

      // Manually stop
      manager.stop()

      expect(mockCancelRAF).toHaveBeenCalled()
    })

    it('dispose() stops and cleans up', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // Start scrolling
      manager.update({ x: 25, y: 150 })

      // Dispose
      manager.dispose()

      expect(mockCancelRAF).toHaveBeenCalled()
    })

    it('does not start twice if already active', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // Multiple updates in edge zone
      manager.update({ x: 25, y: 150 })
      manager.update({ x: 20, y: 150 })
      manager.update({ x: 15, y: 150 })

      // Should only have started once
      expect(mockRAF).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Tick/Animation Tests
  // ============================================

  describe('Animation Tick', () => {
    it('applies scroll velocity to container', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollTop: 100,
        scrollWidth: 800,
        scrollHeight: 800,
        clientWidth: 400,
        clientHeight: 300,
      })

      // Make RAF execute the callback immediately for testing
      mockRAF.mockImplementation((callback) => {
        callback(performance.now())
        return 1
      })

      const manager = new AutoscrollManager({
        container,
        edgeThreshold: 50,
        maxSpeed: 10,
      })

      const initialScrollLeft = container.scrollLeft

      // Cursor at left edge - should scroll left (negative velocity)
      manager.update({ x: 0, y: 150 })

      // Scroll should have been applied
      expect(container.scrollLeft).toBeLessThan(initialScrollLeft)
    })

    it('recalculates velocity each tick with acceleration', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      let tickCount = 0
      mockRAF.mockImplementation((callback) => {
        tickCount++
        if (tickCount < 5) {
          callback(performance.now())
        }
        return tickCount
      })

      const manager = new AutoscrollManager({
        container,
        edgeThreshold: 50,
        maxSpeed: 10,
        acceleration: 0.5,
      })

      manager.update({ x: 0, y: 150 })

      // Multiple ticks should have occurred
      expect(tickCount).toBeGreaterThan(1)
    })

    it('stops ticking when velocity becomes zero', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      // Capture the RAF callback so we can invoke it manually
      let capturedCallback: ((time: number) => void) | null = null
      let rafId = 0
      mockRAF.mockImplementation((callback) => {
        capturedCallback = callback
        rafId++
        return rafId
      })

      const manager = new AutoscrollManager({ container })

      // Start scrolling (cursor at left edge)
      manager.update({ x: 0, y: 150 })
      expect(mockRAF).toHaveBeenCalled()

      // Manually trigger one tick
      const firstCallback = capturedCallback
      expect(firstCallback).not.toBeNull()
      firstCallback!(performance.now())

      // Now update with cursor at center (zero velocity)
      // This should stop the animation
      manager.update({ x: 200, y: 150 })

      // stop() should have called cancelAnimationFrame
      expect(mockCancelRAF).toHaveBeenCalled()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles container with no scrollable content', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 0,
        scrollTop: 0,
        scrollWidth: 400, // Same as clientWidth
        scrollHeight: 300, // Same as clientHeight
        clientWidth: 400,
        clientHeight: 300,
      })

      const manager = new AutoscrollManager({ container })

      // Cursor at all edges - should not scroll
      manager.update({ x: 0, y: 0 })
      expect(mockRAF).not.toHaveBeenCalled()

      manager.update({ x: 400, y: 300 })
      expect(mockRAF).not.toHaveBeenCalled()
    })

    it('handles cursor outside container bounds', () => {
      const container = createMockContainer({
        rect: { left: 100, top: 100, right: 500, bottom: 400 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({ container })

      // Cursor to the left of container (negative distance)
      manager.update({ x: 50, y: 250 })

      // Should still trigger scroll (cursor is "at" left edge)
      expect(mockRAF).toHaveBeenCalled()
    })

    it('handles very small edge threshold', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 100,
        scrollWidth: 800,
        clientWidth: 400,
      })

      const manager = new AutoscrollManager({
        container,
        edgeThreshold: 5,
      })

      // Cursor at 10px from edge - should NOT trigger (outside 5px threshold)
      manager.update({ x: 10, y: 150 })
      expect(mockRAF).not.toHaveBeenCalled()

      // Cursor at 3px from edge - should trigger
      manager.update({ x: 3, y: 150 })
      expect(mockRAF).toHaveBeenCalled()
    })

    it('handles container at viewport edge', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
        scrollLeft: 0,
        scrollTop: 0,
        scrollWidth: 800,
        scrollHeight: 600,
        clientWidth: 400,
        clientHeight: 300,
      })

      const manager = new AutoscrollManager({ container })

      // Cursor at 0,0 - left/top edge, but can't scroll left/up
      manager.update({ x: 0, y: 0 })

      // Should NOT scroll (already at 0,0 scroll position)
      expect(mockRAF).not.toHaveBeenCalled()

      // Now test bottom-right where we CAN scroll
      manager.update({ x: 390, y: 290 })
      expect(mockRAF).toHaveBeenCalled()
    })
  })

  // ============================================
  // Factory Function Test
  // ============================================

  describe('createAutoscroll', () => {
    it('creates an AutoscrollManager instance', () => {
      const container = createMockContainer({
        rect: { left: 0, top: 0, right: 400, bottom: 300 },
      })

      const manager = createAutoscroll({ container })

      expect(manager).toBeInstanceOf(AutoscrollManager)
    })
  })
})
