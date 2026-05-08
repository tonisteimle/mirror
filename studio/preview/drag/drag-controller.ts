/**
 * DragController - Orchestrates the drag & drop system
 *
 * Coordinates LayoutCache, HitDetector, InsertionCalculator, and Indicator.
 * Manages drag state and delegates to CodeExecutor on drop.
 */

import type {
  Point,
  DragSource,
  DropTarget,
  FlexDropTarget,
  AbsoluteDropTarget,
  AlignedDropTarget,
  GridDropTarget,
  HitResult,
} from './types'
import { events } from '../../core'
import { findOwningGridContainer, readGridGeometry } from '../../visual/grid-overlay/grid-detector'
import { pointerToCell, readCurrentSpan } from '../../visual/grid-overlay/grid-snap'
import type { ControllerReport, Reportable } from './reporter/types'
import { LayoutCache } from './layout-cache'
import { HitDetector } from './hit-detector'
import { InsertionCalculator } from './insertion-calculator'
import { Indicator, type AlignPosition, ALIGN_TO_PROPERTY } from './indicator'
import { DragReporter } from './reporter/drag-reporter'
import { createLogger } from '../../../compiler/utils/logger'
import { DEFAULT_COMPONENT_SIZES, FALLBACK_COMPONENT_SIZE } from './component-sizes'

const log = createLogger('DragController')

type DragState = 'idle' | 'dragging'

// Performance tracking (debug only)
const PERF_LOGGING = false

export interface DragControllerCallbacks {
  /**
   * Called when the drag completes. `target` is null when the drop
   * landed without a hit (e.g. blank-canvas / `canvas …`-only state).
   * Handlers must decide what to do with a null target.
   */
  onDrop: (source: DragSource, target: DropTarget | null) => Promise<void>
}

export class DragController implements Reportable<ControllerReport> {
  private cache = new LayoutCache()
  private hitDetector = new HitDetector()
  private calculator = new InsertionCalculator()
  private indicator = new Indicator()
  private reporter: DragReporter | null = null

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
   * Set the reporter instance for debugging
   */
  setReporter(reporter: DragReporter): void {
    this.reporter = reporter
    // Register all components with the reporter
    reporter.registerComponents({
      hitDetector: this.hitDetector,
      insertionCalculator: this.calculator,
      indicator: this.indicator,
      cache: this.cache,
      controller: this,
    })
  }

  /**
   * Get the current reporter (if any)
   */
  getReporter(): DragReporter | null {
    return this.reporter
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

    // Start reporter session
    this.reporter?.startSession(source)
  }

  /**
   * Update drag position - called on every mouse move.
   *
   * `bypassGridEscape` is forwarded to the hit-detector. When true (the
   * caller passes Cmd/Alt held), the detector skips its grid-cell escape
   * rule, so the user can drop INTO a cell-child that's itself a
   * container instead of getting redirected to the grid parent.
   */
  updatePosition(cursor: Point, options?: { bypassGridEscape?: boolean }): void {
    if (this.state !== 'dragging') {
      // Only log once when drag ends
      if (this.lastLoggedContainer !== null) {
        log.debug('updatePosition: Not dragging, state=', this.state)
        this.lastLoggedContainer = null
      }
      return
    }

    const hit = this.hitDetector.detect(cursor, this.cache, options)
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

    // Branch based on layout type
    if (hit.layout === 'grid') {
      // Grid: cell-aware drop. Compute cell from cursor + live grid
      // geometry, store as a GridDropTarget, mirror the cell as an
      // active-cell ghost via GridOverlay.
      this.handleGridHit(cursor, hit)
      return
    }
    if (hit.layout === 'absolute') {
      // Absolute/stacked layout: position-based drop
      const absResult = this.calculateAbsolutePosition(cursor, hit)

      // For canvas moves, show the actual element content in the ghost
      const sourceElement = this.getSourceElement()
      this.indicator.showGhost(absResult.ghostRect, sourceElement)

      // Only highlight container if dropping into a DIFFERENT container
      // (moving within same stacked container doesn't need highlight)
      const isSameContainer =
        this.source?.type === 'canvas' &&
        this.isElementInContainer(this.source.nodeId, hit.containerId)
      if (!isSameContainer) {
        this.highlightContainer(hit.containerId, hit.containerRect)
      } else {
        this.indicator.hideContainerHighlight()
      }
      this.storeAbsoluteTarget(hit.containerId, absResult.position)
    } else {
      // Flex/grid layout: check if container is empty (or will be empty) and large enough for alignment zones
      const children = this.cache.getChildren(hit.containerId)

      // Container is effectively empty if:
      // 1. It has no children, OR
      // 2. It has exactly one child AND that child is the element being dragged
      //    (moving the only child would make the container empty)
      const isOnlyChildBeingDragged =
        children.length === 1 &&
        this.source?.type === 'canvas' &&
        children[0].nodeId === this.source.nodeId
      const isEmptyContainer = children.length === 0 || isOnlyChildBeingDragged
      const isLargeEnough = this.indicator.isLargeEnoughForAlignmentZones(hit.containerRect)

      if (isEmptyContainer && isLargeEnough) {
        // Empty container: show 9-point alignment zones
        this.indicator.showAlignmentZones(hit.containerRect)
        this.highlightContainer(hit.containerId, hit.containerRect)

        // Determine which zone is hovered
        const alignPosition = this.indicator.getAlignmentPositionFromCursor(
          cursor,
          hit.containerRect
        )
        this.indicator.updateHoveredZone(alignPosition)

        // Store aligned target with the alignment property
        this.storeAlignedTarget(hit.containerId, ALIGN_TO_PROPERTY[alignPosition])
      } else {
        // Normal flex/grid: index-based drop
        const insertion = this.calculateInsertion(cursor, hit)
        this.showIndicator(insertion)
        this.highlightContainer(hit.containerId, hit.containerRect)
        this.storeFlexTarget(hit.containerId, insertion.index)
      }
    }

    // Capture frame for reporting
    this.reporter?.captureFrame(cursor)
  }

  /** Highlight the target container */
  private highlightContainer(containerId: string, rect: DOMRect): void {
    this.indicator.highlightContainer(containerId, rect)
  }

  /** Clear target and hide indicator */
  private clearTarget(): void {
    this.indicator.hide()
    // Drop the active-cell ghost regardless of whether the previous
    // target was a grid hit — emit-cost is one no-op listener call.
    events.emit('grid:active-cell', null)
    this.lastTarget = null
  }

  /** Calculate insertion position for hit (caller guarantees hit.layout !== 'absolute') */
  private calculateInsertion(cursor: Point, hit: import('./types').HitResult) {
    let children = this.cache.getChildren(hit.containerId)

    // Canvas move: filter the dragged element out of the child list. After
    // the move the source no longer occupies its old slot, so leaving it in
    // would skew every subsequent index by 1.
    if (this.source?.type === 'canvas' && this.source.nodeId) {
      children = children.filter(c => c.nodeId !== this.source!.nodeId)
    }

    // Caller guards against absolute; treat as flex (assertion).
    return this.calculator.calculate(
      cursor,
      children,
      hit.layout as import('./types').FlexLayout,
      hit.containerRect
    )
  }

  /** Show indicator at insertion position */
  private showIndicator(insertion: import('./types').InsertionResult): void {
    this.indicator.show(insertion.linePosition, insertion.lineSize, insertion.orientation)
  }

  /** Calculate absolute position for stacked/absolute layouts */
  private calculateAbsolutePosition(
    cursor: Point,
    hit: HitResult
  ): {
    position: Point
    ghostRect: DOMRect
  } {
    const size = this.getSourceSize()

    // Get grab offset (where user clicked on the element)
    // For canvas moves, this keeps the element under the cursor where it was grabbed
    // For palette drops, default to center of element (half size)
    const grabOffset = this.source?.grabOffset ?? {
      x: size.width / 2,
      y: size.height / 2,
    }

    // Position relative to container, accounting for grab offset
    // Element's top-left = cursor position - grab offset
    const x = Math.max(0, cursor.x - hit.containerRect.x - grabOffset.x)
    const y = Math.max(0, cursor.y - hit.containerRect.y - grabOffset.y)

    // Clamp to container bounds (ensure element stays within container)
    const maxX = Math.max(0, hit.containerRect.width - size.width)
    const maxY = Math.max(0, hit.containerRect.height - size.height)
    const clampedX = Math.min(x, maxX)
    const clampedY = Math.min(y, maxY)

    return {
      position: { x: Math.round(clampedX), y: Math.round(clampedY) },
      ghostRect: new DOMRect(
        hit.containerRect.x + clampedX,
        hit.containerRect.y + clampedY,
        size.width,
        size.height
      ),
    }
  }

  /** Get size of the dragged element */
  private getSourceSize(): { width: number; height: number } {
    // Canvas move: use the real element's measured size.
    if (this.source?.type === 'canvas' && this.source.nodeId) {
      const rect = this.cache.getRect(this.source.nodeId)
      if (rect) {
        return { width: rect.width, height: rect.height }
      }
    }

    // Palette drop (or fallback): look up by component name.
    const componentName = this.source?.componentName ?? 'Frame'
    return DEFAULT_COMPONENT_SIZES[componentName] ?? FALLBACK_COMPONENT_SIZE
  }

  /** Get the source DOM element for canvas moves */
  private getSourceElement(): HTMLElement | undefined {
    if (this.source?.type === 'canvas' && this.source.nodeId) {
      return this.cache.getElement(this.source.nodeId) ?? undefined
    }
    return undefined
  }

  /** Store flex drop target */
  private storeFlexTarget(containerId: string, insertionIndex: number): void {
    this.lastTarget = { mode: 'flex', containerId, insertionIndex }
  }

  /** Store absolute drop target */
  private storeAbsoluteTarget(containerId: string, position: Point): void {
    // For absolute containers, insert as last child
    const children = this.cache.getChildren(containerId)
    const insertionIndex = children.length
    this.lastTarget = { mode: 'absolute', containerId, position, insertionIndex }
  }

  /** Store aligned drop target (for empty containers with 9-point grid) */
  private storeAlignedTarget(containerId: string, alignmentProperty: string): void {
    this.lastTarget = { mode: 'aligned', containerId, alignmentProperty }
  }

  /** Store grid drop target (cell-aware placement) */
  private storeGridTarget(target: GridDropTarget): void {
    this.lastTarget = target
  }

  /**
   * Handle a hover over a CSS-grid container. Reads grid geometry from
   * the live DOM, snaps the cursor to a cell, carries the dragged
   * element's existing span across, and emits `grid:active-cell` so the
   * overlay can ghost the targeted span. The drop emits `x N, y M` (and
   * `w P, h Q` when > 1) onto the moved element via ElementMoveHandler.
   */
  private handleGridHit(cursor: Point, hit: HitResult): void {
    const containerEl = this.cache.getElement(hit.containerId)
    if (!containerEl) return this.clearTarget()

    // Use the *innermost* grid container — the hit may have escaped to a
    // grid parent from a cell-child, but we still need the actual grid
    // element to read tracks from.
    const gridEl = findOwningGridContainer(containerEl) ?? containerEl
    const geo = readGridGeometry(gridEl)
    if (!geo) return this.clearTarget()

    const cell = pointerToCell(cursor, geo)

    // Carry the dragged element's existing span across (so a `w 2` cell
    // stays `w 2` after the move). Defaults to 1×1 for palette drops.
    let gridW = 1
    let gridH = 1
    if (this.source?.type === 'canvas' && this.source.nodeId) {
      const sourceEl = this.cache.getElement(this.source.nodeId)
      const span = sourceEl ? readCurrentSpan(sourceEl) : null
      if (span) {
        gridW = span.w
        gridH = span.h
      }
    }

    // insertionIndex: append to the end of the grid's children. The
    // moveNode handler uses this for sibling ordering inside the source
    // file; the *visual* placement comes from the cell coordinates.
    const children = this.cache.getChildren(hit.containerId)
    const insertionIndex = children.length

    // Container highlight + active-cell ghost.
    this.highlightContainer(hit.containerId, hit.containerRect)
    events.emit('grid:active-cell', {
      containerId: hit.containerId,
      gridX: cell.x,
      gridY: cell.y,
      gridW,
      gridH,
    })

    this.storeGridTarget({
      mode: 'grid',
      containerId: hit.containerId,
      gridX: cell.x,
      gridY: cell.y,
      gridW,
      gridH,
      insertionIndex,
    })

    // Capture frame for reporting
    this.reporter?.captureFrame(cursor)
  }

  /** Check if an element is a direct child of a container */
  private isElementInContainer(nodeId: string | undefined, containerId: string): boolean {
    if (!nodeId) return false
    const children = this.cache.getChildren(containerId)
    return children.some(child => child.nodeId === nodeId)
  }

  /** Complete the drag operation */
  async drop(): Promise<void> {
    if (!this.source) {
      log.warn('Drop aborted: missing source')
      return this.reset(false)
    }

    const source = this.source
    const target = this.lastTarget
    if (!target) {
      // No node-tree target was identified during dragover (the editor has
      // no rendered Mirror elements yet — e.g. blank or `canvas …`-only
      // state). Forward the drop with a null target so the
      // drag:dropped subscriber can decide to append as a new top-level
      // element. Keeps the v3 controller agnostic about the editor source.
      log.info('Dropped:', source.componentName || source.type, '→ root (no target)')
      this.reset(true)
      await this.executeDropCallback(source, null)
      return
    }
    log.info('Dropped:', source.componentName || source.type, '→', target.containerId)
    this.reset(true)

    await this.executeDropCallback(source, target)
  }

  /** Execute drop callback safely. Tolerates a null target (root-drop path). */
  private async executeDropCallback(source: DragSource, target: DropTarget | null): Promise<void> {
    log.debug('[DragController] executeDropCallback called', {
      hasCallbacks: !!this.callbacks,
      hasOnDrop: !!this.callbacks?.onDrop,
      source: source.type,
      targetMode: target?.mode ?? null,
    })

    if (!this.callbacks?.onDrop) {
      log.warn('[DragController] No onDrop callback set - drop will not be processed')
      return
    }

    try {
      log.debug('[DragController] Calling onDrop callback...')
      await this.callbacks.onDrop(source, target)
      log.debug('[DragController] onDrop callback completed')
    } catch (error) {
      log.error('[DragController] Drop failed:', error)
    }
  }

  /**
   * Cancel the current drag operation
   */
  cancel(): void {
    this.reset(false)
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

  // =============================================================================
  // Test backdoors — DO NOT CALL FROM PRODUCTION CODE
  //
  // These exist so `drag-test-controller.ts` can simulate drags without
  // synthesising real DragEvents. They expose narrow access to private
  // state (`source`, `lastTarget`, `state`, `cache`). The full simulation
  // surface (simulateDrop, etc.) lives in DragTestController, which uses
  // these as its only entry points.
  // =============================================================================

  /**
   * @internal Test-only: force the controller into a chosen state.
   * Skips all event-driven validation. Production code must drive the
   * controller through `startDrag` / `updatePosition` / `drop`.
   */
  __forceState(state: DragState, source: DragSource | null, target: DropTarget | null): void {
    this.state = state
    this.source = source
    this.lastTarget = target
  }

  /** @internal Test-only: snapshot of internal state. */
  __inspectState(): { state: DragState; source: DragSource | null; target: DropTarget | null } {
    return {
      state: this.state,
      source: this.source,
      target: this.lastTarget,
    }
  }

  /** @internal Test-only: number of cached children in a container. */
  __cachedChildCount(containerId: string): number {
    return this.cache.getChildren(containerId).length
  }

  /**
   * Reset all state
   */
  private reset(completed: boolean = false): void {
    // End reporter session before clearing state
    this.reporter?.endSession(this.lastTarget, completed)

    this.state = 'idle'
    this.source = null
    this.lastTarget = null
    this.indicator.hide()
    events.emit('grid:active-cell', null)
    this.cache.invalidate()
  }

  /**
   * Report current state for debugging
   */
  report(): ControllerReport {
    return {
      state: this.state,
      source: this.source,
      target: this.lastTarget,
    }
  }

  /**
   * Cleanup - call on unmount
   */
  destroy(): void {
    this.reset(false)
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
