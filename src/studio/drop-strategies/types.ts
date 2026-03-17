/**
 * Drop Strategy Types
 *
 * Defines interfaces for layout-specific drop behavior.
 * Each layout type (flex, absolute, grid) has different drop semantics.
 */

import type { DropZone, DropPlacement } from '../drop-zone-calculator'

/**
 * Supported layout types for drop strategies
 */
export type LayoutType = 'flex' | 'absolute' | 'grid'

/**
 * Context passed to strategy methods
 */
export interface DropContext {
  /** Mouse/touch X position (client coordinates) */
  clientX: number
  /** Mouse/touch Y position (client coordinates) */
  clientY: number
  /** Node ID of element being dragged (for move operations) */
  sourceNodeId?: string
  /** Container's bounding rect */
  containerRect: DOMRect
  /** Children elements with their node IDs */
  children: Array<{ element: HTMLElement; nodeId: string }>
  /** Whether container uses horizontal layout (for flex) */
  isHorizontal?: boolean
  /** Whether container uses RTL direction */
  isRTL?: boolean
  /** CSS transform scale factor (1 = no scaling) */
  scale?: number
}

/**
 * Result of drop zone calculation
 * Extended by each strategy with layout-specific data
 */
export interface StrategyDropResult {
  /** Base placement type */
  placement: DropPlacement
  /** Target node ID */
  targetId: string
  /** Parent container ID */
  parentId: string
  /** Sibling reference for before/after */
  siblingId?: string
  /** Insertion index */
  insertionIndex?: number
}

/**
 * Flex-specific drop result
 */
export interface FlexDropResult extends StrategyDropResult {
  layoutType: 'flex'
  /** Direction of flex container */
  direction: 'horizontal' | 'vertical'
  /** Alignment suggestion for empty containers */
  suggestedAlignment?: 'start' | 'center' | 'end'
  suggestedCrossAlignment?: 'start' | 'center' | 'end'
}

/**
 * Absolute-specific drop result
 */
export interface AbsoluteDropResult extends StrategyDropResult {
  layoutType: 'absolute'
  /** X position relative to container */
  x: number
  /** Y position relative to container */
  y: number
  /** Snap information (future: snap to guides, other elements) */
  snap?: {
    x?: { value: number; type: 'guide' | 'element' | 'grid' }
    y?: { value: number; type: 'guide' | 'element' | 'grid' }
  }
}

/**
 * Grid-specific drop result (future)
 */
export interface GridDropResult extends StrategyDropResult {
  layoutType: 'grid'
  /** Grid row (1-based) */
  row: number
  /** Grid column (1-based) */
  column: number
  /** Row span */
  rowSpan?: number
  /** Column span */
  colSpan?: number
}

/**
 * Union of all layout-specific results
 */
export type LayoutDropResult = FlexDropResult | AbsoluteDropResult | GridDropResult

/**
 * Indicator rendering information
 */
export interface IndicatorConfig {
  /** Type of indicator to show */
  type: 'line' | 'crosshair' | 'cell' | 'zone'
  /** Position relative to container */
  x: number
  y: number
  /** Size (width for vertical line, height for horizontal) */
  width?: number
  height?: number
  /** Additional visual hints */
  label?: string
  /** Dots at line endpoints */
  showDots?: boolean
  /** For 9-zone indicator: main axis alignment */
  alignment?: 'start' | 'center' | 'end'
  /** For 9-zone indicator: cross axis alignment */
  crossAlignment?: 'start' | 'center' | 'end'
  /** Layout direction for proper zone rendering */
  direction?: 'horizontal' | 'vertical'
}

/**
 * Layout Drop Strategy Interface
 *
 * Implement this interface for each layout type.
 * The DropZoneCalculator uses these strategies to handle
 * layout-specific drop behavior.
 */
export interface LayoutDropStrategy {
  /**
   * Layout type identifier
   */
  readonly type: LayoutType

  /**
   * Check if an element uses this layout type
   *
   * @param element - The container element to check
   * @returns true if this strategy should handle the element
   */
  matches(element: HTMLElement): boolean

  /**
   * Calculate the drop zone for this layout type
   *
   * @param container - The container element
   * @param context - Drop context with mouse position, children, etc.
   * @returns Layout-specific drop result or null if no valid drop zone
   */
  calculateDropZone(
    container: HTMLElement,
    context: DropContext
  ): LayoutDropResult | null

  /**
   * Get indicator configuration for visual feedback
   *
   * @param result - The calculated drop result
   * @param containerRect - Container's bounding rect
   * @returns Configuration for rendering the drop indicator
   */
  getIndicatorConfig(
    result: LayoutDropResult,
    containerRect: DOMRect
  ): IndicatorConfig

  /**
   * Get properties to add to the inserted/moved element
   *
   * For flex: typically none
   * For absolute: x, y
   * For grid: row, col
   *
   * @param result - The calculated drop result
   * @returns Key-value pairs of properties to add
   */
  getInsertionProperties(result: LayoutDropResult): Record<string, string>

  /**
   * Convert strategy result to standard DropZone
   *
   * This bridges the strategy result to the existing DropZone interface
   * for compatibility with DragDropManager and CodeModifier.
   *
   * @param result - The calculated drop result
   * @param element - The target element
   * @returns Standard DropZone object
   */
  toDropZone(result: LayoutDropResult, element: HTMLElement): DropZone
}

/**
 * Registry for drop strategies
 * Allows dynamic registration of new layout strategies
 */
export interface DropStrategyRegistry {
  /**
   * Register a strategy for a layout type
   */
  register(strategy: LayoutDropStrategy): void

  /**
   * Get strategy for an element
   * Returns the first matching strategy, or null
   */
  getStrategy(element: HTMLElement): LayoutDropStrategy | null

  /**
   * Get all registered strategies
   */
  getAll(): LayoutDropStrategy[]
}
