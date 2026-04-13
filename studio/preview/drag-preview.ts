/**
 * Drag Preview - Shows rendered component when dragging over canvas
 *
 * Minimal implementation:
 * - Outside canvas: icon + text (native drag image)
 * - Inside canvas: show rendered component as ghost
 */

import { createLogger } from '../../compiler/utils/logger'
import { getGhostRenderer } from '../panels/components/ghost-renderer'
import type { ComponentItem } from '../panels/components/types'

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
}

/** Full component item for ghost rendering */
let currentComponentItem: ComponentItem | null = null

/** Set current drag data (called by ComponentPanel on dragstart) */
export function setCurrentDragData(data: ComponentDragData | null, item?: ComponentItem): void {
  currentComponentItem = item ?? null
  log.debug('Drag data set:', data?.componentName ?? 'null')
}

/** Get current component item */
export function getCurrentComponentItem(): ComponentItem | null {
  return currentComponentItem
}

/** Clear current drag data (called on dragend) */
export function clearCurrentDragData(): void {
  currentComponentItem = null
  log.debug('Drag data cleared')
}

export interface DragPreviewConfig {
  /** The preview/canvas container */
  container: HTMLElement
}

export class DragPreview {
  private container: HTMLElement
  private ghostElement: HTMLElement | null = null
  private isOverCanvas = false
  private renderingInProgress = false

  // Bound handlers for cleanup
  private boundDragOver: (e: DragEvent) => void
  private boundDragLeave: (e: DragEvent) => void
  private boundDrop: (e: DragEvent) => void

  constructor(config: DragPreviewConfig) {
    this.container = config.container

    this.boundDragOver = this.handleDragOver.bind(this)
    this.boundDragLeave = this.handleDragLeave.bind(this)
    this.boundDrop = this.handleDrop.bind(this)
  }

  attach(): void {
    // Listen on document to catch all drag events, then check if over container
    document.addEventListener('dragover', this.boundDragOver)
    document.addEventListener('drop', this.boundDrop)
    document.addEventListener('dragend', this.boundDragLeave)
    log.info('Attached to document')
  }

  detach(): void {
    document.removeEventListener('dragover', this.boundDragOver)
    document.removeEventListener('drop', this.boundDrop)
    document.removeEventListener('dragend', this.boundDragLeave)
    this.hideGhost()
    log.info('Detached')
  }

  // handleDragEnter is no longer used - we detect entry via handleDragOver

  private handleDragOver(e: DragEvent): void {
    // Check for Mirror component drag - types is a DOMStringList, use contains()
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
      e.dataTransfer.dropEffect = 'copy'

      // Show ghost if just entered
      if (!this.isOverCanvas) {
        this.isOverCanvas = true
        const item = getCurrentComponentItem()
        if (item) {
          this.showGhost(item, e.clientX, e.clientY)
        }
      } else {
        // Update ghost position
        this.updateGhostPosition(e.clientX, e.clientY)
      }
    } else {
      // Left the canvas area
      if (this.isOverCanvas) {
        this.isOverCanvas = false
        this.hideGhost()
      }
    }
  }

  private handleDragLeave(_e: DragEvent): void {
    // Called on dragend - always hide and reset
    this.isOverCanvas = false
    this.hideGhost()
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault()
    this.isOverCanvas = false
    this.hideGhost()
    // No drop functionality yet - just clean up
    log.info('Drop (no-op for now)')
  }

  private showGhost(item: ComponentItem, x: number, y: number): void {
    // Prevent multiple concurrent renders
    if (this.renderingInProgress) {
      return
    }
    this.renderingInProgress = true

    // Create ghost container if not exists
    if (!this.ghostElement) {
      this.ghostElement = document.createElement('div')
      this.ghostElement.id = 'drag-preview-ghost'
      document.body.appendChild(this.ghostElement)
    }

    // Apply base ghost styling
    Object.assign(this.ghostElement.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.9',
      transform: 'translate(-50%, -50%)',
      transition: 'none',
      background: 'transparent',
      border: 'none',
      borderRadius: '0',
      padding: '0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    })

    // Position immediately
    this.updateGhostPosition(x, y)
    this.ghostElement.style.display = 'block'

    // Use GhostRenderer to render the component
    const ghostRenderer = getGhostRenderer()
    ghostRenderer
      .render(item)
      .then(result => {
        // Check if still over canvas and ghost exists
        if (!this.isOverCanvas || !this.ghostElement) {
          this.renderingInProgress = false
          return
        }

        // Clear and append rendered element
        this.ghostElement.innerHTML = ''
        this.ghostElement.appendChild(result.element)

        log.debug('Ghost shown:', item.name)
        this.renderingInProgress = false
      })
      .catch(err => {
        log.warn('Ghost render failed:', err)
        // Show fallback on error
        if (this.ghostElement && this.isOverCanvas) {
          this.ghostElement.textContent = item.name
          Object.assign(this.ghostElement.style, {
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '10px 16px',
            color: 'white',
            fontSize: '14px',
          })
        }
        this.renderingInProgress = false
      })
  }

  private updateGhostPosition(x: number, y: number): void {
    if (this.ghostElement) {
      this.ghostElement.style.left = `${x}px`
      this.ghostElement.style.top = `${y}px`
    }
  }

  private hideGhost(): void {
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
    }
    this.renderingInProgress = false
  }

  dispose(): void {
    this.detach()
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
  }
}

export function createDragPreview(config: DragPreviewConfig): DragPreview {
  return new DragPreview(config)
}
