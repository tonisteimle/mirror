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
  children?: unknown[] // ComponentChild[] from component panel
  mirTemplate?: string
  dataBlock?: { name: string; content: string }
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
  canvasDragGrabOffset = null
  log.debug('Drag data cleared')
}

// =============================================================================
// Canvas Element Drag Data
// =============================================================================
// For dragging existing elements from the canvas

/** Node ID of element being dragged from canvas */
let canvasDragNodeId: string | null = null

/** Grab offset - where user clicked relative to element's top-left */
let canvasDragGrabOffset: { x: number; y: number } | null = null

/** Set canvas drag data (called when dragging from preview) */
export function setCanvasDragData(nodeId: string, grabOffset?: { x: number; y: number }): void {
  canvasDragNodeId = nodeId
  canvasDragGrabOffset = grabOffset ?? null
  log.debug('Canvas drag started:', nodeId, 'grabOffset:', grabOffset)
}

/** Get grab offset for canvas drag */
export function getCanvasDragGrabOffset(): { x: number; y: number } | null {
  return canvasDragGrabOffset
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
  private dropHandled = false // Flag to prevent dragend from cancelling after drop

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
        // Build descriptive log message based on target mode
        let targetDesc: string
        if (target.mode === 'absolute') {
          targetDesc = `at (${target.position.x}, ${target.position.y})`
        } else if (target.mode === 'aligned') {
          targetDesc = `aligned:${target.alignmentProperty}`
        } else {
          targetDesc = `at index ${(target as any).insertionIndex}`
        }

        log.info('Drop:', source.componentName, '→', target.containerId, targetDesc)

        // Emit the event with current drag data
        // Note: For aligned drops, the target contains alignmentProperty instead of insertionIndex
        events.emit('drag:dropped', { source, target, dragData: currentDragData })
      },
    })
  }

  attach(): void {
    // Listen on document to catch all drag events
    document.addEventListener('dragover', this.boundDragOver)
    document.addEventListener('drop', this.boundDrop)
    document.addEventListener('dragleave', this.boundDragLeave)
    document.addEventListener('dragend', this.boundDragEnd)
    // ALSO add drop listener to container with capture phase to ensure we get it first
    this.container.addEventListener('drop', this.boundDrop, true)
    this.container.addEventListener('dragover', this.boundDragOver, true)
    // Escape key to cancel drag
    document.addEventListener('keydown', this.boundKeyDown)
    // Canvas element drag start (delegated)
    this.container.addEventListener('dragstart', this.boundCanvasDragStart)
    // Make canvas elements draggable
    this.makeElementsDraggable()
    // Re-make elements draggable after preview updates
    this.previewRenderedUnsub = events.on('preview:rendered', this.boundMakeElementsDraggable)
    log.info('Attached to document and container')
  }

  detach(): void {
    document.removeEventListener('dragover', this.boundDragOver)
    document.removeEventListener('drop', this.boundDrop)
    document.removeEventListener('dragleave', this.boundDragLeave)
    document.removeEventListener('dragend', this.boundDragEnd)
    document.removeEventListener('keydown', this.boundKeyDown)
    this.container.removeEventListener('dragstart', this.boundCanvasDragStart)
    this.container.removeEventListener('drop', this.boundDrop, true)
    this.container.removeEventListener('dragover', this.boundDragOver, true)
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

    // Calculate grab offset (where user clicked relative to element's top-left)
    const rect = target.getBoundingClientRect()
    const grabOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    // Set drag data
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/mirror-canvas-element', nodeId)

    // Store the node ID and grab offset for later
    setCanvasDragData(nodeId, grabOffset)

    // Hide the default drag image (we'll use our own indicator)
    const emptyImg = document.createElement('img')
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(emptyImg, 0, 0)

    // Make the original element semi-transparent during drag
    target.style.opacity = '0.3'
    target.dataset.dragging = 'true'

    log.debug('Canvas element drag started:', nodeId, 'grabOffset:', grabOffset)
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

  /** Check if drag event contains Mirror drag types */
  private getMirrorDragType(e: DragEvent): 'palette' | 'canvas' | null {
    const types = e.dataTransfer?.types
    if (!types) return null

    const typeArray = Array.from(types)
    if (typeArray.includes('application/mirror-canvas-element')) return 'canvas'
    if (typeArray.includes('application/mirror-component')) return 'palette'
    return null
  }

  /** Check if cursor is over the preview container */
  private isCursorOverContainer(e: DragEvent): boolean {
    const rect = this.container.getBoundingClientRect()
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
  }

  /** Start drag for canvas element (move existing) */
  private startCanvasDrag(): void {
    const nodeId = getCanvasDragNodeId()
    if (!nodeId) return

    const grabOffset = getCanvasDragGrabOffset() ?? undefined
    getDragController().startDrag({ type: 'canvas', nodeId, grabOffset }, this.container)
    log.debug('Canvas element drag started:', nodeId)
  }

  /** Start drag for palette component (insert new) */
  private startPaletteDrag(): void {
    const item = getCurrentComponentItem()
    if (!item) {
      log.warn('startPaletteDrag: No component item available')
      return
    }

    const source = { type: 'palette' as const, componentName: item.name, template: item.template }
    log.info('Drag started:', item.name)
    getDragController().startDrag(source, this.container)
  }

  /** Throttled position update via RAF */
  private schedulePositionUpdate(e: DragEvent): void {
    if (this.rafPending) return

    this.rafPending = true
    requestAnimationFrame(() => {
      getDragController().updatePosition({ x: e.clientX, y: e.clientY })
      this.rafPending = false
    })
  }

  /** Handle drag leaving canvas area */
  private handleLeaveCanvas(): void {
    if (!this.isOverCanvas) return

    this.isOverCanvas = false
    document.body.classList.remove('drag-active')
    getDragController().cancel()
    log.debug('Left canvas, drag cancelled')
  }

  private handleDragOver(e: DragEvent): void {
    const dragType = this.getMirrorDragType(e)
    if (!dragType) {
      return
    }

    if (!this.isCursorOverContainer(e)) {
      this.handleLeaveCanvas()
      return
    }

    e.preventDefault()
    e.dataTransfer!.dropEffect = dragType === 'canvas' ? 'move' : 'copy'

    if (!this.isOverCanvas) {
      this.isOverCanvas = true
      this.dropHandled = false // Reset flag for new drag
      document.body.classList.add('drag-active')
      dragType === 'canvas' ? this.startCanvasDrag() : this.startPaletteDrag()
    }

    this.schedulePositionUpdate(e)
  }

  private handleDragLeave(e: DragEvent): void {
    // Only cancel if we actually left the container
    // (dragleave fires for child elements too)
    // Also check cursor position as relatedTarget can be null for some elements
    const relatedInContainer = this.container.contains(e.relatedTarget as Node)
    const cursorOverContainer = this.isCursorOverContainer(e)

    if (!relatedInContainer && !cursorOverContainer) {
      if (this.isOverCanvas) {
        this.isOverCanvas = false
        document.body.classList.remove('drag-active')
        getDragController().cancel()
      }
    }
  }

  private handleDrop(e: DragEvent): void {
    // Check if this is a Mirror drag type
    const dragType = this.getMirrorDragType(e)
    if (!dragType || !this.isCursorOverContainer(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // Mark drop as handled BEFORE calling drop() to prevent dragend from cancelling
    this.dropHandled = true
    this.isOverCanvas = false
    document.body.classList.remove('drag-active')

    log.info('Drop!')
    getDragController().drop()
  }

  private handleDragEnd(_e: DragEvent): void {
    // Always cleanup on dragend
    this.isOverCanvas = false
    document.body.classList.remove('drag-active')

    // Restore opacity of dragged element
    const draggingElement = this.container.querySelector('[data-dragging="true"]') as HTMLElement
    if (draggingElement) {
      draggingElement.style.opacity = ''
      delete draggingElement.dataset.dragging
    }

    // Only cancel if drop wasn't already handled
    if (!this.dropHandled) {
      getDragController().cancel()
      log.debug('Drag cancelled')
    }

    // Reset flag for next drag
    this.dropHandled = false
    clearCurrentDragData()
  }

  dispose(): void {
    this.detach()
    getDragController().destroy()
  }
}

export function createDragPreview(config: DragPreviewConfig): DragPreview {
  return new DragPreview(config)
}
