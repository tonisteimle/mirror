/**
 * Visual System
 *
 * Visual feedback for drag & drop:
 * - Insertion line (blue) for flex layouts
 * - Ghost indicator (purple) for absolute positioning
 * - Parent outline for container highlighting
 */

import type { VisualHint } from '../types'
import type { VisualSystem as IVisualSystem } from './types'
import { VISUAL_IDS } from './types'

export class VisualSystem implements IVisualSystem {
  private container: HTMLElement

  // Pooled elements (created once, reused)
  private indicatorElement: HTMLElement | null = null
  private parentOutlineElement: HTMLElement | null = null
  private ghostElement: HTMLElement | null = null
  private elementsInitialized = false

  // Test API state tracking
  private _indicatorVisible = false
  private _indicatorRect: { x: number; y: number; width: number; height: number } | null = null
  private _parentOutlineVisible = false
  private _parentOutlineRect: { x: number; y: number; width: number; height: number } | null = null
  private _ghostVisible = false
  private _ghostRect: { x: number; y: number; width: number; height: number } | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Initialize pooled elements (created once, reused across drags)
   */
  private ensureElements(): void {
    if (this.elementsInitialized) return

    // Create indicator element
    this.indicatorElement = document.createElement('div')
    this.indicatorElement.id = VISUAL_IDS.indicator
    this.indicatorElement.className = 'drop-indicator'
    Object.assign(this.indicatorElement.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      display: 'none',
    })
    document.body.appendChild(this.indicatorElement)

    // Create parent outline element
    this.parentOutlineElement = document.createElement('div')
    this.parentOutlineElement.id = VISUAL_IDS.parentOutline
    this.parentOutlineElement.className = 'drop-parent-outline'
    Object.assign(this.parentOutlineElement.style, {
      position: 'fixed',
      backgroundColor: 'transparent',
      border: '2px dashed rgba(59, 130, 246, 0.5)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '9998',
      display: 'none',
    })
    document.body.appendChild(this.parentOutlineElement)

    // Create ghost element
    this.ghostElement = document.createElement('div')
    this.ghostElement.id = VISUAL_IDS.ghost
    this.ghostElement.className = 'drop-ghost'
    Object.assign(this.ghostElement.style, {
      position: 'fixed',
      backgroundColor: 'rgba(139, 92, 246, 0.3)',
      border: '2px dashed #8b5cf6',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '9999',
      boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)',
      display: 'none',
    })
    document.body.appendChild(this.ghostElement)

    this.elementsInitialized = true
  }

  // ==========================================================================
  // Indicator (insertion line)
  // ==========================================================================

  showIndicator(hint: VisualHint): void {
    this.ensureElements()

    // Ghost type is handled separately
    if (hint.type === 'ghost') {
      this.hideIndicator()
      this.showGhostIndicator(hint)
      return
    }

    this.hideGhostIndicator()

    if (!this.indicatorElement) return

    const isLine = hint.type === 'line'
    const isOutline = hint.type === 'outline'

    // Update position and style (no DOM create/remove)
    Object.assign(this.indicatorElement.style, {
      display: 'block',
      left: `${hint.rect.x}px`,
      top: `${hint.rect.y}px`,
      width: `${hint.rect.width}px`,
      height: `${hint.rect.height}px`,
      backgroundColor: isLine ? '#5BA8F5' : 'transparent',
      border: isOutline ? '2px dashed #5BA8F5' : 'none',
      borderRadius: isOutline ? '4px' : '0',
      boxShadow: isLine ? '0 0 4px rgba(59, 130, 246, 0.5)' : 'none',
    })

    // Track state for Test API
    this._indicatorVisible = true
    this._indicatorRect = { ...hint.rect }
  }

  /**
   * Show ghost indicator for absolute positioning
   */
  private showGhostIndicator(hint: VisualHint): void {
    this.ensureElements()

    if (!this.ghostElement) return

    // Use ghostSize if available, otherwise use rect dimensions
    const width = hint.ghostSize?.width ?? hint.rect.width
    const height = hint.ghostSize?.height ?? hint.rect.height

    // Update position and style (no DOM create/remove)
    Object.assign(this.ghostElement.style, {
      display: 'block',
      left: `${hint.rect.x}px`,
      top: `${hint.rect.y}px`,
      width: `${width}px`,
      height: `${height}px`,
    })

    // Track state for Test API
    this._ghostVisible = true
    this._ghostRect = {
      x: hint.rect.x,
      y: hint.rect.y,
      width,
      height,
    }
  }

  /**
   * Hide ghost indicator
   */
  private hideGhostIndicator(): void {
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
    }

    // Track state for Test API
    this._ghostVisible = false
    this._ghostRect = null
  }

  hideIndicator(): void {
    if (this.indicatorElement) {
      this.indicatorElement.style.display = 'none'
    }

    // Track state for Test API
    this._indicatorVisible = false
    this._indicatorRect = null
  }

  // ==========================================================================
  // Parent Outline (shows which container receives the drop)
  // ==========================================================================

  showParentOutline(rect: { x: number; y: number; width: number; height: number }): void {
    this.ensureElements()

    if (!this.parentOutlineElement) return

    // Update position (no DOM create/remove)
    Object.assign(this.parentOutlineElement.style, {
      display: 'block',
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })

    // Track state for Test API
    this._parentOutlineVisible = true
    this._parentOutlineRect = { ...rect }
  }

  hideParentOutline(): void {
    if (this.parentOutlineElement) {
      this.parentOutlineElement.style.display = 'none'
    }

    // Track state for Test API
    this._parentOutlineVisible = false
    this._parentOutlineRect = null
  }

  // ==========================================================================
  // Legacy methods (no-op for compatibility)
  // ==========================================================================

  showGhost(): void {}
  updateGhost(): void {}
  hideGhost(): void {}
  showSnapGuides(): void {}
  hideSnapGuides(): void {}
  showZoneOverlay(): void {}
  hideZoneOverlay(): void {}

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  clear(): void {
    this.hideIndicator()
    this.hideParentOutline()
    this.hideGhostIndicator()
  }

  dispose(): void {
    this.clear()

    // Remove pooled elements from DOM
    if (this.indicatorElement) {
      this.indicatorElement.remove()
      this.indicatorElement = null
    }
    if (this.parentOutlineElement) {
      this.parentOutlineElement.remove()
      this.parentOutlineElement = null
    }
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
    this.elementsInitialized = false
  }

  // ==========================================================================
  // Test API
  // ==========================================================================

  /**
   * Get current visual state for test assertions
   * @returns Object containing visibility and rect information
   */
  getState(): {
    indicatorVisible: boolean
    indicatorRect: { x: number; y: number; width: number; height: number } | null
    parentOutlineVisible: boolean
    parentOutlineRect: { x: number; y: number; width: number; height: number } | null
    ghostVisible: boolean
    ghostRect: { x: number; y: number; width: number; height: number } | null
  } {
    return {
      indicatorVisible: this._indicatorVisible,
      indicatorRect: this._indicatorRect ? { ...this._indicatorRect } : null,
      parentOutlineVisible: this._parentOutlineVisible,
      parentOutlineRect: this._parentOutlineRect ? { ...this._parentOutlineRect } : null,
      ghostVisible: this._ghostVisible,
      ghostRect: this._ghostRect ? { ...this._ghostRect } : null,
    }
  }
}

/**
 * Create a VisualSystem instance
 */
export function createVisualSystem(container: HTMLElement): VisualSystem {
  return new VisualSystem(container)
}
