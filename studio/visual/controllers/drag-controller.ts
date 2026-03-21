/**
 * DragController - Thin DOM layer for drag operations
 *
 * This controller handles only:
 * - DOM event binding (mousedown, mousemove, mouseup)
 * - Reading element rects from DOM
 * - Delegating to pure models for calculations
 * - Passing model output to renderers
 *
 * All business logic is in the models (testable without DOM).
 */

import {
  DragState,
  createDragState,
  type DragSource,
  type DragTarget,
  type DragResult,
  type DragConfig,
  type Point,
  type Rect,
} from '../models/drag-state'

import {
  findDropZone,
  calculatePlacement,
  type DropCandidate,
  type DropZone,
  type Placement,
} from '../models/drop-zone'

import {
  calculateSnap,
  createSnapContext,
  type SnapResult,
  type SnapConfig,
} from '../models/snap'

import {
  detectAlignmentZone,
  type AlignmentZoneResult,
  type ContainerDirection,
} from '../models/alignment-zone'

import {
  clientToCanvas,
  createCoordinateContext,
  type CoordinateContext,
} from '../models/coordinate'

import {
  calculateDropPosition,
} from '../models/coordinate-calculator'

// ============================================================================
// Types
// ============================================================================

export interface DragControllerConfig {
  /** Drag threshold in pixels */
  threshold?: number
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number
  /** Enable smart guides */
  enableGuides?: boolean
  /** Enable 9-zone alignment for empty containers */
  enableAlignmentZones?: boolean
}

export interface DragCallbacks {
  /** Called when drag starts (after threshold exceeded) */
  onDragStart?: (source: DragSource) => void
  /** Called during drag with current state */
  onDragMove?: (state: DragMoveState) => void
  /** Called when drag completes successfully */
  onDragEnd?: (result: DragResult) => void
  /** Called when drag is cancelled */
  onDragCancel?: () => void
  /** Called when drag fails to start (e.g., no data-mirror-id) */
  onError?: (error: string) => void
}

export interface DragMoveState {
  /** Ghost rect for rendering */
  ghostRect: Rect
  /** Current drop zone (if any) */
  dropZone: DropZone | null
  /** Alignment zone for empty containers */
  alignmentZone: AlignmentZoneResult | null
  /** Active snap guides */
  guides: SnapResult['guides']
  /** Whether snap is active */
  isSnapped: boolean
  /** Source of the drag (for ghost rendering) */
  source: DragSource
}

export interface ContainerInfo {
  nodeId: string
  rect: Rect
  direction: ContainerDirection
  isPositioned: boolean
  hasChildren: boolean
  childRects: Array<{ nodeId: string; rect: Rect }>
}

// ============================================================================
// DragController
// ============================================================================

export class DragController {
  private container: HTMLElement
  private state: DragState
  private config: DragControllerConfig
  private callbacks: DragCallbacks
  private coordinateContext: CoordinateContext

  // Bound event handlers
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void

  // Cached data during drag
  private containerInfo: ContainerInfo[] = []
  private siblingRects: Array<{ nodeId: string; rect: Rect }> = []

  // Track if onDragStart was called
  private dragStartNotified: boolean = false

  constructor(
    container: HTMLElement,
    config: DragControllerConfig = {},
    callbacks: DragCallbacks = {}
  ) {
    this.container = container
    this.config = config
    this.callbacks = callbacks

    // Create drag state with config
    this.state = createDragState({
      threshold: config.threshold ?? 3,
      gridSize: config.gridSize ?? 0,
    })

    // Initialize coordinate context (will be updated on drag start)
    this.coordinateContext = createCoordinateContext()

    // Bind event handlers
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundMouseUp = this.handleMouseUp.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Start drag from an existing element
   */
  startElementDrag(element: HTMLElement, mouseEvent: MouseEvent): void {
    const nodeId = element.dataset.mirrorId
    if (!nodeId) {
      const error = 'Element has no data-mirror-id'
      console.warn('[DragController]', error)
      this.callbacks.onError?.(error)
      return
    }

    // Get element rect
    const domRect = element.getBoundingClientRect()
    const rect: Rect = {
      x: domRect.left,
      y: domRect.top,
      width: domRect.width,
      height: domRect.height,
    }

    // Calculate grab offset (where in the element the user clicked)
    const grabOffset: Point = {
      x: mouseEvent.clientX - domRect.left,
      y: mouseEvent.clientY - domRect.top,
    }

    const source: DragSource = {
      type: 'element',
      nodeId,
      rect,
      grabOffset,
    }

    this.startDrag(source, { x: mouseEvent.clientX, y: mouseEvent.clientY })
  }

  /**
   * Start drag from palette (new component)
   */
  startPaletteDrag(
    componentName: string,
    mouseEvent: MouseEvent,
    options: { properties?: string; textContent?: string; defaultSize?: { width: number; height: number } } = {}
  ): void {
    const source: DragSource = {
      type: 'palette',
      componentName,
      properties: options.properties,
      textContent: options.textContent,
      defaultSize: options.defaultSize,
    }

    this.startDrag(source, { x: mouseEvent.clientX, y: mouseEvent.clientY })
  }

  /**
   * Update grid size during drag (e.g., from settings)
   */
  setGridSize(size: number): void {
    this.state.setGridSize(size)
  }

  /**
   * Toggle duplicate mode (Alt key)
   */
  setDuplicate(duplicate: boolean): void {
    this.state.setDuplicate(duplicate)
  }

  /**
   * Cancel current drag
   */
  cancel(): void {
    if (!this.state.isIdle()) {
      this.state.cancel()
      this.cleanup()
      this.callbacks.onDragCancel?.()
    }
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state.isDragging()
  }

  /**
   * Get current state snapshot (for debugging/testing)
   */
  getSnapshot() {
    return this.state.getSnapshot()
  }

  /**
   * Dispose controller
   */
  dispose(): void {
    this.cancel()
  }

  // --------------------------------------------------------------------------
  // Internal: Drag Lifecycle
  // --------------------------------------------------------------------------

  private startDrag(source: DragSource, position: Point): void {
    // Update coordinate context
    this.updateCoordinateContext()

    // Cache container info for drop zone detection
    this.cacheContainerInfo()

    // Start drag state
    if (!this.state.start(source, position)) {
      return
    }

    // Attach global listeners
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
    document.addEventListener('keydown', this.boundKeyDown)
  }

  private handleMouseMove(e: MouseEvent): void {
    const position: Point = { x: e.clientX, y: e.clientY }

    // Update state
    const moved = this.state.move(position)
    if (!moved) return

    // Check for Alt key (duplicate mode)
    this.state.setDuplicate(e.altKey)

    // If we just started dragging, notify once
    if (this.state.isDragging() && !this.dragStartNotified) {
      this.dragStartNotified = true
      const source = this.state.getSource()
      if (source) {
        this.callbacks.onDragStart?.(source)
      }
    }

    // Only process if actively dragging
    if (!this.state.isDragging()) return

    // Calculate drop zone and visual state
    const moveState = this.calculateMoveState(position)

    // Update target in state
    if (moveState.dropZone) {
      this.state.setTarget({
        nodeId: moveState.dropZone.nodeId,
        placement: moveState.dropZone.placement,
        insertionIndex: moveState.dropZone.insertionIndex,
        absolutePosition: moveState.dropZone.absolutePosition,
      })
    } else {
      this.state.setTarget(null)
    }

    // Notify callback
    this.callbacks.onDragMove?.(moveState)
  }

  private handleMouseUp(e: MouseEvent): void {
    const result = this.state.complete()

    this.cleanup()

    if (result) {
      this.callbacks.onDragEnd?.(result)
    } else {
      this.callbacks.onDragCancel?.()
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel()
    }
  }

  private cleanup(): void {
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)
    document.removeEventListener('keydown', this.boundKeyDown)

    this.containerInfo = []
    this.siblingRects = []
    this.dragStartNotified = false

    this.state.reset()
  }

  // --------------------------------------------------------------------------
  // Internal: Calculations (delegated to models)
  // --------------------------------------------------------------------------

  private calculateMoveState(cursorPosition: Point): DragMoveState {
    // Get ghost rect from state
    const ghostRect = this.state.calculateGhostRect()
    const source = this.state.getSource()
    if (!ghostRect || !source) {
      return {
        ghostRect: { x: 0, y: 0, width: 0, height: 0 },
        dropZone: null,
        alignmentZone: null,
        guides: [],
        isSnapped: false,
        source: { type: 'palette', componentName: 'Box' },
      }
    }

    // Find drop zone
    const candidates = this.buildDropCandidates()
    let dropZone = findDropZone(cursorPosition, candidates)

    // CRITICAL FIX: For absolute placement, use ghost position instead of cursor position
    // The ghost position already accounts for grab offset, so the element lands where the ghost is shown
    if (dropZone?.placement === 'absolute') {
      const container = this.containerInfo.find(c => c.nodeId === dropZone!.nodeId)
      if (container) {
        // Use centralized calculator for position calculation
        // Ghost position relative to container = where element should be placed
        const dropPos = calculateDropPosition(ghostRect, container.rect)
        dropZone = {
          ...dropZone,
          absolutePosition: dropPos,
        }
      }
    }

    // Check for alignment zone (empty flex container)
    let alignmentZone: AlignmentZoneResult | null = null
    if (this.config.enableAlignmentZones && dropZone) {
      const container = this.containerInfo.find(c => c.nodeId === dropZone.nodeId)
      if (container && !container.isPositioned && !container.hasChildren) {
        alignmentZone = detectAlignmentZone(cursorPosition, container.rect, container.direction)
      }
    }

    // Calculate snap (for positioned containers)
    let guides: SnapResult['guides'] = []
    let isSnapped = false
    let finalGhostRect = ghostRect

    if (this.config.enableGuides && dropZone) {
      const container = this.containerInfo.find(c => c.nodeId === dropZone.nodeId)
      if (container?.isPositioned) {
        const snapContext = createSnapContext(
          ghostRect,
          this.siblingRects,
          container.rect,
          { threshold: 5 }
        )
        const snapResult = calculateSnap(
          { x: ghostRect.x, y: ghostRect.y },
          snapContext
        )

        if (snapResult.snapped) {
          finalGhostRect = {
            ...ghostRect,
            x: snapResult.position.x,
            y: snapResult.position.y,
          }
          guides = snapResult.guides
          isSnapped = true
        }
      }
    }

    return {
      ghostRect: finalGhostRect,
      dropZone,
      alignmentZone,
      guides,
      source: this.state.getSource()!,
      isSnapped,
    }
  }

  private buildDropCandidates(): DropCandidate[] {
    // Get the drag source node ID to exclude it from candidates
    // (an element cannot be dropped onto itself)
    const source = this.state.getSource()
    const sourceNodeId = source?.type === 'element' ? source.nodeId : undefined

    return this.containerInfo
      .filter(info => info.nodeId !== sourceNodeId) // Exclude drag source
      .map(info => ({
        nodeId: info.nodeId,
        rect: info.rect,
        acceptsChildren: true, // TODO: Check component type
        isPositioned: info.isPositioned,
        direction: info.direction === 'horizontal' ? 'horizontal' : 'vertical',
        childRects: info.childRects,
      }))
  }

  // --------------------------------------------------------------------------
  // Internal: DOM Queries (the only DOM-dependent parts)
  // --------------------------------------------------------------------------

  private updateCoordinateContext(): void {
    const containerRect = this.container.getBoundingClientRect()
    this.coordinateContext = createCoordinateContext(
      { x: containerRect.left, y: containerRect.top },
      1, // TODO: Get actual scale from zoom
      { x: this.container.scrollLeft, y: this.container.scrollTop }
    )
  }

  private cacheContainerInfo(): void {
    this.containerInfo = []

    // Query all elements with mirror-id
    const elements = this.container.querySelectorAll('[data-mirror-id]')

    elements.forEach(el => {
      const element = el as HTMLElement
      const nodeId = element.dataset.mirrorId
      if (!nodeId) return

      const domRect = element.getBoundingClientRect()
      const rect: Rect = {
        x: domRect.left,
        y: domRect.top,
        width: domRect.width,
        height: domRect.height,
      }

      // Detect container type
      const style = getComputedStyle(element)
      const isPositioned = style.position === 'relative' || style.position === 'absolute'
      const direction: ContainerDirection =
        style.flexDirection === 'row' ? 'horizontal' : 'vertical'

      // Get children
      const childRects: Array<{ nodeId: string; rect: Rect }> = []
      element.querySelectorAll(':scope > [data-mirror-id]').forEach(child => {
        const childEl = child as HTMLElement
        const childId = childEl.dataset.mirrorId
        if (childId) {
          const childDomRect = childEl.getBoundingClientRect()
          childRects.push({
            nodeId: childId,
            rect: {
              x: childDomRect.left,
              y: childDomRect.top,
              width: childDomRect.width,
              height: childDomRect.height,
            },
          })
        }
      })

      this.containerInfo.push({
        nodeId,
        rect,
        direction,
        isPositioned,
        hasChildren: childRects.length > 0,
        childRects,
      })
    })
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDragController(
  container: HTMLElement,
  config?: DragControllerConfig,
  callbacks?: DragCallbacks
): DragController {
  return new DragController(container, config, callbacks)
}
