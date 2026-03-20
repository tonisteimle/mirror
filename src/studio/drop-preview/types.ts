/**
 * Drop Preview Types
 *
 * Simple, focused types for the drop preview system.
 */

/**
 * 2D point
 */
export interface Point {
  x: number
  y: number
}

/**
 * Size dimensions
 */
export interface Size {
  width: number
  height: number
}

/**
 * Grid configuration
 */
export interface GridConfig {
  enabled: boolean
  size: number
}

/**
 * Unified drag context - set once at dragstart
 * Contains everything needed for preview
 */
export interface DragContext {
  /** Component type name */
  componentName: string
  /** Pre-calculated size (no recalculation needed) */
  size: Size
  /** Source node ID (only for move operations) */
  sourceNodeId?: string
}
