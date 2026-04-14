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
  private lastLoggedContainer: string | null = null // Track for reduced logging

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
    this.lastLoggedContainer = null
    this.cache.build(container)
  }

  /** Update drag position - called on every mouse move */
  updatePosition(cursor: Point): void {
    if (this.state !== 'dragging') {
      // Only log once when drag ends
      if (this.lastLoggedContainer !== null) {
        log.debug('updatePosition: Not dragging, state=', this.state)
        this.lastLoggedContainer = null
      }
      return
    }

    const hit = this.hitDetector.detect(cursor, this.cache)
    if (!hit) {
      if (this.lastLoggedContainer !== null) {
        log.debug('updatePosition: No hit')
        this.lastLoggedContainer = null
      }
      return this.clearTarget()
    }

    // Only log when container changes
    if (hit.containerId !== this.lastLoggedContainer) {
      log.info('Target:', hit.containerId, 'layout:', hit.layout)
      this.lastLoggedContainer = hit.containerId
    }

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
    if (!this.source || !this.lastTarget) {
      log.warn('Drop aborted: missing source or target')
      return this.reset()
    }

    const source = this.source
    const target = this.lastTarget
    log.info('Dropped:', (source as any).componentName || source.type, '→', target.containerId)
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
