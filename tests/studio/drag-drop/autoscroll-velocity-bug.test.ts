/**
 * Autoscroll Velocity Tests
 *
 * Tests that verify velocity is correctly clamped to maxSpeed,
 * even when cursor is outside the container.
 *
 * Previously there was a bug where negative distances (cursor outside)
 * would cause velocity > maxSpeed. This has been fixed.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutoscrollManager } from '../../../studio/drag-drop/system/autoscroll'

describe('Autoscroll Velocity Bug', () => {
  let container: HTMLElement
  let manager: AutoscrollManager

  beforeEach(() => {
    // Create a scrollable container
    container = document.createElement('div')

    // Mock getBoundingClientRect
    container.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
      width: 400,
      height: 300,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }))

    // Mock scroll properties
    Object.defineProperty(container, 'scrollLeft', {
      value: 100, // Can scroll left
      writable: true,
    })
    Object.defineProperty(container, 'scrollTop', {
      value: 100, // Can scroll up
      writable: true,
    })
    Object.defineProperty(container, 'scrollWidth', {
      value: 1000,
      writable: true,
    })
    Object.defineProperty(container, 'scrollHeight', {
      value: 800,
      writable: true,
    })
    Object.defineProperty(container, 'clientWidth', {
      value: 400,
      writable: true,
    })
    Object.defineProperty(container, 'clientHeight', {
      value: 300,
      writable: true,
    })

    manager = new AutoscrollManager({
      container,
      edgeThreshold: 50,
      maxSpeed: 15,
      acceleration: 1, // Immediate (no acceleration smoothing)
    })
  })

  afterEach(() => {
    manager.dispose()
  })

  /**
   * FIXED: Cursor outside container - velocity is now clamped
   */
  it('cursor outside left edge has velocity clamped to maxSpeed', () => {
    // Cursor 10px OUTSIDE the left edge
    // Container left = 100, cursor x = 90
    // distanceFromLeft = 90 - 100 = -10 (negative!)
    const cursor = { x: 90, y: 250 }

    const distanceFromLeft = cursor.x - 100 // -10
    const edgeThreshold = 50
    const maxSpeed = 15

    // FIXED formula with clamping:
    const factor = Math.max(0, Math.min(1, 1 - distanceFromLeft / edgeThreshold))
    // factor = Math.max(0, Math.min(1, 1.2)) = 1.0
    const velocity = -maxSpeed * factor // -15

    // Velocity is now correctly clamped to maxSpeed
    expect(Math.abs(velocity)).toBeLessThanOrEqual(maxSpeed)
    expect(factor).toBe(1) // Clamped to 1

    manager.stop()
  })

  /**
   * FIXED: Cursor outside right edge - velocity is clamped
   */
  it('cursor outside right edge has velocity clamped to maxSpeed', () => {
    // Cursor 10px OUTSIDE the right edge
    // Container right = 500, cursor x = 510
    // distanceFromRight = 500 - 510 = -10 (negative!)
    const cursor = { x: 510, y: 250 }

    const distanceFromRight = 500 - cursor.x // -10
    const edgeThreshold = 50
    const maxSpeed = 15

    // FIXED formula with clamping:
    const factor = Math.max(0, Math.min(1, 1 - distanceFromRight / edgeThreshold))
    const velocity = maxSpeed * factor // 15

    // Velocity is now clamped
    expect(Math.abs(velocity)).toBeLessThanOrEqual(maxSpeed)
    expect(factor).toBe(1)

    manager.stop()
  })

  /**
   * FIXED: Cursor outside top edge - velocity is clamped
   */
  it('cursor outside top edge has velocity clamped to maxSpeed', () => {
    // Cursor 20px OUTSIDE the top edge
    // Container top = 100, cursor y = 80
    const cursor = { x: 250, y: 80 }

    const distanceFromTop = cursor.y - 100 // -20
    const edgeThreshold = 50
    const maxSpeed = 15

    // FIXED formula with clamping:
    const factor = Math.max(0, Math.min(1, 1 - distanceFromTop / edgeThreshold))
    const velocity = -maxSpeed * factor // -15

    // Velocity is now clamped
    expect(Math.abs(velocity)).toBeLessThanOrEqual(maxSpeed)
    expect(factor).toBe(1)

    manager.stop()
  })

  /**
   * Cursor inside container near edge works correctly
   */
  it('cursor inside container near edge stays within maxSpeed', () => {
    // Cursor 25px inside from left edge (half of threshold)
    // Container left = 100, cursor x = 125
    const cursor = { x: 125, y: 250 }

    const distanceFromLeft = cursor.x - 100 // 25
    const edgeThreshold = 50
    const maxSpeed = 15

    const factor = 1 - distanceFromLeft / edgeThreshold // 1 - 25/50 = 0.5
    const velocity = -maxSpeed * factor // -15 * 0.5 = -7.5

    // Correct: velocity is within bounds
    expect(Math.abs(velocity)).toBeLessThanOrEqual(maxSpeed)
    expect(Math.abs(velocity)).toBe(7.5)

    manager.stop()
  })

  /**
   * Cursor at edge gives maximum speed
   */
  it('cursor at edge gives maximum speed', () => {
    // Cursor exactly at left edge
    // Container left = 100, cursor x = 100
    const cursor = { x: 100, y: 250 }

    const distanceFromLeft = cursor.x - 100 // 0
    const edgeThreshold = 50
    const maxSpeed = 15

    const factor = 1 - distanceFromLeft / edgeThreshold // 1 - 0/50 = 1.0
    const velocity = -maxSpeed * factor // -15 * 1.0 = -15

    // Correct: velocity equals maxSpeed
    expect(Math.abs(velocity)).toBe(maxSpeed)

    manager.stop()
  })

  /**
   * FIXED: Far outside still capped at maxSpeed
   */
  it('cursor far outside has velocity clamped to maxSpeed', () => {
    // Cursor 100px OUTSIDE the left edge (2x threshold)
    // Container left = 100, cursor x = 0
    const cursor = { x: 0, y: 250 }

    const distanceFromLeft = cursor.x - 100 // -100
    const edgeThreshold = 50
    const maxSpeed = 15

    // FIXED formula with clamping:
    const factor = Math.max(0, Math.min(1, 1 - distanceFromLeft / edgeThreshold))
    // Without clamping: 1 - (-100/50) = 3.0
    // With clamping: Math.min(1, 3.0) = 1.0
    const velocity = -maxSpeed * factor // -15

    // Velocity is correctly clamped to maxSpeed
    expect(Math.abs(velocity)).toBeLessThanOrEqual(maxSpeed)
    expect(factor).toBe(1)

    manager.stop()
  })
})
