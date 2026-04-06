/**
 * Strategy Type Definitions
 */

import type { Point, DragSource, DropTarget, DropResult, VisualHint, Rect } from '../types'

/**
 * Drop Strategy Interface
 *
 * Each strategy handles a specific type of drop target:
 * - AbsolutePositionStrategy: Positioned container (absolute x/y)
 * - FlexWithChildrenStrategy: Flex container with children (before/after)
 * - SimpleInsideStrategy: Empty flex container (insert as child)
 * - NonContainerStrategy: Non-container elements (before/after as sibling)
 */
export interface DropStrategy {
  /** Unique identifier for debugging */
  readonly name: string

  /**
   * Check if this strategy handles the given target
   */
  matches(target: DropTarget): boolean

  /**
   * Calculate drop result based on cursor position
   *
   * @param cursor - Current cursor position (client coordinates)
   * @param target - The drop target
   * @param source - The drag source
   * @param childRects - Rects of child elements (for flex containers)
   */
  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource,
    childRects?: ChildRect[]
  ): DropResult

  /**
   * Generate visual hint for rendering feedback
   * Returns null if no indicator should be shown (e.g., no-op position)
   */
  getVisualHint(result: DropResult, childRects?: ChildRect[], containerRect?: Rect): VisualHint | null
}

/**
 * Child element rect with node ID
 */
export interface ChildRect {
  nodeId: string
  rect: Rect
}

/**
 * Strategy Registry
 *
 * Manages registered strategies and finds the appropriate one for a target.
 */
export interface StrategyRegistry {
  /**
   * Register a strategy
   */
  register(strategy: DropStrategy): void

  /**
   * Find strategy for target (first matching wins)
   */
  findStrategy(target: DropTarget): DropStrategy | null

  /**
   * Get all registered strategies
   */
  getAll(): DropStrategy[]
}
