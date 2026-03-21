/**
 * DropIndicator - Visual indicators for drop operations
 *
 * Provides crystal-clear visual feedback for different drop scenarios:
 * - Insertion lines for sibling positioning (flex containers)
 * - Container highlights for reparenting
 * - Crosshair + position labels for absolute positioning
 *
 * Integrates with OverlayManager for consistent overlay handling.
 */

import {
  Z_INDEX_DROP_INDICATOR,
  Z_INDEX_ACTIVE_INDICATOR,
  Z_INDEX_DISTANCE_LABEL,
} from './constants/z-index'

export interface DropIndicatorConfig {
  container: HTMLElement
  /** Line color (default: #3B82F6 - blue) */
  color?: string
  /** Line thickness (default: 2px) */
  lineWidth?: number
  /** Dot size at line endpoints (default: 6px) */
  dotSize?: number
}

/**
 * DropIndicator class
 */
export class DropIndicator {
  private container: HTMLElement
  private config: Required<DropIndicatorConfig>

  // Visual elements
  private lineElement: HTMLElement | null = null
  private startDotElement: HTMLElement | null = null
  private endDotElement: HTMLElement | null = null
  private highlightElement: HTMLElement | null = null
  private crosshairHElement: HTMLElement | null = null
  private crosshairVElement: HTMLElement | null = null
  private positionLabelElement: HTMLElement | null = null

  // State
  private highlightedElement: HTMLElement | null = null
  private originalHighlightStyles: Record<string, string> | null = null

  constructor(config: DropIndicatorConfig) {
    this.container = config.container
    this.config = {
      container: config.container,
      color: config.color ?? '#3B82F6',
      lineWidth: config.lineWidth ?? 2,
      dotSize: config.dotSize ?? 6,
    }

    // Ensure container has positioning
    const style = window.getComputedStyle(this.container)
    if (style.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.createIndicatorElements()
  }

  // ============================================================================
  // Insertion Line (for flex/flow containers)
  // ============================================================================

  /**
   * Show insertion line at a position relative to an element
   *
   * @param targetRect - Bounding rect of the target element
   * @param placement - 'before' or 'after' the target
   * @param orientation - 'horizontal' (vertical line) or 'vertical' (horizontal line)
   */
  showInsertionLine(
    targetRect: DOMRect,
    placement: 'before' | 'after',
    orientation: 'horizontal' | 'vertical'
  ): void {
    this.hideContainerHighlight()
    this.hideCrosshair()
    this.hidePositionLabel()
    this.ensureIndicatorElements()

    if (!this.lineElement || !this.startDotElement || !this.endDotElement) return

    const containerRect = this.container.getBoundingClientRect()
    const { lineWidth, dotSize, color } = this.config
    const dotOffset = Math.floor(dotSize / 2)

    if (orientation === 'horizontal') {
      // Horizontal insertion = VERTICAL line (between horizontal siblings)
      const lineX = placement === 'before'
        ? targetRect.left - containerRect.left - lineWidth / 2
        : targetRect.right - containerRect.left - lineWidth / 2

      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${lineX}px`,
        top: `${targetRect.top - containerRect.top}px`,
        width: `${lineWidth}px`,
        height: `${targetRect.height}px`,
        backgroundColor: color,
      })

      // Position dots at top and bottom of line
      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${lineX - dotOffset + lineWidth / 2}px`,
        top: `${targetRect.top - containerRect.top - dotOffset}px`,
      })

      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${lineX - dotOffset + lineWidth / 2}px`,
        top: `${targetRect.bottom - containerRect.top - dotOffset}px`,
      })
    } else {
      // Vertical insertion = HORIZONTAL line (between vertical siblings)
      const lineY = placement === 'before'
        ? targetRect.top - containerRect.top - lineWidth / 2
        : targetRect.bottom - containerRect.top - lineWidth / 2

      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${targetRect.left - containerRect.left}px`,
        top: `${lineY}px`,
        width: `${targetRect.width}px`,
        height: `${lineWidth}px`,
        backgroundColor: color,
      })

      // Position dots at left and right of line
      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${targetRect.left - containerRect.left - dotOffset}px`,
        top: `${lineY - dotOffset + lineWidth / 2}px`,
      })

      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${targetRect.right - containerRect.left - dotOffset}px`,
        top: `${lineY - dotOffset + lineWidth / 2}px`,
      })
    }
  }

  /**
   * Show insertion line centered in a gap between two elements
   */
  showInsertionLineInGap(
    beforeRect: DOMRect | null,
    afterRect: DOMRect | null,
    parentRect: DOMRect,
    isHorizontal: boolean
  ): void {
    this.hideContainerHighlight()
    this.hideCrosshair()
    this.hidePositionLabel()
    this.ensureIndicatorElements()

    if (!this.lineElement || !this.startDotElement || !this.endDotElement) return

    const containerRect = this.container.getBoundingClientRect()
    const { lineWidth, dotSize, color } = this.config
    const dotOffset = Math.floor(dotSize / 2)

    if (isHorizontal) {
      // Horizontal layout = VERTICAL line
      let lineX: number

      if (beforeRect && afterRect) {
        // Center in gap between siblings
        lineX = (beforeRect.right + afterRect.left) / 2 - containerRect.left
      } else if (beforeRect) {
        // After last sibling
        lineX = beforeRect.right - containerRect.left + 4
      } else if (afterRect) {
        // Before first sibling
        lineX = afterRect.left - containerRect.left - 4
      } else {
        // Empty container - center
        lineX = parentRect.left - containerRect.left + parentRect.width / 2
      }

      const top = parentRect.top - containerRect.top
      const height = parentRect.height

      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${lineX - lineWidth / 2}px`,
        top: `${top}px`,
        width: `${lineWidth}px`,
        height: `${height}px`,
        backgroundColor: color,
      })

      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${lineX - dotOffset}px`,
        top: `${top - dotOffset}px`,
      })

      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${lineX - dotOffset}px`,
        top: `${top + height - dotOffset}px`,
      })
    } else {
      // Vertical layout = HORIZONTAL line
      let lineY: number

      if (beforeRect && afterRect) {
        lineY = (beforeRect.bottom + afterRect.top) / 2 - containerRect.top
      } else if (beforeRect) {
        lineY = beforeRect.bottom - containerRect.top + 4
      } else if (afterRect) {
        lineY = afterRect.top - containerRect.top - 4
      } else {
        lineY = parentRect.top - containerRect.top + parentRect.height / 2
      }

      const left = parentRect.left - containerRect.left
      const width = parentRect.width

      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${left}px`,
        top: `${lineY - lineWidth / 2}px`,
        width: `${width}px`,
        height: `${lineWidth}px`,
        backgroundColor: color,
      })

      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${left - dotOffset}px`,
        top: `${lineY - dotOffset}px`,
      })

      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${left + width - dotOffset}px`,
        top: `${lineY - dotOffset}px`,
      })
    }
  }

  /**
   * Hide the insertion line
   */
  hideInsertionLine(): void {
    if (this.lineElement) this.lineElement.style.display = 'none'
    if (this.startDotElement) this.startDotElement.style.display = 'none'
    if (this.endDotElement) this.endDotElement.style.display = 'none'
  }

  // ============================================================================
  // Container Highlight (for reparenting / 'inside' drops)
  // ============================================================================

  /**
   * Show container highlight for 'inside' drops
   */
  showContainerHighlight(element: HTMLElement): void {
    this.hideInsertionLine()
    this.hideCrosshair()
    this.hidePositionLabel()

    // Store original styles
    if (this.highlightedElement !== element) {
      this.clearHighlight()

      this.originalHighlightStyles = {
        backgroundColor: element.style.backgroundColor,
        outline: element.style.outline,
        outlineOffset: element.style.outlineOffset,
        transition: element.style.transition,
      }

      this.highlightedElement = element
    }

    // Apply highlight styles
    Object.assign(element.style, {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      outline: `2px solid ${this.config.color}`,
      outlineOffset: '-2px',
      transition: 'all 80ms ease-out',
    })
  }

  /**
   * Hide container highlight
   */
  hideContainerHighlight(): void {
    this.clearHighlight()
  }

  private clearHighlight(): void {
    if (this.highlightedElement && this.originalHighlightStyles) {
      Object.assign(this.highlightedElement.style, this.originalHighlightStyles)
    }
    this.highlightedElement = null
    this.originalHighlightStyles = null
  }

  // ============================================================================
  // Crosshair (for absolute positioning)
  // ============================================================================

  /**
   * Show crosshair at a position within a container
   */
  showCrosshair(x: number, y: number, containerRect: DOMRect): void {
    this.hideInsertionLine()
    this.hideContainerHighlight()
    this.ensureCrosshairElements()

    if (!this.crosshairHElement || !this.crosshairVElement) return

    const localContainerRect = this.container.getBoundingClientRect()
    const offsetX = containerRect.left - localContainerRect.left
    const offsetY = containerRect.top - localContainerRect.top

    // Horizontal crosshair line (full width of container)
    Object.assign(this.crosshairHElement.style, {
      display: 'block',
      left: `${offsetX}px`,
      top: `${offsetY + y}px`,
      width: `${containerRect.width}px`,
      height: '1px',
      backgroundColor: this.config.color,
      opacity: '0.5',
    })

    // Vertical crosshair line (full height of container)
    Object.assign(this.crosshairVElement.style, {
      display: 'block',
      left: `${offsetX + x}px`,
      top: `${offsetY}px`,
      width: '1px',
      height: `${containerRect.height}px`,
      backgroundColor: this.config.color,
      opacity: '0.5',
    })
  }

  /**
   * Hide crosshair
   */
  hideCrosshair(): void {
    if (this.crosshairHElement) this.crosshairHElement.style.display = 'none'
    if (this.crosshairVElement) this.crosshairVElement.style.display = 'none'
  }

  // ============================================================================
  // Position Label (for absolute positioning)
  // ============================================================================

  /**
   * Show position label with coordinates
   */
  showPositionLabel(x: number, y: number): void {
    this.ensurePositionLabelElement()

    if (!this.positionLabelElement) return

    this.positionLabelElement.textContent = `x: ${x}, y: ${y}`

    // Position label near crosshair intersection, offset slightly
    // Use the crosshair position to determine placement
    if (this.crosshairHElement && this.crosshairVElement) {
      const crosshairLeft = parseFloat(this.crosshairVElement.style.left) || 0
      const crosshairTop = parseFloat(this.crosshairHElement.style.top) || 0

      Object.assign(this.positionLabelElement.style, {
        display: 'block',
        left: `${crosshairLeft + 8}px`,
        top: `${crosshairTop + 8}px`,
      })
    }
  }

  /**
   * Hide position label
   */
  hidePositionLabel(): void {
    if (this.positionLabelElement) this.positionLabelElement.style.display = 'none'
  }

  // ============================================================================
  // General
  // ============================================================================

  /**
   * Hide all indicators
   */
  hideAll(): void {
    this.hideInsertionLine()
    this.hideContainerHighlight()
    this.hideCrosshair()
    this.hidePositionLabel()
  }

  /**
   * Dispose all elements
   */
  dispose(): void {
    this.hideAll()

    // Remove created elements
    this.lineElement?.remove()
    this.startDotElement?.remove()
    this.endDotElement?.remove()
    this.crosshairHElement?.remove()
    this.crosshairVElement?.remove()
    this.positionLabelElement?.remove()
    this.highlightElement?.remove()

    this.lineElement = null
    this.startDotElement = null
    this.endDotElement = null
    this.crosshairHElement = null
    this.crosshairVElement = null
    this.positionLabelElement = null
    this.highlightElement = null
  }

  // ============================================================================
  // Private: Element Creation
  // ============================================================================

  private createIndicatorElements(): void {
    const { color, lineWidth, dotSize } = this.config

    // Insertion line
    this.lineElement = document.createElement('div')
    this.lineElement.className = 'mirror-drop-line'
    Object.assign(this.lineElement.style, {
      position: 'absolute',
      backgroundColor: color,
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_DROP_INDICATOR),
      transition: 'all 60ms ease-out',
      borderRadius: '1px',
      display: 'none',
    })
    this.container.appendChild(this.lineElement)

    // Start dot
    this.startDotElement = document.createElement('div')
    this.startDotElement.className = 'mirror-drop-dot'
    Object.assign(this.startDotElement.style, {
      position: 'absolute',
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      backgroundColor: color,
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_ACTIVE_INDICATOR),
      transition: 'all 60ms ease-out',
      display: 'none',
    })
    this.container.appendChild(this.startDotElement)

    // End dot
    this.endDotElement = document.createElement('div')
    this.endDotElement.className = 'mirror-drop-dot'
    Object.assign(this.endDotElement.style, {
      position: 'absolute',
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      backgroundColor: color,
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_ACTIVE_INDICATOR),
      transition: 'all 60ms ease-out',
      display: 'none',
    })
    this.container.appendChild(this.endDotElement)
  }

  private ensureIndicatorElements(): void {
    // Check if elements exist and are still in DOM
    if (!this.lineElement || !this.container.contains(this.lineElement)) {
      this.createIndicatorElements()
    }
  }

  private ensureCrosshairElements(): void {
    const { color } = this.config

    if (!this.crosshairHElement || !this.container.contains(this.crosshairHElement)) {
      this.crosshairHElement = document.createElement('div')
      this.crosshairHElement.className = 'mirror-drop-crosshair-h'
      Object.assign(this.crosshairHElement.style, {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: String(Z_INDEX_DROP_INDICATOR),
        display: 'none',
      })
      this.container.appendChild(this.crosshairHElement)
    }

    if (!this.crosshairVElement || !this.container.contains(this.crosshairVElement)) {
      this.crosshairVElement = document.createElement('div')
      this.crosshairVElement.className = 'mirror-drop-crosshair-v'
      Object.assign(this.crosshairVElement.style, {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: String(Z_INDEX_DROP_INDICATOR),
        display: 'none',
      })
      this.container.appendChild(this.crosshairVElement)
    }
  }

  private ensurePositionLabelElement(): void {
    if (!this.positionLabelElement || !this.container.contains(this.positionLabelElement)) {
      this.positionLabelElement = document.createElement('div')
      this.positionLabelElement.className = 'mirror-drop-position-label'
      Object.assign(this.positionLabelElement.style, {
        position: 'absolute',
        padding: '2px 6px',
        backgroundColor: this.config.color,
        color: 'white',
        fontSize: '11px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: '500',
        borderRadius: '3px',
        pointerEvents: 'none',
        zIndex: String(Z_INDEX_DISTANCE_LABEL),
        whiteSpace: 'nowrap',
        display: 'none',
      })
      this.container.appendChild(this.positionLabelElement)
    }
  }
}

export function createDropIndicator(config: DropIndicatorConfig): DropIndicator {
  return new DropIndicator(config)
}
