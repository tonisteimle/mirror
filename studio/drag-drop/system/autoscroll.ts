/**
 * Autoscroll Utility
 *
 * Automatically scrolls a container when the cursor is near its edges during drag operations.
 * This improves UX by allowing users to drag elements to off-screen positions.
 */

import type { Point } from '../types'

// ============================================
// Configuration
// ============================================

export interface AutoscrollConfig {
  /** Container element to scroll */
  container: HTMLElement

  /** Distance from edge to trigger autoscroll (px) */
  edgeThreshold?: number

  /** Maximum scroll speed (px per frame) */
  maxSpeed?: number

  /** Acceleration factor (higher = faster ramp up) */
  acceleration?: number
}

const DEFAULT_EDGE_THRESHOLD = 50
const DEFAULT_MAX_SPEED = 15
const DEFAULT_ACCELERATION = 0.5

// ============================================
// Autoscroll Manager
// ============================================

export class AutoscrollManager {
  private container: HTMLElement
  private edgeThreshold: number
  private maxSpeed: number
  private acceleration: number

  private animationFrameId: number | null = null
  private scrollVelocity: Point = { x: 0, y: 0 }
  private lastCursor: Point | null = null
  private isActive = false

  constructor(config: AutoscrollConfig) {
    this.container = config.container
    this.edgeThreshold = config.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD
    this.maxSpeed = config.maxSpeed ?? DEFAULT_MAX_SPEED
    this.acceleration = config.acceleration ?? DEFAULT_ACCELERATION
  }

  /**
   * Update autoscroll based on cursor position.
   * Call this on every drag move event.
   */
  update(cursor: Point): void {
    this.lastCursor = cursor
    const velocity = this.calculateVelocity(cursor)

    // Check if we need to scroll
    if (velocity.x !== 0 || velocity.y !== 0) {
      this.scrollVelocity = velocity
      if (!this.isActive) {
        this.start()
      }
    } else {
      this.stop()
    }
  }

  /**
   * Stop autoscrolling.
   * Call this when drag ends.
   */
  stop(): void {
    this.isActive = false
    this.scrollVelocity = { x: 0, y: 0 }
    this.lastCursor = null

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Dispose the autoscroll manager.
   */
  dispose(): void {
    this.stop()
  }

  // ============================================
  // Private Methods
  // ============================================

  private start(): void {
    if (this.isActive) return
    this.isActive = true
    this.tick()
  }

  private tick(): void {
    if (!this.isActive) return

    // Apply scroll
    if (this.scrollVelocity.x !== 0 || this.scrollVelocity.y !== 0) {
      this.container.scrollLeft += this.scrollVelocity.x
      this.container.scrollTop += this.scrollVelocity.y
    }

    // Recalculate velocity with acceleration
    if (this.lastCursor) {
      const newVelocity = this.calculateVelocity(this.lastCursor)
      this.scrollVelocity = {
        x: this.accelerate(this.scrollVelocity.x, newVelocity.x),
        y: this.accelerate(this.scrollVelocity.y, newVelocity.y),
      }

      // Stop if no more scrolling needed
      if (newVelocity.x === 0 && newVelocity.y === 0) {
        this.stop()
        return
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick())
  }

  private calculateVelocity(cursor: Point): Point {
    const rect = this.container.getBoundingClientRect()

    let vx = 0
    let vy = 0

    // Calculate distances from edges
    const distanceFromLeft = cursor.x - rect.left
    const distanceFromRight = rect.right - cursor.x
    const distanceFromTop = cursor.y - rect.top
    const distanceFromBottom = rect.bottom - cursor.y

    // Horizontal scrolling
    // Note: When cursor is OUTSIDE container, distance is negative.
    // We clamp factor to [0, 1] to prevent velocity exceeding maxSpeed.
    if (distanceFromLeft < this.edgeThreshold && this.container.scrollLeft > 0) {
      // Scroll left
      const factor = Math.max(0, Math.min(1, 1 - distanceFromLeft / this.edgeThreshold))
      vx = -this.maxSpeed * factor
    } else if (distanceFromRight < this.edgeThreshold) {
      // Check if we can scroll right
      const maxScrollLeft = this.container.scrollWidth - this.container.clientWidth
      if (this.container.scrollLeft < maxScrollLeft) {
        const factor = Math.max(0, Math.min(1, 1 - distanceFromRight / this.edgeThreshold))
        vx = this.maxSpeed * factor
      }
    }

    // Vertical scrolling
    if (distanceFromTop < this.edgeThreshold && this.container.scrollTop > 0) {
      // Scroll up
      const factor = Math.max(0, Math.min(1, 1 - distanceFromTop / this.edgeThreshold))
      vy = -this.maxSpeed * factor
    } else if (distanceFromBottom < this.edgeThreshold) {
      // Check if we can scroll down
      const maxScrollTop = this.container.scrollHeight - this.container.clientHeight
      if (this.container.scrollTop < maxScrollTop) {
        const factor = Math.max(0, Math.min(1, 1 - distanceFromBottom / this.edgeThreshold))
        vy = this.maxSpeed * factor
      }
    }

    return { x: vx, y: vy }
  }

  private accelerate(current: number, target: number): number {
    // Smoothly accelerate/decelerate towards target velocity
    if (Math.abs(target) < 0.1) {
      return 0
    }

    const diff = target - current
    return current + diff * this.acceleration
  }
}

/**
 * Create an autoscroll manager for a container
 */
export function createAutoscroll(config: AutoscrollConfig): AutoscrollManager {
  return new AutoscrollManager(config)
}
