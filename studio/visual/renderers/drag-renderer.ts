/**
 * DragRenderer - Renders visual feedback during drag operations
 *
 * Handles:
 * - Ghost element rendering (via GhostFactory)
 * - Drop indicator (insertion line)
 * - Alignment zone indicator
 * - Smart guide lines
 *
 * Pure rendering - receives data, updates DOM.
 *
 * Ghost Types:
 * - Clone ghost: Full visual copy of dragged element (for element drags)
 * - Placeholder ghost: Styled box with size preview (for palette drags)
 */

import type { Rect, Point } from '../models/coordinate'
import type { Guide } from '../models/snap'
import type { AlignmentZoneResult } from '../models/alignment-zone'
import {
  GhostFactory,
  createGhostFactory,
  getDefaultSize,
  type GhostSource,
  type PlaceholderConfig,
} from './ghost-factory'
import {
  Z_INDEX_DROP_INDICATOR,
  Z_INDEX_ACTIVE_INDICATOR,
  Z_INDEX_DISTANCE_LABEL,
  Z_INDEX_GUIDES,
} from '../constants/z-index'

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
  /** Source element for clone ghost (optional) */
  sourceElement?: HTMLElement
  /** Component name for placeholder ghost (optional) */
  componentName?: string
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

  // Ghost factory for unified ghost creation
  private ghostFactory: GhostFactory

  // DOM elements
  private indicatorElement: HTMLElement | null = null
  private guideContainer: HTMLElement | null = null
  private alignmentIndicator: HTMLElement | null = null

  // Track current ghost source for smart updates
  private currentGhostSource: { type: 'element' | 'placeholder'; id?: string } | null = null

  constructor(container: HTMLElement, config: DragRendererConfig = {}) {
    this.container = container
    this.config = {
      ghostOpacity: config.ghostOpacity ?? 0.7,
      indicatorColor: config.indicatorColor ?? '#3b82f6',
      guideColor: config.guideColor ?? '#ec4899',
      zIndex: config.zIndex ?? Z_INDEX_DROP_INDICATOR,
    }

    // Initialize ghost factory with renderer config
    this.ghostFactory = createGhostFactory({
      opacity: this.config.ghostOpacity,
      zIndex: this.config.zIndex,
      borderColor: this.config.indicatorColor,
    })
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

    this.renderGhost(state)
    this.renderIndicator(state.indicatorRect, state.indicatorDirection)
    this.renderGuides(state.guides)
    this.renderAlignmentZone(state.alignmentZone)
  }

  /**
   * Clear all visual elements
   */
  clear(): void {
    this.ghostFactory.dispose()
    this.currentGhostSource = null
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

  /**
   * Get the current ghost element (for external positioning updates)
   */
  getGhostElement(): HTMLElement | null {
    return this.ghostFactory.getGhost()
  }

  // --------------------------------------------------------------------------
  // Ghost Rendering
  // --------------------------------------------------------------------------

  /**
   * Render ghost element with smart source detection
   *
   * Supports two modes:
   * 1. Element clone: When sourceElement is provided, creates a visual clone
   * 2. Placeholder: When only rect is provided, creates a styled placeholder
   */
  private renderGhost(state: RenderState): void {
    const { ghostRect, sourceElement, componentName } = state

    if (!ghostRect) {
      this.ghostFactory.dispose()
      this.currentGhostSource = null
      return
    }

    // Determine ghost source type
    const sourceType = sourceElement ? 'element' : 'placeholder'
    const sourceId = sourceElement?.dataset.mirrorId

    // Check if we need to recreate the ghost (source changed)
    const needsRecreate =
      !this.ghostFactory.hasGhost() ||
      this.currentGhostSource?.type !== sourceType ||
      (sourceType === 'element' && this.currentGhostSource?.id !== sourceId)

    if (needsRecreate) {
      if (sourceElement) {
        // Create clone ghost from source element
        this.ghostFactory.createFromElement(sourceElement)
        this.currentGhostSource = { type: 'element', id: sourceId }
      } else {
        // Create placeholder ghost
        const size = { width: ghostRect.width, height: ghostRect.height }
        this.ghostFactory.createPlaceholder(size, {
          componentName,
          showLabel: !!componentName,
          borderStyle: 'dashed',
        })
        this.currentGhostSource = { type: 'placeholder' }
      }
    }

    // Update ghost position and size
    this.ghostFactory.setRect(ghostRect)
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
      zIndex: String(Z_INDEX_ACTIVE_INDICATOR),
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
      zIndex: String(Z_INDEX_GUIDES),
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
      zIndex: String(Z_INDEX_ACTIVE_INDICATOR),
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
