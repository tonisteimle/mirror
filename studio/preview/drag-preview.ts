/**
 * Drag Preview - Shows rendered component when dragging over canvas
 *
 * Minimal implementation:
 * - Outside canvas: invisible (browser default)
 * - Inside canvas: show rendered component as ghost
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('DragPreview')

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
  private boundDragEnter: (e: DragEvent) => void
  private boundDragOver: (e: DragEvent) => void
  private boundDragLeave: (e: DragEvent) => void
  private boundDrop: (e: DragEvent) => void

  constructor(config: DragPreviewConfig) {
    this.container = config.container
    this.renderComponent = config.renderComponent

    this.boundDragEnter = this.handleDragEnter.bind(this)
    this.boundDragOver = this.handleDragOver.bind(this)
    this.boundDragLeave = this.handleDragLeave.bind(this)
    this.boundDrop = this.handleDrop.bind(this)
  }

  attach(): void {
    this.container.addEventListener('dragenter', this.boundDragEnter)
    this.container.addEventListener('dragover', this.boundDragOver)
    this.container.addEventListener('dragleave', this.boundDragLeave)
    this.container.addEventListener('drop', this.boundDrop)
    log.info('Attached')
  }

  detach(): void {
    this.container.removeEventListener('dragenter', this.boundDragEnter)
    this.container.removeEventListener('dragover', this.boundDragOver)
    this.container.removeEventListener('dragleave', this.boundDragLeave)
    this.container.removeEventListener('drop', this.boundDrop)
    this.hideGhost()
    log.info('Detached')
  }

  private handleDragEnter(e: DragEvent): void {
    // Check if this is a component drag
    if (!e.dataTransfer?.types.includes('application/mirror-component')) {
      return
    }

    e.preventDefault()
    this.isOverCanvas = true

    // Get drag data and show ghost
    const data = e.dataTransfer.getData('application/mirror-component')
    if (data) {
      try {
        const dragData = JSON.parse(data)
        this.showGhost(dragData, e.clientX, e.clientY)
      } catch (err) {
        log.warn('Failed to parse drag data:', err)
      }
    }
  }

  private handleDragOver(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes('application/mirror-component')) {
      return
    }

    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    // Update ghost position
    if (this.ghostElement && this.isOverCanvas) {
      this.updateGhostPosition(e.clientX, e.clientY)
    }
  }

  private handleDragLeave(e: DragEvent): void {
    // Only hide if actually leaving the container (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.isOverCanvas = false
      this.hideGhost()
    }
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
        opacity: '0.8',
        transform: 'translate(-50%, -50%)',
        transition: 'none',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '8px 12px',
        color: 'white',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
