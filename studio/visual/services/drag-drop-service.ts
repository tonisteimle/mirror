/**
 * DragDropService - Orchestrates drag-drop with models, controller, and renderer
 *
 * This service:
 * - Creates and manages the DragController
 * - Creates and manages the DragRenderer
 * - Connects to CodeModifier for actual code changes
 * - Provides a simple API for the studio
 */

import { DragController, createDragController, type DragMoveState } from '../controllers/drag-controller'
import { DragRenderer, createDragRenderer, type RenderState } from '../renderers/drag-renderer'
import type { DragResult, DragSource, Point, Rect } from '../models/drag-state'
import type { DropZone } from '../models/drop-zone'
import type { AlignmentZoneResult } from '../models/alignment-zone'
import { events } from '../../core/events'

// ============================================================================
// Types
// ============================================================================

export interface DragDropServiceConfig {
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number
  /** Enable smart guides */
  enableGuides?: boolean
  /** Enable 9-zone alignment */
  enableAlignmentZones?: boolean
}

export interface DragDropCallbacks {
  /** Called when a drop completes - return the code modification result */
  onDrop?: (result: DropResultInfo) => void
  /** Called when drag starts */
  onDragStart?: () => void
  /** Called when drag ends (success or cancel) */
  onDragEnd?: () => void
}

export interface DropResultInfo {
  /** Source of the drag */
  source: DragSource
  /** Target node ID */
  targetNodeId: string
  /** Placement relative to target */
  placement: 'before' | 'after' | 'inside' | 'absolute'
  /** Insertion index for flex containers */
  insertionIndex?: number
  /** Absolute position for positioned containers */
  absolutePosition?: Point
  /** Alignment for empty flex containers */
  alignment?: AlignmentZoneResult
  /** Whether this is a duplicate (Alt-drag) */
  isDuplicate: boolean
  /** Delta from original position */
  delta: Point
}

// ============================================================================
// DragDropService
// ============================================================================

export class DragDropService {
  private container: HTMLElement
  private controller: DragController
  private renderer: DragRenderer
  private config: DragDropServiceConfig
  private callbacks: DragDropCallbacks

  private currentMoveState: DragMoveState | null = null

  // Space+Drag support
  private spacePressed: boolean = false
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundSpaceMouseDown: (e: MouseEvent) => void

  constructor(
    container: HTMLElement,
    config: DragDropServiceConfig = {},
    callbacks: DragDropCallbacks = {}
  ) {
    this.container = container
    this.config = config
    this.callbacks = callbacks

    // Create renderer
    this.renderer = createDragRenderer(container)

    // Create controller with callbacks
    this.controller = createDragController(
      container,
      {
        gridSize: config.gridSize,
        enableGuides: config.enableGuides ?? true,
        enableAlignmentZones: config.enableAlignmentZones ?? true,
      },
      {
        onDragStart: this.handleDragStart.bind(this),
        onDragMove: this.handleDragMove.bind(this),
        onDragEnd: this.handleDragEnd.bind(this),
        onDragCancel: this.handleDragCancel.bind(this),
      }
    )

    // Setup Space+Drag mode
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.boundSpaceMouseDown = this.handleSpaceMouseDown.bind(this)

    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
    this.container.addEventListener('mousedown', this.boundSpaceMouseDown, true)
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Start dragging an existing element
   */
  startElementDrag(element: HTMLElement, event: MouseEvent): void {
    this.controller.startElementDrag(element, event)
  }

  /**
   * Start dragging from palette
   */
  startPaletteDrag(
    componentName: string,
    event: MouseEvent,
    options?: { properties?: string; textContent?: string; defaultSize?: { width: number; height: number } }
  ): void {
    this.controller.startPaletteDrag(componentName, event, options)
  }

  /**
   * Make an element draggable
   * Returns cleanup function
   */
  makeElementDraggable(element: HTMLElement): () => void {
    const handleMouseDown = (e: MouseEvent) => {
      // Only left mouse button
      if (e.button !== 0) return

      // Don't start drag if clicking on resize handles etc
      const target = e.target as HTMLElement
      if (target.closest('.resize-handle, .selection-handle')) return

      e.preventDefault()
      this.startElementDrag(element, e)
    }

    element.addEventListener('mousedown', handleMouseDown)

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
    }
  }

  /**
   * Make a palette item draggable
   * Returns cleanup function
   */
  makePaletteItemDraggable(
    element: HTMLElement,
    componentName: string,
    options?: { properties?: string; textContent?: string; defaultSize?: { width: number; height: number } }
  ): () => void {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      this.startPaletteDrag(componentName, e, options)
    }

    element.addEventListener('mousedown', handleMouseDown)

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
    }
  }

  /**
   * Update grid size
   */
  setGridSize(size: number): void {
    this.controller.setGridSize(size)
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.controller.isDragging()
  }

  /**
   * Cancel current drag
   */
  cancel(): void {
    this.controller.cancel()
  }

  /**
   * Dispose service
   */
  dispose(): void {
    document.removeEventListener('keydown', this.boundKeyDown)
    document.removeEventListener('keyup', this.boundKeyUp)
    this.container.removeEventListener('mousedown', this.boundSpaceMouseDown, true)

    this.controller.dispose()
    this.renderer.dispose()
  }

  // --------------------------------------------------------------------------
  // Space+Drag Mode (like Figma)
  // --------------------------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !e.repeat) {
      this.spacePressed = true
      // Change cursor to indicate move mode
      this.container.style.cursor = 'grab'
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacePressed = false
      this.container.style.cursor = ''
    }
  }

  private handleSpaceMouseDown(e: MouseEvent): void {
    // Only activate when Space is held
    if (!this.spacePressed) return
    if (e.button !== 0) return

    // Find the element under cursor with data-mirror-id
    const target = e.target as HTMLElement
    const element = target.closest('[data-mirror-id]') as HTMLElement
    if (!element) return

    // Prevent default behavior (text selection, etc.)
    e.preventDefault()
    e.stopPropagation()

    // Change cursor to grabbing
    this.container.style.cursor = 'grabbing'

    // Start dragging
    this.startElementDrag(element, e)
  }

  // --------------------------------------------------------------------------
  // Controller Callbacks
  // --------------------------------------------------------------------------

  private handleDragStart(source: DragSource): void {
    this.callbacks.onDragStart?.()
  }

  private handleDragMove(state: DragMoveState): void {
    this.currentMoveState = state

    // Find source element for clone ghost (element drags only)
    let sourceElement: HTMLElement | undefined
    let componentName: string | undefined

    if (state.source.type === 'element') {
      // Find the element by its node ID
      sourceElement = this.container.querySelector(
        `[data-mirror-id="${state.source.nodeId}"]`
      ) as HTMLElement | undefined
    } else {
      // Palette drag - use component name for placeholder label
      componentName = state.source.componentName
    }

    // Build render state with source information
    const renderState: RenderState = {
      ghostRect: state.ghostRect,
      indicatorRect: state.dropZone?.indicatorRect ?? null,
      indicatorDirection: this.getIndicatorDirection(state),
      alignmentZone: state.alignmentZone,
      guides: state.guides,
      isActive: true,
      sourceElement,
      componentName,
    }

    this.renderer.render(renderState)
  }

  private handleDragEnd(result: DragResult): void {
    // Clear visuals
    this.renderer.clear()

    // Reset cursor (in case Space+Drag was used)
    this.container.style.cursor = this.spacePressed ? 'grab' : ''

    // Build drop result
    if (result.target) {
      const dropResult: DropResultInfo = {
        source: result.source,
        targetNodeId: result.target.nodeId,
        placement: result.target.placement,
        insertionIndex: result.target.insertionIndex,
        absolutePosition: result.target.absolutePosition,
        alignment: this.currentMoveState?.alignmentZone ?? undefined,
        isDuplicate: result.isDuplicate,
        delta: result.delta,
      }

      this.callbacks.onDrop?.(dropResult)

      // Emit move:completed event for element moves (not palette drags)
      if (result.source.type === 'element') {
        // Convert placement to move:completed format
        const position = result.target.placement === 'absolute' ? 'inside' : result.target.placement

        events.emit('move:completed', {
          nodeId: result.source.nodeId,
          targetId: result.target.nodeId,
          position: position as 'before' | 'after' | 'inside',
          layoutTransition: result.target.absolutePosition ? {
            from: 'flex', // We assume flex → absolute for now (could be enhanced)
            to: 'absolute',
            absolutePosition: result.target.absolutePosition,
          } : undefined,
        })
      }
    }

    this.currentMoveState = null
    this.callbacks.onDragEnd?.()
  }

  private handleDragCancel(): void {
    this.renderer.clear()
    // Reset cursor
    this.container.style.cursor = this.spacePressed ? 'grab' : ''
    this.currentMoveState = null
    this.callbacks.onDragEnd?.()
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getIndicatorDirection(state: DragMoveState): 'horizontal' | 'vertical' {
    // Use direction from dropZone (set by calculatePlacement based on container layout)
    // For before/after placement: indicator is perpendicular to container direction
    // - horizontal container → vertical indicator line (between siblings)
    // - vertical container → horizontal indicator line (between siblings)
    if (state.dropZone?.placement === 'before' || state.dropZone?.placement === 'after') {
      const containerDirection = state.dropZone.direction || 'vertical'
      // Indicator is perpendicular to layout direction
      return containerDirection === 'horizontal' ? 'vertical' : 'horizontal'
    }
    // For inside/absolute placement, use container direction directly
    return state.dropZone?.direction || 'vertical'
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDragDropService(
  container: HTMLElement,
  config?: DragDropServiceConfig,
  callbacks?: DragDropCallbacks
): DragDropService {
  return new DragDropService(container, config, callbacks)
}
