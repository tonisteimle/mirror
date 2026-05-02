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
  HitResult,
} from './types'
import type { ControllerReport, Reportable } from './reporter/types'
import { LayoutCache } from './layout-cache'
import { HitDetector } from './hit-detector'
import { InsertionCalculator } from './insertion-calculator'
import { Indicator, type AlignPosition, ALIGN_TO_PROPERTY } from './indicator'
import { DragReporter } from './reporter/drag-reporter'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('DragController')

type DragState = 'idle' | 'dragging'

// Performance tracking (debug only)
const PERF_LOGGING = false

/** Default sizes for palette components when dropping into absolute containers */
const DEFAULT_COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  Button: { width: 100, height: 40 },
  Text: { width: 80, height: 24 },
  Icon: { width: 24, height: 24 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 100 },
  Frame: { width: 200, height: 100 },
  Image: { width: 100, height: 100 },
  Checkbox: { width: 120, height: 24 },
  Switch: { width: 50, height: 24 },
  Slider: { width: 200, height: 24 },
  Divider: { width: 100, height: 2 },
  Spacer: { width: 50, height: 20 },
}

export interface DragControllerCallbacks {
  onDrop: (source: DragSource, target: DropTarget) => Promise<void>
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

    // Branch based on layout type
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
    this.lastTarget = null
  }

  /** Calculate insertion position for hit (caller guarantees hit.layout !== 'absolute') */
  private calculateInsertion(cursor: Point, hit: import('./types').HitResult) {
    let children = this.cache.getChildren(hit.containerId)

    // Bei Canvas-Move: gezogenes Element aus children filtern
    // Sonst wird der Index falsch berechnet, weil nach dem Entfernen
    // des Elements alle folgenden Indizes um 1 nach oben rutschen
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
    // Canvas-Move: Get real element size
    if (this.source?.type === 'canvas' && this.source.nodeId) {
      const rect = this.cache.getRect(this.source.nodeId)
      if (rect) {
        return { width: rect.width, height: rect.height }
      }
    }

    // Palette: Use default component size
    const componentName = (this.source as any)?.componentName ?? 'Frame'
    return DEFAULT_COMPONENT_SIZES[componentName] ?? { width: 100, height: 40 }
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
      log.info('Dropped:', (source as any).componentName || source.type, '→ root (no target)')
      this.reset(true)
      await this.executeDropCallback(source, null)
      return
    }
    log.info('Dropped:', (source as any).componentName || source.type, '→', target.containerId)
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
      await this.callbacks.onDrop(source, target as DropTarget)
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
  // Test API - For programmatic testing without real DOM events
  // =============================================================================

  /**
   * Simulate a complete drop operation for testing purposes.
   * Bypasses normal drag validation and directly executes the drop callback.
   *
   * @param source - The drag source (palette or canvas element)
   * @param target - The drop target (container and insertion index, or position for absolute)
   * @returns Promise that resolves when drop callback completes
   *
   * @example
   * ```typescript
   * const controller = getDragController()
   * // Flex drop (index-based)
   * await controller.simulateDrop(
   *   { type: 'palette', componentName: 'Button', template: 'Button' },
   *   { mode: 'flex', containerId: 'node-1', insertionIndex: 0 }
   * )
   * // Absolute drop (position-based)
   * await controller.simulateDrop(
   *   { type: 'palette', componentName: 'Button', template: 'Button' },
   *   { mode: 'absolute', containerId: 'node-1', position: { x: 100, y: 50 } }
   * )
   * ```
   */
  async simulateDrop(source: DragSource, target: DropTarget): Promise<void> {
    // Temporarily set state for reporter and any listeners
    this.source = source
    this.lastTarget = target
    this.state = 'dragging'

    let targetDesc: string
    if (target.mode === 'absolute') {
      targetDesc = `(${target.position.x}, ${target.position.y})`
    } else if (target.mode === 'aligned') {
      targetDesc = `aligned:${target.alignmentProperty}`
    } else {
      targetDesc = `index ${(target as FlexDropTarget).insertionIndex}`
    }

    log.info(
      '[Test] Simulated drop:',
      (source as any).componentName || source.nodeId,
      '→',
      target.containerId,
      targetDesc
    )

    // Execute the drop callback
    await this.executeDropCallback(source, target)

    // Reset state
    this.reset(true)
  }

  /**
   * Simulate a flex drop (backwards-compatible helper)
   */
  async simulateFlexDrop(
    source: DragSource,
    containerId: string,
    insertionIndex: number
  ): Promise<void> {
    return this.simulateDrop(source, { mode: 'flex', containerId, insertionIndex })
  }

  /**
   * Simulate an absolute drop (position-based)
   */
  async simulateAbsoluteDrop(
    source: DragSource,
    containerId: string,
    position: Point
  ): Promise<void> {
    return this.simulateDrop(source, {
      mode: 'absolute',
      containerId,
      position,
      insertionIndex: this.cache.getChildren(containerId).length,
    })
  }

  /**
   * Set source directly for testing (allows building up state incrementally)
   */
  setTestSource(source: DragSource): void {
    this.source = source
    this.state = 'dragging'
  }

  /**
   * Set target directly for testing (allows building up state incrementally)
   */
  setTestTarget(target: DropTarget): void {
    this.lastTarget = target
  }

  /**
   * Get internal state for test assertions
   */
  getTestState(): { state: DragState; source: DragSource | null; target: DropTarget | null } {
    return {
      state: this.state,
      source: this.source,
      target: this.lastTarget,
    }
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

/**
 * Enable drag reporting from the browser console
 *
 * Usage in browser console:
 *   window.__enableDragReporting()           // Console logging (normal)
 *   window.__enableDragReporting('verbose')  // Console logging (verbose)
 *   window.__enableDragReporting('recording') // Enable recording for JSON export
 *   window.__disableDragReporting()          // Disable
 *   window.__getDragRecordings()             // Get recorded sessions
 *   window.__downloadDragRecordings()        // Download all recordings
 */
export function setupGlobalDragReporting(): void {
  // Avoid re-defining if already set up
  if ((globalThis as any).__enableDragReporting) return

  const { ConsoleAdapter } = require('./reporter/adapters/console-adapter')
  const { RecordingAdapter } = require('./reporter/adapters/recording-adapter')
  const { getDragReporter } = require('./reporter/drag-reporter')

  let recordingAdapter: InstanceType<typeof RecordingAdapter> | null = null

  ;(globalThis as any).__enableDragReporting = (
    mode: 'minimal' | 'normal' | 'verbose' | 'recording' = 'normal'
  ) => {
    const controller = getDragController()
    const reporter = getDragReporter()

    // Set up reporter if not already connected
    if (!controller.getReporter()) {
      controller.setReporter(reporter)
    }

    // Clear existing adapters
    reporter.clearAdapters()

    if (mode === 'recording') {
      recordingAdapter = new RecordingAdapter()
      reporter.addAdapter(recordingAdapter)
      reporter.addAdapter(new ConsoleAdapter({ level: 'minimal' }))
      log.debug('[DragReporting] Recording enabled. Use __getDragRecordings() to access.')
    } else {
      reporter.addAdapter(new ConsoleAdapter({ level: mode }))
      log.debug(`[DragReporting] Console logging enabled (${mode})`)
    }

    reporter.enable()
  }
  ;(globalThis as any).__disableDragReporting = () => {
    const reporter = getDragReporter()
    reporter.disable()
    log.debug('[DragReporting] Disabled')
  }
  ;(globalThis as any).__getDragRecordings = () => {
    if (!recordingAdapter) {
      log.debug(
        '[DragReporting] No recording adapter. Call __enableDragReporting("recording") first.'
      )
      return null
    }
    return recordingAdapter.getRecordings()
  }
  ;(globalThis as any).__downloadDragRecordings = () => {
    if (!recordingAdapter) {
      log.debug(
        '[DragReporting] No recording adapter. Call __enableDragReporting("recording") first.'
      )
      return
    }
    recordingAdapter.downloadAll()
  }
}
