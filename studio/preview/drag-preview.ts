/**
 * Drag Preview v3 - Fast, stable drag with insertion indicator
 *
 * Uses the v3 architecture:
 * - LayoutCache: O(1) rect lookups (built once per drag)
 * - HitDetector: Find flex container under cursor
 * - InsertionCalculator: Pure geometry for insertion position
 * - Indicator: Single DOM element, repositioned
 * - DragController: Orchestrates everything
 *
 * Performance:
 * - Drag Move: ~0.5ms (no DOM reads, cached values)
 * - Drop: Code modification via callback
 */

import { createLogger } from '../../compiler/utils/logger'
import { events } from '../core'
import type { ComponentItem } from '../panels/components/types'
import { getDragController, type DragSource, type DropTarget } from './drag'

const log = createLogger('DragPreview')

// =============================================================================
// Global Drag Data Store
// =============================================================================
// Browser security prevents reading drag data during dragenter/dragover.
// We store the data globally when drag starts and read it here.

export interface ComponentDragData {
  componentId?: string
  componentName: string
  properties?: string
  textContent?: string
  fromComponentPanel?: boolean
  children?: string
}

/** Full component item for rendering */
let currentComponentItem: ComponentItem | null = null

/** Raw drag data for drop handling */
let currentDragData: ComponentDragData | null = null

/** Set current drag data (called by ComponentPanel on dragstart) */
export function setCurrentDragData(data: ComponentDragData | null, item?: ComponentItem): void {
  currentDragData = data
  currentComponentItem = item ?? null
  log.debug('Drag data set:', data?.componentName ?? 'null')
}

/** Get current component item */
export function getCurrentComponentItem(): ComponentItem | null {
  return currentComponentItem
}

/** Get current drag data */
export function getCurrentDragData(): ComponentDragData | null {
  return currentDragData
}

/** Clear current drag data (called on dragend) */
export function clearCurrentDragData(): void {
  currentDragData = null
  currentComponentItem = null
  canvasDragNodeId = null
  log.debug('Drag data cleared')
}

// =============================================================================
// Canvas Element Drag Data
// =============================================================================
// For dragging existing elements from the canvas

/** Node ID of element being dragged from canvas */
let canvasDragNodeId: string | null = null

/** Set canvas drag data (called when dragging from preview) */
export function setCanvasDragData(nodeId: string): void {
  canvasDragNodeId = nodeId
  log.debug('Canvas drag started:', nodeId)
}

/** Get canvas drag node ID */
export function getCanvasDragNodeId(): string | null {
  return canvasDragNodeId
}

// =============================================================================
// DragPreview Class
// =============================================================================

export interface DragPreviewConfig {
  /** The preview/canvas container */
  container: HTMLElement
}

export class DragPreview {
  private container: HTMLElement
  private isOverCanvas = false
  private rafPending = false

  // Bound handlers for cleanup
  private boundDragOver: (e: DragEvent) => void
  private boundDragLeave: (e: DragEvent) => void
  private boundDrop: (e: DragEvent) => void
  private boundDragEnd: (e: DragEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundCanvasDragStart: (e: DragEvent) => void
  private boundMakeElementsDraggable: () => void
  private previewRenderedUnsub: (() => void) | null = null

  constructor(config: DragPreviewConfig) {
    this.container = config.container

    this.boundDragOver = this.handleDragOver.bind(this)
    this.boundDragLeave = this.handleDragLeave.bind(this)
    this.boundDrop = this.handleDrop.bind(this)
    this.boundDragEnd = this.handleDragEnd.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundCanvasDragStart = this.handleCanvasDragStart.bind(this)
    this.boundMakeElementsDraggable = this.makeElementsDraggable.bind(this)

    // Setup DragController callbacks
    this.setupDragController()
  }

  private setupDragController(): void {
    const controller = getDragController()

    controller.setCallbacks({
      onDrop: async (source: DragSource, target: DropTarget) => {
        log.info(
          'Drop:',
          source.componentName,
          '→',
          target.containerId,
          'at index',
          target.insertionIndex
        )

        // Emit event for app.js to handle code modification
        events.emit('drag:dropped', {
          source,
          target,
          dragData: currentDragData,
        })
      },
    })
  }

  attach(): void {
    // Listen on document to catch all drag events
    document.addEventListener('dragover', this.boundDragOver)
    document.addEventListener('drop', this.boundDrop)
    document.addEventListener('dragleave', this.boundDragLeave)
    document.addEventListener('dragend', this.boundDragEnd)
    // Escape key to cancel drag
    document.addEventListener('keydown', this.boundKeyDown)
    // Canvas element drag start (delegated)
    this.container.addEventListener('dragstart', this.boundCanvasDragStart)
    // Make canvas elements draggable
    this.makeElementsDraggable()
    // Re-make elements draggable after preview updates
    this.previewRenderedUnsub = events.on('preview:rendered', this.boundMakeElementsDraggable)
    log.info('Attached to document')
  }

  detach(): void {
    document.removeEventListener('dragover', this.boundDragOver)
    document.removeEventListener('drop', this.boundDrop)
    document.removeEventListener('dragleave', this.boundDragLeave)
    document.removeEventListener('dragend', this.boundDragEnd)
    document.removeEventListener('keydown', this.boundKeyDown)
    this.container.removeEventListener('dragstart', this.boundCanvasDragStart)
    // Unsubscribe from preview:rendered
    if (this.previewRenderedUnsub) {
      this.previewRenderedUnsub()
      this.previewRenderedUnsub = null
    }

    getDragController().cancel()
    log.info('Detached')
  }

  /**
   * Make all elements with data-mirror-id draggable
   * Called on attach and can be called after preview updates
   */
  makeElementsDraggable(): void {
    const elements = this.container.querySelectorAll('[data-mirror-id]')
    for (const el of elements) {
      if (el instanceof HTMLElement) {
        el.draggable = true
      }
    }
    log.debug(`Made ${elements.length} elements draggable`)
  }

  /**
   * Handle dragstart on canvas elements
   */
  private handleCanvasDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement
    const nodeId = target.getAttribute('data-mirror-id')

    if (!nodeId || !e.dataTransfer) return

    // Set drag data
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/mirror-canvas-element', nodeId)

    // Store the node ID for later
    setCanvasDragData(nodeId)

    log.debug('Canvas element drag started:', nodeId)
  }

  /**
   * Handle Escape key to cancel drag
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isOverCanvas) {
      e.preventDefault()
      this.isOverCanvas = false
      getDragController().cancel()
      log.debug('Drag cancelled via Escape')
    }
  }

  private handleDragOver(e: DragEvent): void {
    // Check for Mirror drag (palette component or canvas element)
    const types = e.dataTransfer?.types
    const typeArray = types ? Array.from(types) : []

    const hasPaletteComponent =
      typeArray.includes('application/mirror-component') ||
      types?.includes?.('application/mirror-component')

    const hasCanvasElement =
      typeArray.includes('application/mirror-canvas-element') ||
      types?.includes?.('application/mirror-canvas-element')

    if (!hasPaletteComponent && !hasCanvasElement) {
      return
    }

    // Check if cursor is over the preview container
    const rect = this.container.getBoundingClientRect()
    const isOver =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom

    if (isOver) {
      e.preventDefault()
      e.dataTransfer!.dropEffect = hasCanvasElement ? 'move' : 'copy'

      const controller = getDragController()

      // Start drag if just entered canvas
      if (!this.isOverCanvas) {
        this.isOverCanvas = true

        if (hasCanvasElement) {
          // Canvas element drag (move existing)
          const nodeId = getCanvasDragNodeId()
          if (nodeId) {
            controller.startDrag(
              {
                type: 'canvas',
                nodeId,
              },
              this.container
            )
            log.debug('Canvas element drag started:', nodeId)
          }
        } else {
          // Palette component drag (insert new)
          const item = getCurrentComponentItem()
          if (item) {
            controller.startDrag(
              {
                type: 'palette',
                componentName: item.name,
                template: item.template,
              },
              this.container
            )
            log.debug('Palette drag started:', item.name)
          }
        }
      }

      // Throttle position updates with RAF for 60fps
      if (!this.rafPending) {
        this.rafPending = true
        requestAnimationFrame(() => {
          controller.updatePosition({ x: e.clientX, y: e.clientY })
          this.rafPending = false
        })
      }
    } else {
      // Left the canvas area
      if (this.isOverCanvas) {
        this.isOverCanvas = false
        getDragController().cancel()
        log.debug('Left canvas, drag cancelled')
      }
    }
  }

  private handleDragLeave(e: DragEvent): void {
    // Only cancel if we actually left the container
    // (dragleave fires for child elements too)
    if (!this.container.contains(e.relatedTarget as Node)) {
      if (this.isOverCanvas) {
        this.isOverCanvas = false
        getDragController().cancel()
        log.debug('DragLeave, drag cancelled')
      }
    }
  }

  private handleDrop(e: DragEvent): void {
    // Check if drop is on our container
    const rect = this.container.getBoundingClientRect()
    const isOver =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom

    if (!isOver) return

    e.preventDefault()
    e.stopPropagation()

    this.isOverCanvas = false

    // Execute drop via controller (triggers onDrop callback)
    getDragController().drop()

    log.info('Drop executed')
  }

  private handleDragEnd(_e: DragEvent): void {
    // Always cleanup on dragend
    this.isOverCanvas = false
    getDragController().cancel()
    clearCurrentDragData()
    log.debug('DragEnd, cleanup')
  }

  dispose(): void {
    this.detach()
    getDragController().destroy()
  }
}

export function createDragPreview(config: DragPreviewConfig): DragPreview {
  return new DragPreview(config)
}
