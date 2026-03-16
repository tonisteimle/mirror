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

import { isHorizontalLayout as isHorizontalLayoutUtil } from './utils/layout-detection'

export type DropPlacement = 'before' | 'after' | 'inside'

/**
 * Semantic zones for 9-zone positioning model
 * Used when dropping inside a container to determine wrapper generation
 */
export type SemanticZone =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'mid-center' | 'mid-right'
  | 'bot-left' | 'bot-center' | 'bot-right'

/**
 * Absolute position for dropping into abs containers
 */
export interface AbsolutePosition {
  x: number
  y: number
}

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
  /** Semantic zone for 'inside' placement (only set when enableSemanticZones is true) */
  semanticZone?: SemanticZone
  /** Absolute position for 'inside' placement in abs containers */
  absolutePosition?: AbsolutePosition
  /** Whether target is an absolute layout container */
  isAbsoluteContainer?: boolean
  /** Insertion index when dropping between children */
  insertionIndex?: number
  /** Rect for visual indicator positioning */
  indicatorRect?: DOMRect
  /** Parent layout direction */
  parentDirection?: 'horizontal' | 'vertical'
  /** Suggested main axis alignment for empty container drops */
  suggestedAlignment?: 'start' | 'center' | 'end'
  /** Suggested cross axis alignment for 9-zone model */
  suggestedCrossAlignment?: 'start' | 'center' | 'end'
  /** Internal: slot info for indicator positioning */
  _slot?: DropSlot
  /** Internal: container rect for indicator positioning */
  _containerRect?: DOMRect
  /** Internal: horizontal layout flag */
  _isHorizontal?: boolean
  /** Internal: indicator X position for empty containers */
  _indicatorX?: number
  /** Internal: indicator Y position for empty containers */
  _indicatorY?: number
}

/**
 * Information about a drop slot between children
 */
export interface DropSlot {
  /** Index to insert at (0 = before first child) */
  index: number
  /** Node ID of element before this slot (null if first position) */
  siblingBeforeId: string | null
  /** Node ID of element after this slot (null if last position) */
  siblingAfterId: string | null
  /** Visual indicator Y/X position (depending on layout direction) */
  indicatorPosition: number
  /** Rect of the sibling before (for indicator positioning) */
  siblingBeforeRect: DOMRect | null
  /** Rect of the sibling after (for indicator positioning) */
  siblingAfterRect: DOMRect | null
  /** Main axis alignment for empty containers */
  alignment?: 'start' | 'center' | 'end'
  /** Cross axis alignment for 9-zone model */
  crossAlignment?: 'start' | 'center' | 'end'
  /** Indicator X position for crosshair */
  indicatorX?: number
  /** Indicator Y position for crosshair */
  indicatorY?: number
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
  /** Enable 9-zone semantic positioning for 'inside' drops (default: false) */
  enableSemanticZones?: boolean
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
 * Zone calculation constants
 */
const ZONE = {
  /** First third boundary (0-33%) */
  THIRD_START: 0.33,
  /** Second third boundary (66%-100%) */
  THIRD_END: 0.66,
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
  private semanticZoneElement: HTMLElement | null = null
  private highlightedElement: HTMLElement | null = null
  private originalHighlightStyles: { background: string; outline: string; outlineOffset: string; borderRadius: string } | null = null

  // Crosshair indicator for absolute positioning
  private crosshairHElement: HTMLElement | null = null
  private crosshairVElement: HTMLElement | null = null
  private positionLabelElement: HTMLElement | null = null

  // For scroll handling
  private lastClientX: number = 0
  private lastClientY: number = 0
  private lastSourceNodeId: string | undefined
  private boundScrollHandler: () => void
  private isScrollListening: boolean = false

  constructor(container: HTMLElement, options: DropZoneCalculatorOptions = {}) {
    this.container = container
    this.options = {
      nodeIdAttribute: options.nodeIdAttribute || 'data-mirror-id',
      edgeThreshold: options.edgeThreshold ?? 0.25,
      allowInside: options.allowInside ?? true,
      // Leaf elements cannot have children - only before/after placement allowed
      leafElements: options.leafElements || ['Input', 'Icon', 'Text', 'Image', 'Separator', 'Spacer', 'rect', 'circle', 'line'],
      // Prototype: 9-zone dots are ALWAYS shown
      enableSemanticZones: options.enableSemanticZones ?? true,
    }

    this.boundScrollHandler = this.handleScroll.bind(this)
    this.createIndicatorElement()
  }

  /**
   * Calculate drop zone from mouse position
   *
   * New approach: Always show insertion line at exact position where element will be inserted.
   * Works for both empty and non-empty containers. No threshold-based edge detection.
   *
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

    // Prevent dropping into descendants of the source
    if (sourceNodeId && this.isDescendantOf(targetElement, sourceNodeId)) {
      return null
    }

    // Handle self-drop: navigate to parent to allow reordering within siblings
    if (sourceNodeId && nodeId === sourceNodeId) {
      const parentElement = this.findParentNodeElement(targetElement)
      if (parentElement) {
        // Recursively calculate drop zone for parent, still excluding source from children
        const parentNodeId = parentElement.getAttribute(this.options.nodeIdAttribute)
        if (parentNodeId) {
          // Calculate insertion slot within parent, excluding the source element
          const slot = this.calculateChildInsertionZone(parentElement, clientX, clientY, sourceNodeId)
          if (slot) {
            const isHorizontal = this.isHorizontalLayout(parentElement)
            const parentRect = parentElement.getBoundingClientRect()

            // Determine placement based on slot
            let placement: DropPlacement
            let targetId: string
            let siblingId: string | undefined

            if (slot.siblingAfterId && !slot.siblingBeforeId) {
              placement = 'before'
              targetId = slot.siblingAfterId
              siblingId = slot.siblingAfterId
            } else if (slot.siblingBeforeId && !slot.siblingAfterId) {
              placement = 'after'
              targetId = slot.siblingBeforeId
              siblingId = slot.siblingBeforeId
            } else if (slot.siblingBeforeId && slot.siblingAfterId) {
              placement = 'after'
              targetId = slot.siblingBeforeId
              siblingId = slot.siblingBeforeId
            } else {
              // Only child being moved - no reorder possible in same parent
              return null
            }

            const dropTargetElement = parentElement.querySelector(
              `[${this.options.nodeIdAttribute}="${targetId}"]`
            ) as HTMLElement || parentElement

            const dropZone: DropZone = {
              targetId,
              placement,
              element: dropTargetElement,
              parentId: parentNodeId,
              siblingId,
              insertionIndex: slot.index,
              parentDirection: isHorizontal ? 'horizontal' : 'vertical',
            }

            dropZone._slot = slot
            dropZone._containerRect = parentRect
            dropZone._isHorizontal = isHorizontal

            return dropZone
          }
        }
      }
      return null
    }

    const rect = targetElement.getBoundingClientRect()

    // Check if target is an absolute layout container
    const isAbsoluteContainer = this.isAbsoluteLayoutContainer(targetElement)

    // If dropping into an abs container, use absolute positioning
    if (isAbsoluteContainer) {
      const absolutePosition = this.calculateAbsolutePosition(clientX, clientY, rect)
      return {
        targetId: nodeId,
        placement: 'inside',
        element: targetElement,
        parentId: nodeId,
        absolutePosition,
        isAbsoluteContainer: true,
      }
    }

    // Find the container (parent) to calculate insertion position
    // The container is either the target element itself (if we're dropping into it)
    // or its parent (if we're dropping as a sibling)
    const parentElement = this.findParentNodeElement(targetElement)

    // Check if parent is an absolute container
    if (parentElement && this.isAbsoluteLayoutContainer(parentElement)) {
      const parentRect = parentElement.getBoundingClientRect()
      const absolutePosition = this.calculateAbsolutePosition(clientX, clientY, parentRect)
      const parentNodeId = parentElement.getAttribute(this.options.nodeIdAttribute) || 'root'
      return {
        targetId: parentNodeId,
        placement: 'inside',
        element: parentElement,
        parentId: parentNodeId,
        absolutePosition,
        isAbsoluteContainer: true,
      }
    }

    // Determine the container to use for insertion calculation
    // If target is a container with children OR an empty container, use it as the drop target
    // Otherwise, use the parent container and calculate sibling position
    const componentName = targetElement.dataset.mirrorName || ''
    const isLeaf = this.options.leafElements.includes(componentName)

    // Use target as container if:
    // 1. It's not a leaf element AND
    // 2. We allow inside drops
    const useTargetAsContainer = !isLeaf && this.options.allowInside

    let containerElement: HTMLElement
    let containerId: string

    if (useTargetAsContainer) {
      // Drop INTO the target element
      containerElement = targetElement
      containerId = nodeId
    } else if (parentElement) {
      // Drop as SIBLING within parent
      containerElement = parentElement
      containerId = parentElement.getAttribute(this.options.nodeIdAttribute) || 'root'
    } else {
      // Fallback: no parent, drop into target
      containerElement = targetElement
      containerId = nodeId
    }

    // Calculate the exact insertion slot within the container
    const slot = this.calculateChildInsertionZone(containerElement, clientX, clientY, sourceNodeId)

    if (!slot) {
      // Fallback for edge cases
      return {
        targetId: containerId,
        placement: 'inside',
        element: containerElement,
        parentId: containerId,
      }
    }

    // Determine placement and target based on slot
    let placement: DropPlacement
    let targetId: string
    let siblingId: string | undefined

    if (slot.siblingAfterId && !slot.siblingBeforeId) {
      // Inserting before first child
      placement = 'before'
      targetId = slot.siblingAfterId
      siblingId = slot.siblingAfterId
    } else if (slot.siblingBeforeId && !slot.siblingAfterId) {
      // Inserting after last child
      placement = 'after'
      targetId = slot.siblingBeforeId
      siblingId = slot.siblingBeforeId
    } else if (slot.siblingBeforeId && slot.siblingAfterId) {
      // Inserting between two children - use 'after' relative to the one before
      placement = 'after'
      targetId = slot.siblingBeforeId
      siblingId = slot.siblingBeforeId
    } else {
      // Empty container - insert inside
      placement = 'inside'
      targetId = containerId
    }

    // Get the target element for the DropZone
    const dropTargetElement = placement === 'inside'
      ? containerElement
      : containerElement.querySelector(`[${this.options.nodeIdAttribute}="${targetId}"]`) as HTMLElement || containerElement

    // Store insertion info for indicator positioning
    const isHorizontal = this.isHorizontalLayout(containerElement)
    const containerRect = containerElement.getBoundingClientRect()

    const dropZone: DropZone = {
      targetId,
      placement,
      element: dropTargetElement,
      parentId: containerId,
      siblingId,
      insertionIndex: slot.index,
      parentDirection: isHorizontal ? 'horizontal' : 'vertical',
    }

    // Store slot info for indicator positioning (used by showIndicator)
    dropZone._slot = slot
    dropZone._containerRect = containerRect
    dropZone._isHorizontal = isHorizontal

    // Store alignment for empty container drops (can be used to set alignment property)
    if (slot.alignment) {
      dropZone.suggestedAlignment = slot.alignment
    }

    // Store cross alignment for 9-zone model
    if (slot.crossAlignment) {
      dropZone.suggestedCrossAlignment = slot.crossAlignment
    }

    // Store indicator coordinates for crosshair positioning
    if (slot.indicatorX !== undefined) {
      dropZone._indicatorX = slot.indicatorX
      dropZone._indicatorY = slot.indicatorY
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
    if (this.isScrollListening) return
    this.isScrollListening = true
    this.container.addEventListener('scroll', this.boundScrollHandler, { passive: true })
    window.addEventListener('scroll', this.boundScrollHandler, { passive: true })
  }

  /**
   * Stop listening for scroll events
   */
  private stopScrollListening(): void {
    if (!this.isScrollListening) return
    this.isScrollListening = false
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
   * Calculate the nearest drop slot between children of a parent container
   *
   * This method finds the optimal insertion position based on cursor position,
   * taking into account layout direction (horizontal/vertical) and gaps between elements.
   *
   * @param parentElement - The parent container element
   * @param clientX - Mouse X position
   * @param clientY - Mouse Y position
   * @param excludeNodeId - Node ID to exclude from children (the element being moved)
   */
  calculateChildInsertionZone(
    parentElement: HTMLElement,
    clientX: number,
    clientY: number,
    excludeNodeId?: string
  ): DropSlot | null {
    const children = this.getChildrenWithNodeId(parentElement, excludeNodeId)
    const isHorizontal = this.isHorizontalLayout(parentElement)
    const parentRect = parentElement.getBoundingClientRect()

    // If no children, calculate position based on:
    // 1. Container's existing alignment (justify-content)
    // 2. Cursor position within container (allows user to choose alignment)
    // Uses 9-zone model: both main axis and cross axis
    if (children.length === 0) {
      const computedStyle = window.getComputedStyle(parentElement)
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0

      // Content area bounds for both axes
      const contentLeft = parentRect.left + paddingLeft
      const contentRight = parentRect.right - paddingRight
      const contentTop = parentRect.top + paddingTop
      const contentBottom = parentRect.bottom - paddingBottom
      const contentWidth = contentRight - contentLeft
      const contentHeight = contentBottom - contentTop
      const contentCenterX = contentLeft + contentWidth / 2
      const contentCenterY = contentTop + contentHeight / 2

      // Calculate relative position on both axes (0 = start, 1 = end)
      const relativeX = (clientX - contentLeft) / contentWidth
      const relativeY = (clientY - contentTop) / contentHeight

      // Determine horizontal alignment (left/center/right)
      let horizontalAlignment: 'start' | 'center' | 'end'
      let indicatorX: number
      if (relativeX < ZONE.THIRD_START) {
        horizontalAlignment = 'start'
        indicatorX = contentLeft
      } else if (relativeX > ZONE.THIRD_END) {
        horizontalAlignment = 'end'
        indicatorX = contentRight
      } else {
        horizontalAlignment = 'center'
        indicatorX = contentCenterX
      }

      // Determine vertical alignment (top/center/bottom)
      let verticalAlignment: 'start' | 'center' | 'end'
      let indicatorY: number
      if (relativeY < ZONE.THIRD_START) {
        verticalAlignment = 'start'
        indicatorY = contentTop
      } else if (relativeY > ZONE.THIRD_END) {
        verticalAlignment = 'end'
        indicatorY = contentBottom
      } else {
        verticalAlignment = 'center'
        indicatorY = contentCenterY
      }

      // Main axis indicator position (for the line)
      const indicatorPosition = isHorizontal ? indicatorX : indicatorY
      // Main axis alignment
      const alignment = isHorizontal ? horizontalAlignment : verticalAlignment
      // Cross axis alignment
      const crossAlignment = isHorizontal ? verticalAlignment : horizontalAlignment

      const slot: DropSlot = {
        index: 0,
        siblingBeforeId: null,
        siblingAfterId: null,
        indicatorPosition,
        siblingBeforeRect: null,
        siblingAfterRect: null,
        alignment,
        crossAlignment,
        indicatorX,
        indicatorY,
      }

      return slot
    }

    // Cursor position on the relevant axis
    const cursorPos = isHorizontal ? clientX : clientY

    // Calculate slot positions (n+1 slots for n children)
    // Slots are between children and at the edges
    const slots: Array<{
      position: number
      index: number
      beforeChild: { element: HTMLElement; nodeId: string; rect: DOMRect } | null
      afterChild: { element: HTMLElement; nodeId: string; rect: DOMRect } | null
    }> = []

    // Get rects for all children
    const childRects = children.map(({ element, nodeId }) => ({
      element,
      nodeId,
      rect: element.getBoundingClientRect(),
    }))

    // Gap between elements (estimate from CSS or use default)
    const GAP_OFFSET = 4 // Small offset for visual clarity

    // Slot 0: Before first child (positioned at child's leading edge)
    const firstChild = childRects[0]
    slots.push({
      position: isHorizontal
        ? firstChild.rect.left - GAP_OFFSET
        : firstChild.rect.top - GAP_OFFSET,
      index: 0,
      beforeChild: null,
      afterChild: firstChild,
    })

    // Slots between children (positioned at midpoint of gap)
    for (let i = 0; i < childRects.length - 1; i++) {
      const before = childRects[i]
      const after = childRects[i + 1]

      slots.push({
        position: isHorizontal
          ? (before.rect.right + after.rect.left) / 2
          : (before.rect.bottom + after.rect.top) / 2,
        index: i + 1,
        beforeChild: before,
        afterChild: after,
      })
    }

    // Last slot: After last child (positioned at child's trailing edge)
    const lastChild = childRects[childRects.length - 1]
    slots.push({
      position: isHorizontal
        ? lastChild.rect.right + GAP_OFFSET
        : lastChild.rect.bottom + GAP_OFFSET,
      index: childRects.length,
      beforeChild: lastChild,
      afterChild: null,
    })

    // Find nearest slot
    let nearestSlot = slots[0]
    let minDistance = Math.abs(cursorPos - slots[0].position)

    for (let i = 1; i < slots.length; i++) {
      const distance = Math.abs(cursorPos - slots[i].position)
      if (distance < minDistance) {
        minDistance = distance
        nearestSlot = slots[i]
      }
    }

    return {
      index: nearestSlot.index,
      siblingBeforeId: nearestSlot.beforeChild?.nodeId ?? null,
      siblingAfterId: nearestSlot.afterChild?.nodeId ?? null,
      indicatorPosition: nearestSlot.position,
      siblingBeforeRect: nearestSlot.beforeChild?.rect ?? null,
      siblingAfterRect: nearestSlot.afterChild?.rect ?? null,
    }
  }

  /**
   * Get children of an element that have node IDs
   */
  private getChildrenWithNodeId(
    parentElement: HTMLElement,
    excludeNodeId?: string
  ): Array<{ element: HTMLElement; nodeId: string }> {
    const result: Array<{ element: HTMLElement; nodeId: string }> = []

    for (const child of Array.from(parentElement.children)) {
      const element = child as HTMLElement
      const nodeId = element.getAttribute(this.options.nodeIdAttribute)

      if (nodeId && nodeId !== excludeNodeId) {
        result.push({ element, nodeId })
      }
    }

    return result
  }

  /**
   * Show visual indicator for drop zone
   *
   * New approach: Always show a line at the exact insertion position.
   * Uses slot information from calculateFromPoint for precise positioning.
   */
  private showIndicator(dropZone: DropZone): void {
    const { element, placement, absolutePosition, isAbsoluteContainer } = dropZone
    const previewContainerRect = this.container.getBoundingClientRect()

    // Handle absolute positioning indicator (crosshair)
    if (isAbsoluteContainer && absolutePosition) {
      const rect = element.getBoundingClientRect()
      this.showAbsolutePositionIndicator(element, rect, previewContainerRect, absolutePosition)
      return
    }

    // Get slot info stored during calculation
    const slot = dropZone._slot
    const dropContainerRect = dropZone._containerRect
    const isHorizontal = dropZone._isHorizontal

    // Always show a line indicator - even for 'inside' placement on empty containers
    if (!this.indicatorElement || !this.startDotElement || !this.endDotElement) {
      return
    }

    // If we don't have slot info, we can't position the line properly
    if (!slot) {
      return
    }

    // For empty containers (placement === 'inside'), use slot info for positioning
    // Line indicator positioned based on cross-axis alignment (consistent with non-empty containers)
    if (placement === 'inside') {
      const rect = element.getBoundingClientRect()
      const isHorizontalLayout = isHorizontal ?? this.isHorizontalLayout(element)

      // Get content area for proper line positioning (accounting for padding)
      const computedStyle = window.getComputedStyle(element)
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0

      const contentLeft = rect.left + paddingLeft
      const contentRight = rect.right - paddingRight
      const contentTop = rect.top + paddingTop
      const contentBottom = rect.bottom - paddingBottom
      const contentWidth = contentRight - contentLeft
      const contentHeight = contentBottom - contentTop

      // Get indicator positions from dropZone (stored during calculation)
      const indicatorX = dropZone._indicatorX
      const indicatorY = dropZone._indicatorY

      // Calculate line position based on cross-axis alignment
      const crossAlignment = dropZone.suggestedCrossAlignment

      if (isHorizontalLayout) {
        // Vertical line for horizontal container
        // Main axis position (left/center/right)
        const lineLeft = slot.indicatorPosition - previewContainerRect.left

        // Cross axis determines line height/position (top/center/bottom portion)
        let lineTop: number
        let lineHeight: number
        const lineSegmentHeight = contentHeight / 3

        if (crossAlignment === 'start') {
          lineTop = contentTop - previewContainerRect.top
          lineHeight = lineSegmentHeight
        } else if (crossAlignment === 'end') {
          lineTop = contentBottom - previewContainerRect.top - lineSegmentHeight
          lineHeight = lineSegmentHeight
        } else {
          // center - show middle third
          lineTop = contentTop - previewContainerRect.top + lineSegmentHeight
          lineHeight = lineSegmentHeight
        }

        Object.assign(this.indicatorElement.style, {
          display: 'block',
          left: `${lineLeft}px`,
          top: `${lineTop}px`,
          width: `${LAYOUT.LINE_WIDTH}px`,
          height: `${lineHeight}px`,
        })
        const dotLeftOffset = lineLeft - LAYOUT.DOT_CENTER_OFFSET
        Object.assign(this.startDotElement.style, {
          display: 'block',
          left: `${dotLeftOffset}px`,
          top: `${lineTop - LAYOUT.DOT_END_OFFSET}px`,
        })
        Object.assign(this.endDotElement.style, {
          display: 'block',
          left: `${dotLeftOffset}px`,
          top: `${lineTop + lineHeight - LAYOUT.DOT_END_OFFSET}px`,
        })
      } else {
        // Horizontal line for vertical container
        // Main axis position (top/center/bottom)
        const lineTop = slot.indicatorPosition - previewContainerRect.top

        // Cross axis determines line width/position (left/center/right portion)
        let lineLeft: number
        let lineWidth: number
        const lineSegmentWidth = contentWidth / 3

        if (crossAlignment === 'start') {
          lineLeft = contentLeft - previewContainerRect.left
          lineWidth = lineSegmentWidth
        } else if (crossAlignment === 'end') {
          lineLeft = contentRight - previewContainerRect.left - lineSegmentWidth
          lineWidth = lineSegmentWidth
        } else {
          // center - show middle third
          lineLeft = contentLeft - previewContainerRect.left + lineSegmentWidth
          lineWidth = lineSegmentWidth
        }

        Object.assign(this.indicatorElement.style, {
          display: 'block',
          left: `${lineLeft}px`,
          top: `${lineTop}px`,
          width: `${lineWidth}px`,
          height: `${LAYOUT.LINE_WIDTH}px`,
        })
        const dotTopOffset = lineTop - LAYOUT.DOT_CENTER_OFFSET
        Object.assign(this.startDotElement.style, {
          display: 'block',
          left: `${lineLeft - LAYOUT.DOT_END_OFFSET}px`,
          top: `${dotTopOffset}px`,
        })
        Object.assign(this.endDotElement.style, {
          display: 'block',
          left: `${lineLeft + lineWidth - LAYOUT.DOT_END_OFFSET}px`,
          top: `${dotTopOffset}px`,
        })
      }

      return
    }

    // Use slot information for precise line positioning
    const containerRect = dropContainerRect || element.getBoundingClientRect()

    if (isHorizontal) {
      // Vertical line for horizontal layouts
      const lineLeft = slot.indicatorPosition - previewContainerRect.left

      Object.assign(this.indicatorElement.style, {
        display: 'block',
        left: `${lineLeft}px`,
        top: `${containerRect.top - previewContainerRect.top}px`,
        width: `${LAYOUT.LINE_WIDTH}px`,
        height: `${containerRect.height}px`,
      })

      const dotLeftOffset = lineLeft - LAYOUT.DOT_CENTER_OFFSET
      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${dotLeftOffset}px`,
        top: `${containerRect.top - previewContainerRect.top - LAYOUT.DOT_END_OFFSET}px`,
      })
      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${dotLeftOffset}px`,
        top: `${containerRect.bottom - previewContainerRect.top - LAYOUT.DOT_END_OFFSET}px`,
      })
    } else {
      // Horizontal line for vertical layouts
      const lineTop = slot.indicatorPosition - previewContainerRect.top

      Object.assign(this.indicatorElement.style, {
        display: 'block',
        top: `${lineTop}px`,
        left: `${containerRect.left - previewContainerRect.left}px`,
        width: `${containerRect.width}px`,
        height: `${LAYOUT.LINE_WIDTH}px`,
      })

      // Position dots at left and right of horizontal line
      const dotTopOffset = lineTop - LAYOUT.DOT_CENTER_OFFSET
      Object.assign(this.startDotElement.style, {
        display: 'block',
        left: `${containerRect.left - previewContainerRect.left - LAYOUT.DOT_END_OFFSET}px`,
        top: `${dotTopOffset}px`,
      })
      Object.assign(this.endDotElement.style, {
        display: 'block',
        left: `${containerRect.right - previewContainerRect.left - LAYOUT.DOT_END_OFFSET}px`,
        top: `${dotTopOffset}px`,
      })
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
   * Show absolute position indicator (crosshair + position label)
   * For dropping into abs containers
   */
  private showAbsolutePositionIndicator(
    element: HTMLElement,
    rect: DOMRect,
    containerRect: DOMRect,
    position: AbsolutePosition
  ): void {
    // Also highlight parent element with subtle style
    this.highlightElement(element)

    // Ensure crosshair elements exist
    this.ensureCrosshairElements()

    const posX = rect.left - containerRect.left + position.x
    const posY = rect.top - containerRect.top + position.y

    // Horizontal crosshair line
    if (this.crosshairHElement) {
      Object.assign(this.crosshairHElement.style, {
        display: 'block',
        position: 'absolute',
        left: `${rect.left - containerRect.left}px`,
        top: `${posY}px`,
        width: `${rect.width}px`,
        height: '1px',
        backgroundColor: '#3B82F6',
        opacity: '0.5',
        pointerEvents: 'none',
        zIndex: LAYOUT.LINE_Z_INDEX,
      })
    }

    // Vertical crosshair line
    if (this.crosshairVElement) {
      Object.assign(this.crosshairVElement.style, {
        display: 'block',
        position: 'absolute',
        left: `${posX}px`,
        top: `${rect.top - containerRect.top}px`,
        width: '1px',
        height: `${rect.height}px`,
        backgroundColor: '#3B82F6',
        opacity: '0.5',
        pointerEvents: 'none',
        zIndex: LAYOUT.LINE_Z_INDEX,
      })
    }

    // Position label showing x, y coordinates
    if (this.positionLabelElement) {
      Object.assign(this.positionLabelElement.style, {
        display: 'block',
        position: 'absolute',
        left: `${posX + 8}px`,
        top: `${posY + 8}px`,
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
      })
      this.positionLabelElement.textContent = `x: ${position.x}, y: ${position.y}`
    }
  }

  /**
   * Ensure crosshair elements exist in the DOM
   */
  private ensureCrosshairElements(): void {
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

    // Hide semantic zone indicator
    if (this.semanticZoneElement) {
      this.semanticZoneElement.style.display = 'none'
    }

    // Hide crosshair indicators
    if (this.crosshairHElement) {
      this.crosshairHElement.style.display = 'none'
    }
    if (this.crosshairVElement) {
      this.crosshairVElement.style.display = 'none'
    }
    if (this.positionLabelElement) {
      this.positionLabelElement.style.display = 'none'
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
   * Delegates to shared utility for consistency across codebase
   */
  private isHorizontalLayout(element: HTMLElement): boolean {
    return isHorizontalLayoutUtil(element)
  }

  /**
   * @deprecated Use isHorizontalLayout() instead. This method is kept for backwards compatibility.
   */
  getLayoutDirection(element: HTMLElement): 'horizontal' | 'vertical' {
    return this.isHorizontalLayout(element) ? 'horizontal' : 'vertical'
  }

  /**
   * Check if an element is an absolute layout container
   * An abs container has position: relative (set by the `abs` property)
   * and its children use x/y for positioning
   */
  private isAbsoluteLayoutContainer(element: HTMLElement): boolean {
    const computedStyle = window.getComputedStyle(element)
    const position = computedStyle.position

    // Check for position: relative (required for abs children)
    if (position !== 'relative') {
      return false
    }

    // Check for data-layout attribute (Mirror-specific)
    const layout = element.dataset.layout
    if (layout === 'abs' || layout === 'absolute') {
      return true
    }

    // Heuristic: If the element has position: relative AND no flex/grid display,
    // AND the element has an explicit data-abs attribute, it's an abs container
    // For now, we'll use a data attribute to mark abs containers explicitly
    if (element.dataset.mirrorAbs === 'true') {
      return true
    }

    // Alternative: Check if element has the 'abs' class or attribute
    // This gives us a way to identify abs containers in the DOM
    return element.classList.contains('mirror-abs-container')
  }

  /**
   * Calculate absolute position relative to container
   */
  private calculateAbsolutePosition(
    clientX: number,
    clientY: number,
    containerRect: DOMRect
  ): AbsolutePosition {
    return {
      x: Math.round(clientX - containerRect.left),
      y: Math.round(clientY - containerRect.top),
    }
  }

  /**
   * Check if two drop zones are the same
   */
  private isSameDropZone(a: DropZone | null, b: DropZone | null): boolean {
    if (!a && !b) return true
    if (!a || !b) return false

    // Compare basic properties
    if (a.targetId !== b.targetId ||
        a.placement !== b.placement ||
        a.semanticZone !== b.semanticZone) {
      return false
    }

    // Compare suggestedAlignment for empty container drops
    // This allows indicator to update as cursor moves through alignment zones
    if (a.suggestedAlignment !== b.suggestedAlignment) {
      return false
    }

    // Compare crossAlignment for 9-zone model
    if (a.suggestedCrossAlignment !== b.suggestedCrossAlignment) {
      return false
    }

    // Compare absolutePosition if present
    if (a.absolutePosition && b.absolutePosition) {
      return a.absolutePosition.x === b.absolutePosition.x &&
             a.absolutePosition.y === b.absolutePosition.y
    }

    // Both must be null/undefined to be equal
    return a.absolutePosition === b.absolutePosition
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
      if (this.semanticZoneElement && this.semanticZoneElement.parentNode) {
        this.semanticZoneElement.parentNode.removeChild(this.semanticZoneElement)
      }
      this.semanticZoneElement = null

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
    if (this.semanticZoneElement && this.semanticZoneElement.parentNode) {
      this.semanticZoneElement.parentNode.removeChild(this.semanticZoneElement)
    }

    // Remove crosshair elements
    if (this.crosshairHElement && this.crosshairHElement.parentNode) {
      this.crosshairHElement.parentNode.removeChild(this.crosshairHElement)
    }
    if (this.crosshairVElement && this.crosshairVElement.parentNode) {
      this.crosshairVElement.parentNode.removeChild(this.crosshairVElement)
    }
    if (this.positionLabelElement && this.positionLabelElement.parentNode) {
      this.positionLabelElement.parentNode.removeChild(this.positionLabelElement)
    }

    this.indicatorElement = null
    this.startDotElement = null
    this.endDotElement = null
    this.semanticZoneElement = null
    this.crosshairHElement = null
    this.crosshairVElement = null
    this.positionLabelElement = null
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
