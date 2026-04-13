/**
 * Drag Preview - Shows rendered component when dragging over canvas
 *
 * Minimal implementation:
 * - Outside canvas: icon + text (native drag image)
 * - Inside canvas: show rendered component as ghost
 */

import { createLogger } from '../../compiler/utils/logger'

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

let currentDragData: ComponentDragData | null = null

/** Set current drag data (called by ComponentPanel on dragstart) */
export function setCurrentDragData(data: ComponentDragData | null): void {
  currentDragData = data
  log.debug('Drag data set:', data?.componentName ?? 'null')
}

/** Get current drag data */
export function getCurrentDragData(): ComponentDragData | null {
  return currentDragData
}

/** Clear current drag data (called on dragend) */
export function clearCurrentDragData(): void {
  currentDragData = null
  log.debug('Drag data cleared')
}

export interface DragPreviewConfig {
  /** The preview/canvas container */
  container: HTMLElement
  /** Function to render Mirror code to HTML */
  renderComponent: (code: string) => HTMLElement | null
}

export class DragPreview {
  private container: HTMLElement
  private renderComponent: (code: string) => HTMLElement | null
  private ghostElement: HTMLElement | null = null
  private isOverCanvas = false

  // Bound handlers for cleanup
  private boundDragOver: (e: DragEvent) => void
  private boundDragLeave: (e: DragEvent) => void
  private boundDrop: (e: DragEvent) => void

  constructor(config: DragPreviewConfig) {
    this.container = config.container
    this.renderComponent = config.renderComponent

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
        const dragData = getCurrentDragData()
        if (dragData) {
          this.showGhost(dragData, e.clientX, e.clientY)
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

  private showGhost(
    dragData: { componentName: string; properties?: string },
    x: number,
    y: number
  ): void {
    // Create ghost if not exists
    if (!this.ghostElement) {
      this.ghostElement = document.createElement('div')
      this.ghostElement.id = 'drag-preview-ghost'
      document.body.appendChild(this.ghostElement)
    }

    // Try to render the component
    const code = this.buildCode(dragData)
    const rendered = this.renderComponent(code)

    if (rendered) {
      // Rendered component - minimal ghost styling
      Object.assign(this.ghostElement.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '10000',
        opacity: '0.85',
        transform: 'translate(-50%, -50%)',
        transition: 'none',
        // No box styling - let the component show naturally
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        padding: '0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      })
      this.ghostElement.innerHTML = ''
      this.ghostElement.appendChild(rendered)
    } else {
      // Fallback: show component name with box styling
      Object.assign(this.ghostElement.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '10000',
        opacity: '0.9',
        transform: 'translate(-50%, -50%)',
        transition: 'none',
        background: '#2563eb',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        padding: '10px 16px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
        whiteSpace: 'nowrap',
      })
      this.ghostElement.textContent = dragData.componentName
    }

    this.updateGhostPosition(x, y)
    this.ghostElement.style.display = 'block'

    log.debug('Ghost shown:', dragData.componentName)
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
  }

  private buildCode(dragData: {
    componentName: string
    properties?: string
    textContent?: string
  }): string {
    let code = dragData.componentName
    if (dragData.properties) {
      code += ` ${dragData.properties}`
    }
    if (dragData.textContent) {
      code += ` "${dragData.textContent}"`
    }
    return code
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
