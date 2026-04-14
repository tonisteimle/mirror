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
  log.debug('Drag data cleared')
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

  constructor(config: DragPreviewConfig) {
    this.container = config.container

    this.boundDragOver = this.handleDragOver.bind(this)
    this.boundDragLeave = this.handleDragLeave.bind(this)
    this.boundDrop = this.handleDrop.bind(this)
    this.boundDragEnd = this.handleDragEnd.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)

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
    log.info('Attached to document')
  }

  detach(): void {
    document.removeEventListener('dragover', this.boundDragOver)
    document.removeEventListener('drop', this.boundDrop)
    document.removeEventListener('dragleave', this.boundDragLeave)
    document.removeEventListener('dragend', this.boundDragEnd)
    document.removeEventListener('keydown', this.boundKeyDown)

    getDragController().cancel()
    log.info('Detached')
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
    // Check for Mirror component drag
    const types = e.dataTransfer?.types
    const hasMirrorComponent =
      types &&
      (types.includes?.('application/mirror-component') ||
        Array.from(types).includes('application/mirror-component'))

    if (!hasMirrorComponent) {
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
      e.dataTransfer!.dropEffect = 'copy'

      const controller = getDragController()

      // Start drag if just entered canvas
      if (!this.isOverCanvas) {
        this.isOverCanvas = true
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
          log.debug('Drag started:', item.name)
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
