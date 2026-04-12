/**
 * Drag Preview
 *
 * Shows a floating preview of the dragged component following the cursor.
 * Works alongside insertion lines and drop indicators for complete visual feedback.
 */

import type { Point } from '../types'

// ============================================
// Configuration
// ============================================

export interface DragPreviewConfig {
  /** Opacity of the preview (0-1, default: 0.8) */
  opacity?: number
  /** Offset from cursor (default: { x: 16, y: 16 }) */
  offset?: Point
  /** Scale factor (default: 1.0) */
  scale?: number
  /** Whether to show a shadow (default: true) */
  showShadow?: boolean
  /** Maximum width (default: 200px) */
  maxWidth?: number
  /** Maximum height (default: 200px) */
  maxHeight?: number
}

const DEFAULT_CONFIG: Required<DragPreviewConfig> = {
  opacity: 0.85,
  offset: { x: 16, y: 16 },
  scale: 1.0,
  showShadow: true,
  maxWidth: 200,
  maxHeight: 200,
}

// ============================================
// Drag Preview Manager
// ============================================

export class DragPreviewManager {
  private previewElement: HTMLElement | null = null
  private config: Required<DragPreviewConfig>
  private isActive = false
  private currentCursor: Point | null = null
  private animationFrameId: number | null = null

  constructor(config: DragPreviewConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Show a drag preview with the given element content
   */
  show(content: HTMLElement | string, size: { width: number; height: number }): void {
    this.ensurePreviewElement()

    if (!this.previewElement) return

    // Clear previous content
    this.previewElement.innerHTML = ''

    // Add new content
    if (typeof content === 'string') {
      // Simple text preview
      this.previewElement.textContent = content
    } else {
      // Clone the element to avoid removing from original location
      const clone = content.cloneNode(true) as HTMLElement
      // Reset any positioning styles from the original
      clone.style.position = 'static'
      clone.style.left = ''
      clone.style.top = ''
      clone.style.transform = ''
      this.previewElement.appendChild(clone)
    }

    // Calculate scaled size with constraints
    const scaledWidth = Math.min(size.width * this.config.scale, this.config.maxWidth)
    const scaledHeight = Math.min(size.height * this.config.scale, this.config.maxHeight)

    // Apply size and styles
    Object.assign(this.previewElement.style, {
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      opacity: String(this.config.opacity),
      display: 'block',
      transform: `scale(${this.config.scale})`,
      transformOrigin: 'top left',
    })

    this.isActive = true

    // Start position update loop
    this.startUpdateLoop()
  }

  /**
   * Update the preview position based on cursor location
   */
  update(cursor: Point): void {
    this.currentCursor = cursor
  }

  /**
   * Hide and remove the preview
   */
  hide(): void {
    this.isActive = false
    this.currentCursor = null
    this.stopUpdateLoop()

    if (this.previewElement) {
      this.previewElement.style.display = 'none'
      this.previewElement.innerHTML = ''
    }
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    this.hide()

    if (this.previewElement) {
      this.previewElement.remove()
      this.previewElement = null
    }
  }

  /**
   * Check if preview is currently active
   */
  isShowing(): boolean {
    return this.isActive
  }

  // ============================================
  // Private Methods
  // ============================================

  private ensurePreviewElement(): void {
    if (this.previewElement) return

    this.previewElement = document.createElement('div')
    this.previewElement.id = 'drag-preview'
    this.previewElement.className = 'drag-preview'

    Object.assign(this.previewElement.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000', // Above other visual elements
      display: 'none',
      overflow: 'hidden',
      borderRadius: '4px',
      backgroundColor: 'rgba(26, 26, 26, 0.95)',
      border: '1px solid rgba(91, 168, 245, 0.5)',
      boxShadow: this.config.showShadow
        ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(91, 168, 245, 0.2)'
        : 'none',
    })

    document.body.appendChild(this.previewElement)
  }

  private startUpdateLoop(): void {
    if (this.animationFrameId !== null) return

    const tick = () => {
      if (!this.isActive) return

      this.updatePosition()
      this.animationFrameId = requestAnimationFrame(tick)
    }

    this.animationFrameId = requestAnimationFrame(tick)
  }

  private stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private updatePosition(): void {
    if (!this.previewElement || !this.currentCursor) return

    const x = this.currentCursor.x + this.config.offset.x
    const y = this.currentCursor.y + this.config.offset.y

    // Use transform for smooth positioning
    this.previewElement.style.left = `${x}px`
    this.previewElement.style.top = `${y}px`
  }
}

// ============================================
// Factory Function
// ============================================

export function createDragPreview(config?: DragPreviewConfig): DragPreviewManager {
  return new DragPreviewManager(config)
}

// ============================================
// Singleton for simple use cases
// ============================================

let instance: DragPreviewManager | null = null

export function getDragPreviewManager(): DragPreviewManager {
  if (!instance) {
    instance = new DragPreviewManager()
  }
  return instance
}

export function resetDragPreviewManager(): void {
  instance?.dispose()
  instance = null
}
