/**
 * DragRenderer - Renders visual feedback during drag operations
 *
 * Handles:
 * - Ghost element rendering
 * - Drop indicator (insertion line)
 * - Alignment zone indicator
 * - Smart guide lines
 *
 * Pure rendering - receives data, updates DOM.
 */

import type { Rect, Point } from '../models/coordinate'
import type { Guide } from '../models/snap'
import type { AlignmentZoneResult } from '../models/alignment-zone'

// ============================================================================
// Types
// ============================================================================

export interface RenderState {
  /** Ghost element rect */
  ghostRect: Rect | null
  /** Drop indicator rect (insertion line) */
  indicatorRect: Rect | null
  /** Indicator direction */
  indicatorDirection: 'horizontal' | 'vertical'
  /** Alignment zone (for empty containers) */
  alignmentZone: AlignmentZoneResult | null
  /** Smart guides */
  guides: Guide[]
  /** Whether drag is active */
  isActive: boolean
}

export interface DragRendererConfig {
  /** Ghost opacity (0-1) */
  ghostOpacity?: number
  /** Indicator color */
  indicatorColor?: string
  /** Guide color */
  guideColor?: string
  /** Z-index for overlay elements */
  zIndex?: number
}

// ============================================================================
// DragRenderer
// ============================================================================

export class DragRenderer {
  private container: HTMLElement
  private config: Required<DragRendererConfig>

  // DOM elements
  private ghostElement: HTMLElement | null = null
  private indicatorElement: HTMLElement | null = null
  private guideContainer: HTMLElement | null = null
  private alignmentIndicator: HTMLElement | null = null

  constructor(container: HTMLElement, config: DragRendererConfig = {}) {
    this.container = container
    this.config = {
      ghostOpacity: config.ghostOpacity ?? 0.5,
      indicatorColor: config.indicatorColor ?? '#3b82f6',
      guideColor: config.guideColor ?? '#ec4899',
      zIndex: config.zIndex ?? 10000,
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Update all visual elements based on state
   */
  render(state: RenderState): void {
    if (!state.isActive) {
      this.clear()
      return
    }

    this.renderGhost(state.ghostRect)
    this.renderIndicator(state.indicatorRect, state.indicatorDirection)
    this.renderGuides(state.guides)
    this.renderAlignmentZone(state.alignmentZone)
  }

  /**
   * Clear all visual elements
   */
  clear(): void {
    this.removeGhost()
    this.removeIndicator()
    this.removeGuides()
    this.removeAlignmentIndicator()
  }

  /**
   * Dispose renderer
   */
  dispose(): void {
    this.clear()
  }

  // --------------------------------------------------------------------------
  // Ghost Rendering
  // --------------------------------------------------------------------------

  private renderGhost(rect: Rect | null): void {
    if (!rect) {
      this.removeGhost()
      return
    }

    if (!this.ghostElement) {
      this.ghostElement = this.createGhostElement()
    }

    Object.assign(this.ghostElement.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  private createGhostElement(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mirror-drag-ghost'
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      opacity: String(this.config.ghostOpacity),
      border: '2px dashed #3b82f6',
      borderRadius: '4px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      zIndex: String(this.config.zIndex),
      transition: 'none',
    })
    document.body.appendChild(el)
    return el
  }

  private removeGhost(): void {
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
  }

  // --------------------------------------------------------------------------
  // Indicator Rendering (Insertion Line)
  // --------------------------------------------------------------------------

  private renderIndicator(rect: Rect | null, direction: 'horizontal' | 'vertical'): void {
    if (!rect) {
      this.removeIndicator()
      return
    }

    if (!this.indicatorElement) {
      this.indicatorElement = this.createIndicatorElement()
    }

    const thickness = 2
    const isHorizontal = direction === 'horizontal'

    Object.assign(this.indicatorElement.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: isHorizontal ? `${rect.width}px` : `${thickness}px`,
      height: isHorizontal ? `${thickness}px` : `${rect.height}px`,
    })
  }

  private createIndicatorElement(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mirror-drop-indicator'
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      backgroundColor: this.config.indicatorColor,
      borderRadius: '1px',
      zIndex: String(this.config.zIndex + 1),
      boxShadow: `0 0 4px ${this.config.indicatorColor}`,
    })
    document.body.appendChild(el)
    return el
  }

  private removeIndicator(): void {
    if (this.indicatorElement) {
      this.indicatorElement.remove()
      this.indicatorElement = null
    }
  }

  // --------------------------------------------------------------------------
  // Guide Rendering
  // --------------------------------------------------------------------------

  private renderGuides(guides: Guide[]): void {
    if (guides.length === 0) {
      this.removeGuides()
      return
    }

    if (!this.guideContainer) {
      this.guideContainer = this.createGuideContainer()
    }

    // Clear existing guides
    this.guideContainer.innerHTML = ''

    // Create guide lines
    guides.forEach(guide => {
      const line = this.createGuideLine(guide)
      this.guideContainer!.appendChild(line)
    })
  }

  private createGuideContainer(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mirror-guide-container'
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: String(this.config.zIndex + 2),
    })
    document.body.appendChild(el)
    return el
  }

  private createGuideLine(guide: Guide): HTMLElement {
    const el = document.createElement('div')
    el.className = `mirror-guide mirror-guide-${guide.axis}`

    const thickness = 1

    if (guide.axis === 'x') {
      // Vertical line
      Object.assign(el.style, {
        position: 'absolute',
        left: `${guide.position}px`,
        top: `${guide.start}px`,
        width: `${thickness}px`,
        height: `${guide.end - guide.start}px`,
        backgroundColor: this.config.guideColor,
      })
    } else {
      // Horizontal line
      Object.assign(el.style, {
        position: 'absolute',
        left: `${guide.start}px`,
        top: `${guide.position}px`,
        width: `${guide.end - guide.start}px`,
        height: `${thickness}px`,
        backgroundColor: this.config.guideColor,
      })
    }

    return el
  }

  private removeGuides(): void {
    if (this.guideContainer) {
      this.guideContainer.remove()
      this.guideContainer = null
    }
  }

  // --------------------------------------------------------------------------
  // Alignment Zone Rendering
  // --------------------------------------------------------------------------

  private renderAlignmentZone(zone: AlignmentZoneResult | null): void {
    if (!zone) {
      this.removeAlignmentIndicator()
      return
    }

    if (!this.alignmentIndicator) {
      this.alignmentIndicator = this.createAlignmentIndicator()
    }

    // Show a small indicator at the zone position
    const size = 8
    Object.assign(this.alignmentIndicator.style, {
      left: `${zone.indicatorPosition.x - size / 2}px`,
      top: `${zone.indicatorPosition.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    })
  }

  private createAlignmentIndicator(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'mirror-alignment-indicator'
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      backgroundColor: this.config.indicatorColor,
      borderRadius: '50%',
      zIndex: String(this.config.zIndex + 1),
      boxShadow: `0 0 8px ${this.config.indicatorColor}`,
    })
    document.body.appendChild(el)
    return el
  }

  private removeAlignmentIndicator(): void {
    if (this.alignmentIndicator) {
      this.alignmentIndicator.remove()
      this.alignmentIndicator = null
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDragRenderer(
  container: HTMLElement,
  config?: DragRendererConfig
): DragRenderer {
  return new DragRenderer(container, config)
}
