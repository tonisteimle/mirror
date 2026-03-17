/**
 * DropIndicatorRenderer - Renders visual indicators for drag-drop operations
 *
 * Extracts indicator rendering logic from DropZoneCalculator for:
 * - Better separation of concerns
 * - Easier testing
 * - Reduced DropZoneCalculator complexity
 *
 * Indicator types:
 * - Line: Shows insertion position between elements (with endpoint dots)
 * - Crosshair: Shows absolute position (x/y) for abs containers
 * - Highlight: Shows target container for "inside" drops
 */

import type { IndicatorConfig } from './drop-strategies'

/**
 * Layout constants for indicator positioning
 */
const LAYOUT = {
  /** Line thickness in pixels */
  LINE_WIDTH: 2,
  /** Dot diameter in pixels */
  DOT_SIZE: 6,
  /** Offset to center dot on line */
  DOT_CENTER_OFFSET: 2,
  /** Extra offset for dot positioning */
  DOT_END_OFFSET: 3,
  /** Z-index for line indicator */
  LINE_Z_INDEX: '10000',
  /** Z-index for dots (above line) */
  DOT_Z_INDEX: '10001',
} as const

/**
 * Visual indicator styles (Webflow-inspired)
 */
const INDICATOR_STYLES = {
  line: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    pointerEvents: 'none',
    zIndex: LAYOUT.LINE_Z_INDEX,
    transition: 'all 80ms ease-out',
    borderRadius: '1px',
  },
  dot: {
    position: 'absolute',
    width: `${LAYOUT.DOT_SIZE}px`,
    height: `${LAYOUT.DOT_SIZE}px`,
    backgroundColor: '#3B82F6',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: LAYOUT.DOT_Z_INDEX,
    transition: 'all 80ms ease-out',
  },
  highlight: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    outline: '2px solid #3B82F6',
    outlineOffset: '-2px',
    borderRadius: '4px',
    transition: 'all 80ms ease-out',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    opacity: '0.5',
    pointerEvents: 'none',
    zIndex: LAYOUT.LINE_Z_INDEX,
  },
  positionLabel: {
    position: 'absolute',
    padding: '2px 6px',
    backgroundColor: '#3B82F6',
    color: 'white',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: LAYOUT.DOT_Z_INDEX,
    whiteSpace: 'nowrap',
  },
} as const

/**
 * Configuration for line indicator
 */
export interface LineIndicatorConfig {
  type: 'line'
  /** Line position (left for vertical, top for horizontal) */
  position: number
  /** Whether the line is horizontal (for vertical containers) */
  isHorizontal: boolean
  /** Start position (top for vertical line, left for horizontal line) */
  start: number
  /** Length of the line */
  length: number
  /** Show endpoint dots */
  showDots?: boolean
}

/**
 * Configuration for crosshair indicator
 */
export interface CrosshairIndicatorConfig {
  type: 'crosshair'
  /** X position relative to container */
  x: number
  /** Y position relative to container */
  y: number
  /** Container bounds (for crosshair lines) */
  containerLeft: number
  containerTop: number
  containerWidth: number
  containerHeight: number
  /** Position label (e.g., "x: 100, y: 50") */
  label?: string
}

/**
 * Configuration for element highlight
 */
export interface HighlightConfig {
  type: 'highlight'
  /** Element to highlight */
  element: HTMLElement
}

/**
 * Configuration for zone indicator (9-zone model)
 */
export interface ZoneIndicatorConfig {
  type: 'zone'
  /** Line config for the zone indicator */
  line: LineIndicatorConfig
}

export type RendererIndicatorConfig =
  | LineIndicatorConfig
  | CrosshairIndicatorConfig
  | HighlightConfig
  | ZoneIndicatorConfig

/**
 * DropIndicatorRenderer class
 */
export class DropIndicatorRenderer {
  private container: HTMLElement

  // Line indicator elements
  private lineElement: HTMLElement | null = null
  private startDotElement: HTMLElement | null = null
  private endDotElement: HTMLElement | null = null

  // Crosshair elements
  private crosshairHElement: HTMLElement | null = null
  private crosshairVElement: HTMLElement | null = null
  private positionLabelElement: HTMLElement | null = null

  // Highlight state
  private highlightedElement: HTMLElement | null = null
  private originalHighlightStyles: {
    background: string
    outline: string
    outlineOffset: string
    borderRadius: string
  } | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.createLineElements()
  }

  /**
   * Show an indicator based on configuration
   */
  show(config: RendererIndicatorConfig): void {
    switch (config.type) {
      case 'line':
        this.showLine(config)
        break
      case 'crosshair':
        this.showCrosshair(config)
        break
      case 'highlight':
        this.showHighlight(config.element)
        break
      case 'zone':
        this.showLine(config.line)
        break
    }
  }

  /**
   * Show from strategy IndicatorConfig (adapter method)
   */
  showFromStrategyConfig(config: IndicatorConfig, containerRect: DOMRect): void {
    if (config.type === 'line') {
      // Convert strategy config to renderer config
      const isHorizontal = (config.height ?? 0) > (config.width ?? 0)
      this.showLine({
        type: 'line',
        position: isHorizontal ? config.x - containerRect.left : config.y - containerRect.top,
        isHorizontal: !isHorizontal, // Opposite because line orientation is perpendicular to layout
        start: isHorizontal ? config.y - containerRect.top : config.x - containerRect.left,
        length: isHorizontal ? (config.height ?? containerRect.height) : (config.width ?? containerRect.width),
        showDots: config.showDots,
      })
    } else if (config.type === 'crosshair') {
      this.showCrosshair({
        type: 'crosshair',
        x: config.x - containerRect.left,
        y: config.y - containerRect.top,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        label: config.label,
      })
    } else if (config.type === 'zone') {
      // 9-zone indicator: show partial line based on alignment
      this.showZoneIndicator(config, containerRect)
    }
  }

  /**
   * Show 9-zone indicator for empty container drops
   * Shows a partial line indicating both main axis and cross axis alignment
   */
  private showZoneIndicator(config: IndicatorConfig, containerRect: DOMRect): void {
    const isHorizontal = config.direction === 'horizontal'
    const alignment = config.alignment ?? 'center'
    const crossAlignment = config.crossAlignment ?? 'center'
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Edge offset to keep indicators inside the container
    const EDGE_OFFSET = 4

    // Calculate line segment (1/3 of container dimension)
    const segmentWidth = containerWidth / 3
    const segmentHeight = containerHeight / 3

    if (isHorizontal) {
      // Horizontal container: show vertical line
      // Main axis (alignment) determines X position: start/center/end
      let lineX: number
      if (alignment === 'start') {
        lineX = EDGE_OFFSET
      } else if (alignment === 'end') {
        lineX = containerWidth - EDGE_OFFSET
      } else {
        lineX = containerWidth / 2
      }

      // Cross axis (crossAlignment) determines which third of height to show
      let lineTop: number
      if (crossAlignment === 'start') {
        lineTop = EDGE_OFFSET
      } else if (crossAlignment === 'end') {
        lineTop = containerHeight - segmentHeight - EDGE_OFFSET
      } else {
        lineTop = segmentHeight
      }

      this.showLine({
        type: 'line',
        position: lineX,
        isHorizontal: false, // Vertical line for horizontal containers
        start: lineTop,
        length: segmentHeight,
        showDots: config.showDots,
      })
    } else {
      // Vertical container: show horizontal line
      // Main axis (alignment) determines Y position: start/center/end
      let lineY: number
      if (alignment === 'start') {
        lineY = EDGE_OFFSET
      } else if (alignment === 'end') {
        lineY = containerHeight - EDGE_OFFSET
      } else {
        lineY = containerHeight / 2
      }

      // Cross axis (crossAlignment) determines which third of width to show
      let lineLeft: number
      if (crossAlignment === 'start') {
        lineLeft = EDGE_OFFSET
      } else if (crossAlignment === 'end') {
        lineLeft = containerWidth - segmentWidth - EDGE_OFFSET
      } else {
        lineLeft = segmentWidth
      }

      this.showLine({
        type: 'line',
        position: lineY,
        isHorizontal: true, // Horizontal line for vertical containers
        start: lineLeft,
        length: segmentWidth,
        showDots: config.showDots,
      })
    }
  }

  /**
   * Clear all indicators
   */
  clear(): void {
    this.hideLineIndicator()
    this.hideCrosshair()
    this.clearHighlight()
  }

  /**
   * Dispose all elements
   */
  dispose(): void {
    this.clear()
    this.removeLineElements()
    this.removeCrosshairElements()
  }

  /**
   * Ensure indicator elements exist in DOM
   * (Call after container content updates)
   */
  ensureElements(): void {
    const lineInDom = this.lineElement && this.container.contains(this.lineElement)
    if (!lineInDom) {
      this.removeLineElements()
      this.createLineElements()
    }
  }

  // --- Private: Line Indicator ---

  private createLineElements(): void {
    // Line
    this.lineElement = document.createElement('div')
    this.lineElement.className = 'mirror-drop-indicator'
    Object.assign(this.lineElement.style, INDICATOR_STYLES.line)
    this.lineElement.style.display = 'none'

    // Start dot
    this.startDotElement = document.createElement('div')
    this.startDotElement.className = 'mirror-drop-indicator-dot'
    Object.assign(this.startDotElement.style, INDICATOR_STYLES.dot)
    this.startDotElement.style.display = 'none'

    // End dot
    this.endDotElement = document.createElement('div')
    this.endDotElement.className = 'mirror-drop-indicator-dot'
    Object.assign(this.endDotElement.style, INDICATOR_STYLES.dot)
    this.endDotElement.style.display = 'none'

    // Ensure container has position
    this.container.style.position = this.container.style.position || 'relative'

    this.container.appendChild(this.lineElement)
    this.container.appendChild(this.startDotElement)
    this.container.appendChild(this.endDotElement)
  }

  private removeLineElements(): void {
    this.lineElement?.remove()
    this.startDotElement?.remove()
    this.endDotElement?.remove()
    this.lineElement = null
    this.startDotElement = null
    this.endDotElement = null
  }

  private showLine(config: LineIndicatorConfig): void {
    if (!this.lineElement || !this.startDotElement || !this.endDotElement) {
      return
    }

    if (config.isHorizontal) {
      // Horizontal line (for vertical layouts)
      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${config.start}px`,
        top: `${config.position}px`,
        width: `${config.length}px`,
        height: `${LAYOUT.LINE_WIDTH}px`,
      })

      if (config.showDots !== false) {
        const dotTop = config.position - LAYOUT.DOT_CENTER_OFFSET
        Object.assign(this.startDotElement.style, {
          display: 'block',
          left: `${config.start - LAYOUT.DOT_END_OFFSET}px`,
          top: `${dotTop}px`,
        })
        Object.assign(this.endDotElement.style, {
          display: 'block',
          left: `${config.start + config.length - LAYOUT.DOT_END_OFFSET}px`,
          top: `${dotTop}px`,
        })
      }
    } else {
      // Vertical line (for horizontal layouts)
      Object.assign(this.lineElement.style, {
        display: 'block',
        left: `${config.position}px`,
        top: `${config.start}px`,
        width: `${LAYOUT.LINE_WIDTH}px`,
        height: `${config.length}px`,
      })

      if (config.showDots !== false) {
        const dotLeft = config.position - LAYOUT.DOT_CENTER_OFFSET
        Object.assign(this.startDotElement.style, {
          display: 'block',
          left: `${dotLeft}px`,
          top: `${config.start - LAYOUT.DOT_END_OFFSET}px`,
        })
        Object.assign(this.endDotElement.style, {
          display: 'block',
          left: `${dotLeft}px`,
          top: `${config.start + config.length - LAYOUT.DOT_END_OFFSET}px`,
        })
      }
    }
  }

  private hideLineIndicator(): void {
    if (this.lineElement) {
      this.lineElement.style.display = 'none'
    }
    if (this.startDotElement) {
      this.startDotElement.style.display = 'none'
    }
    if (this.endDotElement) {
      this.endDotElement.style.display = 'none'
    }
  }

  // --- Private: Crosshair Indicator ---

  private ensureCrosshairElements(): void {
    // Ensure container has position for absolute positioning of crosshair
    this.container.style.position = this.container.style.position || 'relative'

    if (!this.crosshairHElement || !this.container.contains(this.crosshairHElement)) {
      this.crosshairHElement = document.createElement('div')
      this.crosshairHElement.className = 'mirror-crosshair-h'
      this.crosshairHElement.style.display = 'none'
      this.container.appendChild(this.crosshairHElement)
    }

    if (!this.crosshairVElement || !this.container.contains(this.crosshairVElement)) {
      this.crosshairVElement = document.createElement('div')
      this.crosshairVElement.className = 'mirror-crosshair-v'
      this.crosshairVElement.style.display = 'none'
      this.container.appendChild(this.crosshairVElement)
    }

    if (!this.positionLabelElement || !this.container.contains(this.positionLabelElement)) {
      this.positionLabelElement = document.createElement('div')
      this.positionLabelElement.className = 'mirror-position-label'
      this.positionLabelElement.style.display = 'none'
      this.container.appendChild(this.positionLabelElement)
    }
  }

  private removeCrosshairElements(): void {
    this.crosshairHElement?.remove()
    this.crosshairVElement?.remove()
    this.positionLabelElement?.remove()
    this.crosshairHElement = null
    this.crosshairVElement = null
    this.positionLabelElement = null
  }

  private showCrosshair(config: CrosshairIndicatorConfig): void {
    this.ensureCrosshairElements()

    // Horizontal line
    if (this.crosshairHElement) {
      Object.assign(this.crosshairHElement.style, {
        ...INDICATOR_STYLES.crosshairLine,
        display: 'block',
        left: `${config.containerLeft}px`,
        top: `${config.y}px`,
        width: `${config.containerWidth}px`,
        height: '1px',
      })
    }

    // Vertical line
    if (this.crosshairVElement) {
      Object.assign(this.crosshairVElement.style, {
        ...INDICATOR_STYLES.crosshairLine,
        display: 'block',
        left: `${config.x}px`,
        top: `${config.containerTop}px`,
        width: '1px',
        height: `${config.containerHeight}px`,
      })
    }

    // Position label
    if (this.positionLabelElement && config.label) {
      Object.assign(this.positionLabelElement.style, {
        ...INDICATOR_STYLES.positionLabel,
        display: 'block',
        left: `${config.x + 8}px`,
        top: `${config.y + 8}px`,
      })
      this.positionLabelElement.textContent = config.label
    }
  }

  private hideCrosshair(): void {
    if (this.crosshairHElement) {
      this.crosshairHElement.style.display = 'none'
    }
    if (this.crosshairVElement) {
      this.crosshairVElement.style.display = 'none'
    }
    if (this.positionLabelElement) {
      this.positionLabelElement.style.display = 'none'
    }
  }

  // --- Private: Element Highlight ---

  private showHighlight(element: HTMLElement): void {
    // Store original styles
    this.originalHighlightStyles = {
      background: element.style.backgroundColor,
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      borderRadius: element.style.borderRadius,
    }

    this.highlightedElement = element
    element.style.backgroundColor = INDICATOR_STYLES.highlight.backgroundColor
    element.style.outline = INDICATOR_STYLES.highlight.outline
    element.style.outlineOffset = INDICATOR_STYLES.highlight.outlineOffset
    element.style.transition = INDICATOR_STYLES.highlight.transition
  }

  private clearHighlight(): void {
    if (this.highlightedElement && this.originalHighlightStyles) {
      this.highlightedElement.style.backgroundColor = this.originalHighlightStyles.background
      this.highlightedElement.style.outline = this.originalHighlightStyles.outline
      this.highlightedElement.style.outlineOffset = this.originalHighlightStyles.outlineOffset
      this.highlightedElement.style.borderRadius = this.originalHighlightStyles.borderRadius
      this.highlightedElement.style.transition = ''
    }
    this.highlightedElement = null
    this.originalHighlightStyles = null
  }
}

/**
 * Create a DropIndicatorRenderer for a container
 */
export function createDropIndicatorRenderer(container: HTMLElement): DropIndicatorRenderer {
  return new DropIndicatorRenderer(container)
}
