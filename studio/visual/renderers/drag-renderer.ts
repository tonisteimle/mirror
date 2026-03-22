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
import {
  GhostRenderer,
  getGhostRenderer,
} from '../../panels/components/ghost-renderer'

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
  /** Component properties for palette ghost (optional) */
  componentProperties?: string
  /** Component text content for palette ghost (optional) */
  componentTextContent?: string
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

  // Ghost renderer for palette items (renders components off-screen)
  private ghostRenderer: GhostRenderer

  // DOM elements
  private indicatorElement: HTMLElement | null = null
  private guideContainer: HTMLElement | null = null
  private alignmentIndicator: HTMLElement | null = null

  // Track current ghost source for smart updates
  private currentGhostSource: { type: 'element' | 'placeholder' | 'rendered'; id?: string; componentName?: string } | null = null

  // Track pending ghost render for palette items
  private pendingGhostRender: Promise<void> | null = null

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

    // Initialize ghost renderer for palette items
    this.ghostRenderer = getGhostRenderer()
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
    this.pendingGhostRender = null
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
   * Supports three modes:
   * 1. Element clone: When sourceElement is provided, creates a visual clone
   * 2. Rendered component: For palette items, renders the component off-screen
   * 3. Placeholder: Fallback when component can't be rendered
   */
  private renderGhost(state: RenderState): void {
    const { ghostRect, sourceElement, componentName, componentProperties, componentTextContent } = state

    if (!ghostRect) {
      this.ghostFactory.dispose()
      this.currentGhostSource = null
      this.pendingGhostRender = null
      return
    }

    // Determine ghost source type
    const sourceId = sourceElement?.dataset.mirrorId

    // Check if we need to recreate the ghost (source changed)
    const needsRecreate =
      !this.ghostFactory.hasGhost() ||
      (sourceElement && this.currentGhostSource?.type !== 'element') ||
      (sourceElement && this.currentGhostSource?.id !== sourceId) ||
      (!sourceElement && componentName && this.currentGhostSource?.componentName !== componentName)

    if (needsRecreate) {
      if (sourceElement) {
        // Create clone ghost from source element (existing canvas element)
        this.ghostFactory.createFromElement(sourceElement)
        this.currentGhostSource = { type: 'element', id: sourceId }
      } else if (componentName) {
        // Palette item: try to use rendered ghost
        this.renderPaletteGhost(componentName, ghostRect, componentProperties, componentTextContent)
      } else {
        // Fallback: placeholder
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

  /**
   * Render ghost for palette item (new component being dragged)
   */
  private renderPaletteGhost(
    componentName: string,
    ghostRect: Rect,
    properties?: string,
    textContent?: string
  ): void {
    // Create a ComponentItem-like object for the ghost renderer
    const item = {
      id: `palette-${componentName}-${properties || ''}-${textContent || ''}`,
      name: componentName,
      category: 'palette',
      template: componentName,
      properties,
      textContent,
      icon: 'box' as const,
    }

    // Try sync render (from cache)
    const cached = this.ghostRenderer.renderSync(item)

    if (cached) {
      // Use the cached rendered element with explicit size
      this.ghostFactory.createFromElement(cached.element, cached.size)
      this.currentGhostSource = { type: 'rendered', componentName }
      return
    }

    // Show placeholder immediately
    const size = { width: ghostRect.width, height: ghostRect.height }
    this.ghostFactory.createPlaceholder(size, {
      componentName,
      showLabel: true,
      borderStyle: 'dashed',
    })
    this.currentGhostSource = { type: 'placeholder', componentName }

    // Render async and update when ready
    this.pendingGhostRender = this.ghostRenderer.render(item).then(rendered => {
      // Only update if we're still dragging the same component and not cleared
      if (this.pendingGhostRender === null) {
        return // Cleared while rendering
      }
      if (this.currentGhostSource?.componentName === componentName) {
        // Get current ghost position before replacing
        const currentGhost = this.ghostFactory.getGhost()
        let currentCenter = { x: 0, y: 0 }
        if (currentGhost) {
          const transform = currentGhost.style.transform
          const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/)
          if (match) {
            const x = parseFloat(match[1])
            const y = parseFloat(match[2])
            const oldWidth = parseFloat(currentGhost.style.width) || 100
            const oldHeight = parseFloat(currentGhost.style.height) || 40
            currentCenter = { x: x + oldWidth / 2, y: y + oldHeight / 2 }
          }
        }

        // Create ghost from rendered element with explicit size
        this.ghostFactory.createFromElement(rendered.element, rendered.size)
        this.currentGhostSource = { type: 'rendered', componentName }

        // Re-apply position centered on the old center
        if (this.ghostFactory.hasGhost()) {
          const newRect = {
            x: currentCenter.x - rendered.size.width / 2,
            y: currentCenter.y - rendered.size.height / 2,
            width: rendered.size.width,
            height: rendered.size.height,
          }
          this.ghostFactory.setRect(newRect)
        }
      }
    }).catch((error: unknown) => {
      // Keep placeholder on error, log for debugging
      console.warn(`[DragRenderer] Failed to render ghost for "${componentName}":`,
        error instanceof Error ? error.message : String(error))
    })
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

    // Clear existing guides efficiently (faster than innerHTML = '')
    while (this.guideContainer.firstChild) {
      this.guideContainer.removeChild(this.guideContainer.firstChild)
    }

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
