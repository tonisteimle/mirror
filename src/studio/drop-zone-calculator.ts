/**
 * DropZoneCalculator - Calculates drop zones during drag operations
 *
 * Determines where a dragged component should be inserted:
 * - before: Insert as sibling before the target element
 * - after: Insert as sibling after the target element
 * - inside: Insert as child of the target element
 *
 * Also handles visual indicators (drop lines, highlights)
 */

export type DropPlacement = 'before' | 'after' | 'inside'

export interface DropZone {
  /** The target element's node ID */
  targetId: string
  /** Where to drop relative to target */
  placement: DropPlacement
  /** The target DOM element */
  element: HTMLElement
  /** Parent node ID (for 'inside' placement, this equals targetId) */
  parentId: string
  /** Sibling node ID (for 'before'/'after' placement) */
  siblingId?: string
}

export interface DropZoneCalculatorOptions {
  /** Custom attribute name for node IDs (default: data-mirror-id) */
  nodeIdAttribute?: string
  /** Threshold for edge detection (0-0.5, default: 0.25 = 25% from edge) */
  edgeThreshold?: number
  /** Whether to allow dropping inside elements (default: true) */
  allowInside?: boolean
  /** Elements that cannot have children (primitives like Input, Icon) */
  leafElements?: string[]
}

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
  // Line indicator for before/after placement
  line: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    pointerEvents: 'none',
    zIndex: LAYOUT.LINE_Z_INDEX,
    transition: 'all 80ms ease-out',
    borderRadius: '1px',
  },
  // Endpoint dots for the line
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
  // Inside highlight (container receives drop)
  highlight: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    outline: '2px solid #3B82F6',
    outlineOffset: '-2px',
    borderRadius: '4px',
    transition: 'all 80ms ease-out',
  },
}

/**
 * DropZoneCalculator class
 */
export class DropZoneCalculator {
  private container: HTMLElement
  private options: Required<DropZoneCalculatorOptions>

  private currentDropZone: DropZone | null = null
  private indicatorElement: HTMLElement | null = null
  private startDotElement: HTMLElement | null = null
  private endDotElement: HTMLElement | null = null
  private highlightedElement: HTMLElement | null = null
  private originalHighlightStyles: { background: string; outline: string; outlineOffset: string; borderRadius: string } | null = null

  // For scroll handling
  private lastClientX: number = 0
  private lastClientY: number = 0
  private lastSourceNodeId: string | undefined
  private boundScrollHandler: () => void

  constructor(container: HTMLElement, options: DropZoneCalculatorOptions = {}) {
    this.container = container
    this.options = {
      nodeIdAttribute: options.nodeIdAttribute || 'data-mirror-id',
      edgeThreshold: options.edgeThreshold ?? 0.25,
      allowInside: options.allowInside ?? true,
      leafElements: options.leafElements || ['Input', 'Textarea', 'Icon', 'Image'],
    }

    this.boundScrollHandler = this.handleScroll.bind(this)
    this.createIndicatorElement()
  }

  /**
   * Calculate drop zone from mouse position
   * @param sourceNodeId - If provided, prevents self-drop and dropping into descendants
   */
  calculateFromPoint(clientX: number, clientY: number, sourceNodeId?: string): DropZone | null {
    // Find element at point
    const elementAtPoint = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!elementAtPoint || !this.container.contains(elementAtPoint)) {
      return null
    }

    // Find nearest element with node ID
    const targetElement = this.findNodeElement(elementAtPoint)
    if (!targetElement) {
      return null
    }

    const nodeId = targetElement.getAttribute(this.options.nodeIdAttribute)
    if (!nodeId) {
      return null
    }

    // Prevent self-drop
    if (sourceNodeId && nodeId === sourceNodeId) {
      return null
    }

    // Prevent dropping into descendants of the source
    if (sourceNodeId && this.isDescendantOf(targetElement, sourceNodeId)) {
      return null
    }

    // Calculate placement based on cursor position within element
    const rect = targetElement.getBoundingClientRect()

    // Detect parent layout direction
    const parentElement = this.findParentNodeElement(targetElement)
    const isHorizontalLayout = parentElement ? this.isHorizontalLayout(parentElement) : false

    // Use appropriate axis based on layout
    const relativePos = isHorizontalLayout
      ? (clientX - rect.left) / rect.width
      : (clientY - rect.top) / rect.height

    let placement: DropPlacement

    // Check if this is a leaf element (cannot have children)
    const componentName = targetElement.dataset.mirrorName || ''
    const isLeaf = this.options.leafElements.includes(componentName)

    if (isLeaf || !this.options.allowInside) {
      // For leaf elements, only before/after
      placement = relativePos < 0.5 ? 'before' : 'after'
    } else {
      // For container elements, use edge threshold
      if (relativePos < this.options.edgeThreshold) {
        placement = 'before'
      } else if (relativePos > 1 - this.options.edgeThreshold) {
        placement = 'after'
      } else {
        placement = 'inside'
      }
    }

    // Find parent for hierarchy info (already found above for layout detection)
    const parentId = placement === 'inside'
      ? nodeId
      : parentElement?.getAttribute(this.options.nodeIdAttribute) || 'root'

    const dropZone: DropZone = {
      targetId: nodeId,
      placement,
      element: targetElement,
      parentId,
      siblingId: placement !== 'inside' ? nodeId : undefined,
    }

    return dropZone
  }

  /**
   * Update drop zone and visual indicators
   * @param sourceNodeId - If provided, prevents self-drop and dropping into descendants
   */
  updateDropZone(clientX: number, clientY: number, sourceNodeId?: string): DropZone | null {
    // Store for scroll handler
    this.lastClientX = clientX
    this.lastClientY = clientY
    this.lastSourceNodeId = sourceNodeId

    // Start listening for scroll if not already
    this.startScrollListening()

    const dropZone = this.calculateFromPoint(clientX, clientY, sourceNodeId)

    // Clear previous indicators if zone changed
    if (!this.isSameDropZone(dropZone, this.currentDropZone)) {
      this.clearIndicators()

      if (dropZone) {
        // Show indicator immediately - CSS transitions handle smoothness
        this.showIndicator(dropZone)
      }

      this.currentDropZone = dropZone
    }

    return dropZone
  }

  /**
   * Handle scroll events during drag - refresh indicator position
   */
  private handleScroll(): void {
    if (this.currentDropZone) {
      // Recalculate and redraw indicator at current mouse position
      const dropZone = this.calculateFromPoint(this.lastClientX, this.lastClientY, this.lastSourceNodeId)

      if (dropZone && this.isSameDropZone(dropZone, this.currentDropZone)) {
        // Same zone, just update position
        this.clearIndicators()
        this.showIndicator(dropZone)
      } else if (!this.isSameDropZone(dropZone, this.currentDropZone)) {
        // Zone changed
        this.clearIndicators()
        if (dropZone) {
          this.showIndicator(dropZone)
        }
        this.currentDropZone = dropZone
      }
    }
  }

  /**
   * Start listening for scroll events on container and its parents
   */
  private startScrollListening(): void {
    this.container.addEventListener('scroll', this.boundScrollHandler, { passive: true })
    window.addEventListener('scroll', this.boundScrollHandler, { passive: true })
  }

  /**
   * Stop listening for scroll events
   */
  private stopScrollListening(): void {
    this.container.removeEventListener('scroll', this.boundScrollHandler)
    window.removeEventListener('scroll', this.boundScrollHandler)
  }

  /**
   * Get current drop zone
   */
  getCurrentDropZone(): DropZone | null {
    return this.currentDropZone
  }

  /**
   * Clear all indicators and reset state
   */
  clear(): void {
    this.clearIndicators()
    this.currentDropZone = null
    this.stopScrollListening()
  }

  /**
   * Find sibling element for gap-aware positioning
   */
  private findSiblingElement(element: HTMLElement, placement: DropPlacement): HTMLElement | null {
    if (placement === 'before') {
      // Find previous sibling with node ID
      let prev = element.previousElementSibling as HTMLElement | null
      while (prev) {
        if (prev.hasAttribute(this.options.nodeIdAttribute)) {
          return prev
        }
        prev = prev.previousElementSibling as HTMLElement | null
      }
    } else if (placement === 'after') {
      // Find next sibling with node ID
      let next = element.nextElementSibling as HTMLElement | null
      while (next) {
        if (next.hasAttribute(this.options.nodeIdAttribute)) {
          return next
        }
        next = next.nextElementSibling as HTMLElement | null
      }
    }
    return null
  }

  /**
   * Show visual indicator for drop zone
   */
  private showIndicator(dropZone: DropZone): void {
    const { element, placement } = dropZone
    const rect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    if (placement === 'inside') {
      // Highlight the element for "inside" drops
      this.highlightElement(element)
    } else {
      // Show line indicator for before/after
      // Detect if parent has horizontal layout
      const parentElement = this.findParentNodeElement(element)
      const isHorizontal = parentElement ? this.isHorizontalLayout(parentElement) : false

      // Find sibling to calculate gap-centered position
      const sibling = this.findSiblingElement(element, placement)
      const siblingRect = sibling?.getBoundingClientRect()

      if (this.indicatorElement && this.startDotElement && this.endDotElement) {
        if (isHorizontal) {
          // Vertical line for horizontal layouts
          let lineLeft: number

          if (placement === 'before') {
            if (siblingRect) {
              // Center line between sibling and element
              lineLeft = (siblingRect.right + rect.left) / 2 - containerRect.left
            } else {
              // No sibling, place at element edge
              lineLeft = rect.left - containerRect.left - LAYOUT.LINE_WIDTH / 2
            }
          } else {
            if (siblingRect) {
              // Center line between element and sibling
              lineLeft = (rect.right + siblingRect.left) / 2 - containerRect.left
            } else {
              // No sibling, place at element edge
              lineLeft = rect.right - containerRect.left - LAYOUT.LINE_WIDTH / 2
            }
          }

          Object.assign(this.indicatorElement.style, {
            display: 'block',
            left: `${lineLeft}px`,
            top: `${rect.top - containerRect.top}px`,
            width: `${LAYOUT.LINE_WIDTH}px`,
            height: `${rect.height}px`,
          })

          // Position dots at top and bottom of vertical line
          const dotLeftOffset = lineLeft - LAYOUT.DOT_CENTER_OFFSET
          Object.assign(this.startDotElement.style, {
            display: 'block',
            left: `${dotLeftOffset}px`,
            top: `${rect.top - containerRect.top - LAYOUT.DOT_END_OFFSET}px`,
          })
          Object.assign(this.endDotElement.style, {
            display: 'block',
            left: `${dotLeftOffset}px`,
            top: `${rect.bottom - containerRect.top - LAYOUT.DOT_END_OFFSET}px`,
          })
        } else {
          // Horizontal line for vertical layouts
          let lineTop: number

          if (placement === 'before') {
            if (siblingRect) {
              // Center line between sibling and element
              lineTop = (siblingRect.bottom + rect.top) / 2 - containerRect.top
            } else {
              // No sibling, place at element edge
              lineTop = rect.top - containerRect.top - LAYOUT.LINE_WIDTH / 2
            }
          } else {
            if (siblingRect) {
              // Center line between element and sibling
              lineTop = (rect.bottom + siblingRect.top) / 2 - containerRect.top
            } else {
              // No sibling, place at element edge
              lineTop = rect.bottom - containerRect.top - LAYOUT.LINE_WIDTH / 2
            }
          }

          Object.assign(this.indicatorElement.style, {
            display: 'block',
            top: `${lineTop}px`,
            left: `${rect.left - containerRect.left}px`,
            width: `${rect.width}px`,
            height: `${LAYOUT.LINE_WIDTH}px`,
          })

          // Position dots at left and right of horizontal line
          const dotTopOffset = lineTop - LAYOUT.DOT_CENTER_OFFSET
          Object.assign(this.startDotElement.style, {
            display: 'block',
            left: `${rect.left - containerRect.left - LAYOUT.DOT_END_OFFSET}px`,
            top: `${dotTopOffset}px`,
          })
          Object.assign(this.endDotElement.style, {
            display: 'block',
            left: `${rect.right - containerRect.left - LAYOUT.DOT_END_OFFSET}px`,
            top: `${dotTopOffset}px`,
          })
        }
      }
    }
  }

  /**
   * Highlight element for "inside" drop (Webflow-style)
   */
  private highlightElement(element: HTMLElement): void {
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

  /**
   * Clear all visual indicators
   */
  private clearIndicators(): void {
    // Hide line indicator
    if (this.indicatorElement) {
      this.indicatorElement.style.display = 'none'
    }

    // Hide dot indicators
    if (this.startDotElement) {
      this.startDotElement.style.display = 'none'
    }
    if (this.endDotElement) {
      this.endDotElement.style.display = 'none'
    }

    // Clear element highlight and restore original styles
    if (this.highlightedElement) {
      if (this.originalHighlightStyles) {
        this.highlightedElement.style.backgroundColor = this.originalHighlightStyles.background
        this.highlightedElement.style.outline = this.originalHighlightStyles.outline
        this.highlightedElement.style.outlineOffset = this.originalHighlightStyles.outlineOffset
        this.highlightedElement.style.borderRadius = this.originalHighlightStyles.borderRadius
      } else {
        this.highlightedElement.style.backgroundColor = ''
        this.highlightedElement.style.outline = ''
        this.highlightedElement.style.outlineOffset = ''
      }
      this.highlightedElement.style.transition = ''
      this.highlightedElement = null
      this.originalHighlightStyles = null
    }
  }

  /**
   * Create the line indicator and dot elements
   */
  private createIndicatorElement(): void {
    // Create line indicator
    this.indicatorElement = document.createElement('div')
    this.indicatorElement.className = 'mirror-drop-indicator'
    Object.assign(this.indicatorElement.style, INDICATOR_STYLES.line)
    this.indicatorElement.style.display = 'none'

    // Create start dot
    this.startDotElement = document.createElement('div')
    this.startDotElement.className = 'mirror-drop-indicator-dot'
    Object.assign(this.startDotElement.style, INDICATOR_STYLES.dot)
    this.startDotElement.style.display = 'none'

    // Create end dot
    this.endDotElement = document.createElement('div')
    this.endDotElement.className = 'mirror-drop-indicator-dot'
    Object.assign(this.endDotElement.style, INDICATOR_STYLES.dot)
    this.endDotElement.style.display = 'none'

    // Add to container
    this.container.style.position = this.container.style.position || 'relative'
    this.container.appendChild(this.indicatorElement)
    this.container.appendChild(this.startDotElement)
    this.container.appendChild(this.endDotElement)
  }

  /**
   * Find the nearest element with a node ID
   */
  private findNodeElement(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element

    while (current && current !== this.container) {
      if (current.hasAttribute(this.options.nodeIdAttribute)) {
        return current
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Find parent element with node ID
   */
  private findParentNodeElement(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement

    while (current && current !== this.container) {
      if (current.hasAttribute(this.options.nodeIdAttribute)) {
        return current
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Check if an element is a descendant of an element with the given node ID
   */
  private isDescendantOf(element: HTMLElement, ancestorNodeId: string): boolean {
    let current: HTMLElement | null = element.parentElement

    while (current && current !== this.container) {
      const nodeId = current.getAttribute(this.options.nodeIdAttribute)
      if (nodeId === ancestorNodeId) {
        return true
      }
      current = current.parentElement
    }

    return false
  }

  /**
   * Check if an element has horizontal layout (flex-direction: row)
   */
  private isHorizontalLayout(element: HTMLElement): boolean {
    const computedStyle = window.getComputedStyle(element)
    const flexDirection = computedStyle.flexDirection
    const display = computedStyle.display

    // Check for flex row layout
    if (display === 'flex' || display === 'inline-flex') {
      return flexDirection === 'row' || flexDirection === 'row-reverse'
    }

    // Check for grid (treat as horizontal if it has multiple columns)
    if (display === 'grid' || display === 'inline-grid') {
      const gridTemplateColumns = computedStyle.gridTemplateColumns
      // Multiple columns = horizontal-ish layout
      return gridTemplateColumns !== 'none' && gridTemplateColumns.split(' ').length > 1
    }

    // Check for data-layout attribute (Mirror-specific)
    const layout = element.dataset.layout
    if (layout === 'horizontal' || layout === 'hor') {
      return true
    }

    return false
  }

  /**
   * Check if two drop zones are the same
   */
  private isSameDropZone(a: DropZone | null, b: DropZone | null): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return a.targetId === b.targetId && a.placement === b.placement
  }

  /**
   * Ensure indicator elements exist and are in the DOM
   * Call this after preview content updates (which may remove indicators)
   */
  ensureIndicators(): void {
    // Check if indicators are still in the DOM
    const lineInDom = this.indicatorElement && this.container.contains(this.indicatorElement)
    const startDotInDom = this.startDotElement && this.container.contains(this.startDotElement)
    const endDotInDom = this.endDotElement && this.container.contains(this.endDotElement)

    // If any indicator is missing, recreate all of them
    if (!lineInDom || !startDotInDom || !endDotInDom) {
      // Clean up any orphaned elements
      if (this.indicatorElement && this.indicatorElement.parentNode) {
        this.indicatorElement.parentNode.removeChild(this.indicatorElement)
      }
      if (this.startDotElement && this.startDotElement.parentNode) {
        this.startDotElement.parentNode.removeChild(this.startDotElement)
      }
      if (this.endDotElement && this.endDotElement.parentNode) {
        this.endDotElement.parentNode.removeChild(this.endDotElement)
      }

      // Recreate indicators
      this.createIndicatorElement()
    }
  }

  /**
   * Dispose the calculator
   */
  dispose(): void {
    this.clear()

    // Remove indicator elements
    if (this.indicatorElement && this.indicatorElement.parentNode) {
      this.indicatorElement.parentNode.removeChild(this.indicatorElement)
    }
    if (this.startDotElement && this.startDotElement.parentNode) {
      this.startDotElement.parentNode.removeChild(this.startDotElement)
    }
    if (this.endDotElement && this.endDotElement.parentNode) {
      this.endDotElement.parentNode.removeChild(this.endDotElement)
    }

    this.indicatorElement = null
    this.startDotElement = null
    this.endDotElement = null
  }
}

/**
 * Create a DropZoneCalculator for a container
 */
export function createDropZoneCalculator(
  container: HTMLElement,
  options?: DropZoneCalculatorOptions
): DropZoneCalculator {
  return new DropZoneCalculator(container, options)
}
