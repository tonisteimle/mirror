/**
 * DropZoneCalculator - Calculates drop zones during drag operations
 *
 * Determines where a dragged component should be inserted:
 * - before: Insert as sibling before the target element
 * - after: Insert as sibling after the target element
 * - inside: Insert as child of the target element
 *
 * Architecture:
 * - Uses DropStrategyRegistry for layout-specific drop behavior (flex, absolute, grid)
 * - Uses DropIndicatorRenderer for visual indicators
 * - Calculator coordinates between strategies and renderer
 */

import {
  detectLayout,
  isHorizontalLayout as isHorizontalLayoutUtil,
  isAbsoluteLayoutContainer as isAbsoluteLayoutContainerUtil,
} from './utils/layout-detection'
import { SpatialCache, createSpatialCache } from './spatial-cache'
import {
  getDefaultRegistry,
  type DropStrategyRegistry,
  type DropContext,
  type LayoutDropResult,
  type IndicatorConfig,
} from './drop-strategies'
import {
  DropIndicatorRenderer,
  createDropIndicatorRenderer,
} from './drop-indicator-renderer'

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
  /** Internal: strategy result for indicator rendering */
  _strategyResult?: LayoutDropResult
  /** Internal: indicator config from strategy */
  _indicatorConfig?: IndicatorConfig
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
  /** Custom strategy registry (default: getDefaultRegistry()) */
  strategyRegistry?: DropStrategyRegistry
}

/**
 * DropZoneCalculator class
 *
 * Coordinates between:
 * - DropStrategyRegistry for layout-specific drop calculations
 * - DropIndicatorRenderer for visual feedback
 */
export class DropZoneCalculator {
  private container: HTMLElement
  private options: Required<Omit<DropZoneCalculatorOptions, 'strategyRegistry'>>
  private registry: DropStrategyRegistry
  private renderer: DropIndicatorRenderer

  private currentDropZone: DropZone | null = null

  // For scroll handling
  private lastClientX: number = 0
  private lastClientY: number = 0
  private lastSourceNodeId: string | undefined
  private boundScrollHandler: () => void
  private isScrollListening: boolean = false

  // BoundingRect cache with TTL for performance
  private childCache: Map<HTMLElement, Array<{ element: HTMLElement; nodeId: string; rect: DOMRect }>> = new Map()
  private cacheValidUntil: number = 0
  private static readonly CACHE_TTL = 100 // ms - cache duration for bounding rects
  private lastKnownScale: number = 1 // Track scale for cache invalidation

  // Spatial index for O(log n) element lookup on large canvases
  private spatialCache: SpatialCache
  private spatialCacheValid: boolean = false

  constructor(container: HTMLElement, options: DropZoneCalculatorOptions = {}) {
    this.container = container
    this.options = {
      nodeIdAttribute: options.nodeIdAttribute || 'data-mirror-id',
      edgeThreshold: options.edgeThreshold ?? 0.25,
      allowInside: options.allowInside ?? true,
      leafElements: options.leafElements || ['Input', 'Icon', 'Text', 'Image', 'Separator', 'Spacer', 'rect', 'circle', 'line'],
      enableSemanticZones: options.enableSemanticZones ?? true,
    }

    // Initialize strategy registry, renderer, and spatial cache
    this.registry = options.strategyRegistry ?? getDefaultRegistry()
    this.renderer = createDropIndicatorRenderer(container)
    this.spatialCache = createSpatialCache()

    this.boundScrollHandler = this.handleScroll.bind(this)
  }

  /**
   * Rebuild spatial index for fast element lookup
   * Call this when DOM structure changes significantly
   */
  rebuildSpatialIndex(): void {
    const elements = Array.from(
      this.container.querySelectorAll(`[${this.options.nodeIdAttribute}]`)
    ) as HTMLElement[]
    this.spatialCache.rebuild(elements)
    this.spatialCacheValid = true
  }

  /**
   * Calculate drop zone from mouse position using registered strategies
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
      return this.handleSelfDrop(targetElement, clientX, clientY, sourceNodeId)
    }

    // Determine container element for drop calculation
    // Pass sourceNodeId to enable move-specific logic
    const containerElement = this.determineContainerElement(targetElement, nodeId, sourceNodeId)
    if (!containerElement) {
      return null
    }

    // Use strategy-based calculation
    return this.calculateWithStrategy(containerElement, clientX, clientY, sourceNodeId)
  }

  /**
   * Handle self-drop by finding parent and calculating reorder position
   */
  private handleSelfDrop(
    targetElement: HTMLElement,
    clientX: number,
    clientY: number,
    sourceNodeId: string
  ): DropZone | null {
    const parentElement = this.findParentNodeElement(targetElement)
    if (!parentElement) {
      return null
    }

    const parentNodeId = parentElement.getAttribute(this.options.nodeIdAttribute)
    if (!parentNodeId) {
      return null
    }

    // Calculate drop in parent, excluding the source element
    return this.calculateWithStrategy(parentElement, clientX, clientY, sourceNodeId)
  }

  /**
   * Determine which container element to use for drop calculation
   *
   * Priority:
   * 1. If target IS absolute container → use absolute positioning
   * 2. If target is valid non-leaf container → use target (flex/block layout)
   * 3. If target is leaf AND parent is absolute → use absolute parent
   * 4. If target is leaf → use parent
   */
  private determineContainerElement(
    targetElement: HTMLElement,
    nodeId: string,
    sourceNodeId?: string
  ): HTMLElement | null {
    // Check if target is an absolute layout container
    if (this.isAbsoluteLayoutContainer(targetElement)) {
      return targetElement
    }

    // Find parent early - we need it for multiple checks
    const parentElement = this.findParentNodeElement(targetElement)

    // For MOVE operations: If parent is absolute container AND source is sibling,
    // use absolute parent for x/y positioning
    if (sourceNodeId && parentElement && this.isAbsoluteLayoutContainer(parentElement)) {
      // Check if source element is also a child of this absolute container
      const sourceElement = this.container.querySelector(
        `[${this.options.nodeIdAttribute}="${sourceNodeId}"]`
      ) as HTMLElement | null

      if (sourceElement) {
        const sourceParent = this.findParentNodeElement(sourceElement)
        // If source and target share the same absolute parent, use absolute positioning
        if (sourceParent === parentElement) {
          return parentElement
        }
      }
    }

    // Check if target is a valid non-leaf container
    const componentName = targetElement.dataset.mirrorName || ''
    const isLeaf = this.options.leafElements.includes(componentName)

    if (!isLeaf && this.options.allowInside) {
      // Target is a valid container - use its layout
      return targetElement
    }

    // Target is a leaf element
    // If parent is absolute, use absolute positioning
    if (parentElement && this.isAbsoluteLayoutContainer(parentElement)) {
      return parentElement
    }

    // Otherwise use parent or fallback to target
    if (parentElement) {
      return parentElement
    }

    return targetElement
  }

  /**
   * Calculate drop zone using registered strategies
   * Accounts for CSS transform scale and RTL direction
   */
  private calculateWithStrategy(
    containerElement: HTMLElement,
    clientX: number,
    clientY: number,
    sourceNodeId?: string
  ): DropZone | null {
    const strategy = this.registry.getStrategy(containerElement)
    if (!strategy) {
      // No matching strategy - return simple inside drop
      const containerId = containerElement.getAttribute(this.options.nodeIdAttribute) || 'root'
      return {
        targetId: containerId,
        placement: 'inside',
        element: containerElement,
        parentId: containerId,
      }
    }

    // Get layout info including RTL and scale
    const layoutInfo = detectLayout(containerElement)

    // Invalidate cache if scale changed (zoom in/out during drag)
    if (layoutInfo.scale !== this.lastKnownScale) {
      this.childCache.clear()
      this.cacheValidUntil = 0
      this.lastKnownScale = layoutInfo.scale
    }

    const containerRect = containerElement.getBoundingClientRect()
    const children = this.getChildrenWithNodeId(containerElement, sourceNodeId)

    // Note: We pass original client coordinates to strategies.
    // Strategies use context.scale to adjust their internal calculations.
    // This keeps the coordinate system consistent (client coords throughout).

    // Build context for strategy with RTL and scale info
    const context: DropContext = {
      clientX,
      clientY,
      sourceNodeId,
      containerRect,
      children: children.map(c => ({ element: c.element, nodeId: c.nodeId })),
      isHorizontal: layoutInfo.direction === 'horizontal',
      isRTL: layoutInfo.isRTL,
      scale: layoutInfo.scale,
    }

    // Calculate using strategy
    const result = strategy.calculateDropZone(containerElement, context)
    if (!result) {
      return null
    }

    // Convert to standard DropZone
    const dropZone = strategy.toDropZone(result, containerElement)

    // Strip semanticZone if option is disabled
    if (!this.options.enableSemanticZones) {
      delete dropZone.semanticZone
    }

    // Store strategy result and indicator config for rendering
    dropZone._strategyResult = result
    dropZone._indicatorConfig = strategy.getIndicatorConfig(result, containerRect)

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
      this.renderer.clear()

      if (dropZone) {
        this.showIndicator(dropZone)
      }

      this.currentDropZone = dropZone
    }

    return dropZone
  }

  /**
   * Show visual indicator for drop zone
   *
   * NOTE: For absolute containers, we only show container highlight.
   * The crosshair/preview is handled by DragDropManager using the unified
   * visual system (DropPreviewRenderer). This prevents duplicate indicators
   * and ensures consistent coordinate handling via CoordinateTransformer.
   */
  private showIndicator(dropZone: DropZone): void {
    const { element, absolutePosition, isAbsoluteContainer, _indicatorConfig } = dropZone

    // Handle absolute positioning: only highlight container
    // The preview/crosshair is shown by DragDropManager.handleDragOver()
    if (isAbsoluteContainer && absolutePosition) {
      // Only highlight the container - no crosshair here
      // DragDropManager shows the unified preview with correct coordinates
      this.renderer.show({ type: 'highlight', element })
      return
    }

    // Use indicator config from strategy (for flex/grid containers)
    if (_indicatorConfig) {
      const containerRect = element.getBoundingClientRect()
      this.renderer.showFromStrategyConfig(_indicatorConfig, containerRect)
    }
  }

  /**
   * Handle scroll events during drag - refresh indicator position
   */
  private handleScroll(): void {
    if (this.currentDropZone) {
      const dropZone = this.calculateFromPoint(this.lastClientX, this.lastClientY, this.lastSourceNodeId)

      this.renderer.clear()
      if (dropZone) {
        this.showIndicator(dropZone)
      }
      this.currentDropZone = dropZone
    }
  }

  /**
   * Start listening for scroll events
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
    this.renderer.clear()
    this.currentDropZone = null
    this.stopScrollListening()
    this.invalidateCache()
  }

  /**
   * Invalidate all caches (bounding rect and spatial)
   */
  invalidateCache(): void {
    this.childCache.clear()
    this.cacheValidUntil = 0
    this.spatialCache.clear()
    this.spatialCacheValid = false
  }

  /**
   * Get children of an element that have node IDs
   * Uses caching with TTL for performance
   */
  private getChildrenWithNodeId(
    parentElement: HTMLElement,
    excludeNodeId?: string
  ): Array<{ element: HTMLElement; nodeId: string; rect: DOMRect }> {
    const now = Date.now()

    // Invalidate cache if TTL expired
    if (now > this.cacheValidUntil) {
      this.childCache.clear()
    }

    let cached = this.childCache.get(parentElement)
    if (!cached) {
      cached = []
      for (const child of Array.from(parentElement.children)) {
        const element = child as HTMLElement
        const nodeId = element.getAttribute(this.options.nodeIdAttribute)
        if (nodeId) {
          cached.push({
            element,
            nodeId,
            rect: element.getBoundingClientRect(),
          })
        }
      }
      this.childCache.set(parentElement, cached)
      this.cacheValidUntil = now + DropZoneCalculator.CACHE_TTL
    }

    // Filter out excluded node
    if (excludeNodeId) {
      return cached.filter(c => c.nodeId !== excludeNodeId)
    }

    return cached
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
   * Check if an element has horizontal layout
   */
  private isHorizontalLayout(element: HTMLElement): boolean {
    return isHorizontalLayoutUtil(element)
  }

  /**
   * Check if an element is an absolute layout container
   */
  private isAbsoluteLayoutContainer(element: HTMLElement): boolean {
    return isAbsoluteLayoutContainerUtil(element)
  }

  /**
   * Check if two drop zones are the same
   */
  private isSameDropZone(a: DropZone | null, b: DropZone | null): boolean {
    if (!a && !b) return true
    if (!a || !b) return false

    if (a.targetId !== b.targetId ||
        a.placement !== b.placement ||
        a.suggestedAlignment !== b.suggestedAlignment ||
        a.suggestedCrossAlignment !== b.suggestedCrossAlignment) {
      return false
    }

    // Compare absolutePosition if present
    if (a.absolutePosition && b.absolutePosition) {
      return a.absolutePosition.x === b.absolutePosition.x &&
             a.absolutePosition.y === b.absolutePosition.y
    }

    return a.absolutePosition === b.absolutePosition
  }

  /**
   * Ensure indicator elements exist in DOM
   */
  ensureIndicators(): void {
    this.renderer.ensureElements()
  }

  /**
   * Dispose the calculator
   */
  dispose(): void {
    this.clear()
    this.renderer.dispose()
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
