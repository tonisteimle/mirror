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
    log.warn(
      'startDrag called with source:',
      source.type,
      'componentName:',
      (source as any).componentName
    )
    this.state = 'dragging'
    this.source = source
    this.cache.build(container)
    log.warn('Cache isEmpty:', this.cache.isEmpty())
  }

  /** Update drag position - called on every mouse move */
  updatePosition(cursor: Point): void {
    if (this.state !== 'dragging') {
      log.warn('updatePosition: Not dragging, state=', this.state)
      return
    }

    const hit = this.hitDetector.detect(cursor, this.cache)
    if (!hit) {
      log.warn('updatePosition: No hit detected at', cursor)
      return this.clearTarget()
    }

    log.warn('updatePosition: Hit!', hit.containerId, hit.layout)
    const insertion = this.calculateInsertion(cursor, hit)
    this.showIndicator(insertion)
    this.storeTarget(hit.containerId, insertion.index)
  }

  /** Clear target and hide indicator */
  private clearTarget(): void {
    this.indicator.hide()
    this.lastTarget = null
  }

  /** Calculate insertion position for hit */
  private calculateInsertion(cursor: Point, hit: import('./types').HitResult) {
    const children = this.cache.getChildren(hit.containerId)
    return this.calculator.calculate(cursor, children, hit.layout, hit.containerRect)
  }

  /** Show indicator at insertion position */
  private showIndicator(insertion: import('./types').InsertionResult): void {
    this.indicator.show(insertion.linePosition, insertion.lineSize, insertion.orientation)
  }

  /** Store drop target */
  private storeTarget(containerId: string, insertionIndex: number): void {
    this.lastTarget = { containerId, insertionIndex }
  }

  /** Complete the drag operation */
  async drop(): Promise<void> {
    if (!this.source || !this.lastTarget) return this.reset()

    const source = this.source
    const target = this.lastTarget
    this.reset()

    await this.executeDropCallback(source, target)
  }

  /** Execute drop callback safely */
  private async executeDropCallback(source: DragSource, target: DropTarget): Promise<void> {
    if (!this.callbacks?.onDrop) return

    try {
      await this.callbacks.onDrop(source, target)
    } catch (error) {
      console.error('[DragController] Drop failed:', error)
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
