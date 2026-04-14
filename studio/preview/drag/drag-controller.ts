/**
 * DragController - Orchestrates the drag & drop system
 *
 * Coordinates LayoutCache, HitDetector, InsertionCalculator, and Indicator.
 * Manages drag state and delegates to CodeExecutor on drop.
 */

import type { Point, DragSource, DropTarget } from './types'
import { LayoutCache } from './layout-cache'
import { HitDetector } from './hit-detector'
import { InsertionCalculator } from './insertion-calculator'
import { Indicator } from './indicator'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('DragController')

type DragState = 'idle' | 'dragging'

// Performance tracking (debug only)
const PERF_LOGGING = false

export interface DragControllerCallbacks {
  onDrop: (source: DragSource, target: DropTarget) => Promise<void>
}

export class DragController {
  private cache = new LayoutCache()
  private hitDetector = new HitDetector()
  private calculator = new InsertionCalculator()
  private indicator = new Indicator()

  private state: DragState = 'idle'
  private source: DragSource | null = null
  private lastTarget: DropTarget | null = null
  private callbacks: DragControllerCallbacks | null = null

  /**
   * Set callbacks for drag events
   */
  setCallbacks(callbacks: DragControllerCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Start a drag operation
   * Builds the layout cache for fast lookups
   *
   * @param source - What is being dragged
   * @param container - The preview container element
   */
  startDrag(source: DragSource, container: HTMLElement): void {
    this.state = 'dragging'
    this.source = source
    this.cache.build(container)
  }

  /**
   * Update drag position - called on every mouse move
   * Should be throttled with requestAnimationFrame by the caller
   *
   * Performance target: < 1ms per call
   *
   * @param cursor - Current cursor position
   */
  updatePosition(cursor: Point): void {
    if (this.state !== 'dragging') return

    const start = PERF_LOGGING ? performance.now() : 0

    // 1. Find container under cursor
    const hit = this.hitDetector.detect(cursor, this.cache)

    if (!hit) {
      this.indicator.hide()
      this.lastTarget = null
      return
    }

    // 2. Get children from cache
    const children = this.cache.getChildren(hit.containerId)

    // 3. Calculate insertion position
    const insertion = this.calculator.calculate(cursor, children, hit.layout, hit.containerRect)

    // 4. Show indicator
    this.indicator.show(insertion.linePosition, insertion.lineSize, insertion.orientation)

    // 5. Store target for drop
    this.lastTarget = {
      containerId: hit.containerId,
      insertionIndex: insertion.index,
    }

    if (PERF_LOGGING) {
      const elapsed = performance.now() - start
      if (elapsed > 1) {
        log.warn(`updatePosition took ${elapsed.toFixed(2)}ms (target: <1ms)`)
      }
    }
  }

  /**
   * Complete the drag operation
   * Triggers code modification via callback
   */
  async drop(): Promise<void> {
    if (!this.source || !this.lastTarget) {
      this.reset()
      return
    }

    const source = this.source
    const target = this.lastTarget

    // Reset state immediately (before async operation)
    this.reset()

    // Execute drop via callback
    if (this.callbacks?.onDrop) {
      try {
        await this.callbacks.onDrop(source, target)
      } catch (error) {
        console.error('[DragController] Drop failed:', error)
      }
    }
  }

  /**
   * Cancel the current drag operation
   */
  cancel(): void {
    this.reset()
  }

  /**
   * Check if a drag is in progress
   */
  isDragging(): boolean {
    return this.state === 'dragging'
  }

  /**
   * Get the current drag source (if any)
   */
  getSource(): DragSource | null {
    return this.source
  }

  /**
   * Get the current drop target (if any)
   */
  getTarget(): DropTarget | null {
    return this.lastTarget
  }

  /**
   * Reset all state
   */
  private reset(): void {
    this.state = 'idle'
    this.source = null
    this.lastTarget = null
    this.indicator.hide()
    this.cache.invalidate()
  }

  /**
   * Cleanup - call on unmount
   */
  destroy(): void {
    this.reset()
    this.indicator.destroy()
  }
}

// Singleton instance
let dragControllerInstance: DragController | null = null

/**
 * Get the singleton DragController instance
 */
export function getDragController(): DragController {
  if (!dragControllerInstance) {
    dragControllerInstance = new DragController()
  }
  return dragControllerInstance
}

/**
 * Reset the singleton (for testing)
 */
export function resetDragController(): void {
  if (dragControllerInstance) {
    dragControllerInstance.destroy()
    dragControllerInstance = null
  }
}
