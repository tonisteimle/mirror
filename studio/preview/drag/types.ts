/**
 * Drag & Drop v3 - Shared Types
 */

// Re-export the canonical Point so existing
// `import { Point } from '.../drag/types'` keeps working.
export type { Point } from '../../visual/models/coordinate'
import type { Point } from '../../visual/models/coordinate'

export interface ChildInfo {
  nodeId: string
  rect: DOMRect
}

export type FlexLayout = 'flex-row' | 'flex-column'

/** Layout type including absolute/stacked + grid (cell-aware) positioning */
export type LayoutType = 'flex-row' | 'flex-column' | 'absolute' | 'grid'

export interface HitResult {
  containerId: string
  layout: LayoutType
  containerRect: DOMRect
}

export interface InsertionResult {
  index: number
  linePosition: Point
  lineSize: number
  orientation: 'horizontal' | 'vertical'
}

export interface DragSource {
  type: 'palette' | 'canvas'
  componentName?: string
  template?: string
  nodeId?: string
  /** Grab offset - where user clicked relative to element's top-left (for canvas moves) */
  grabOffset?: Point
}

/** Discriminated union for drop targets */
export type DropTarget = FlexDropTarget | AbsoluteDropTarget | AlignedDropTarget | GridDropTarget

/** Drop target for CSS-grid containers (cell-aware placement). */
export interface GridDropTarget {
  mode: 'grid'
  containerId: string
  /** 1-indexed cell column the cursor lands on. */
  gridX: number
  /** 1-indexed cell row the cursor lands on. */
  gridY: number
  /** Span carried over from the dragged element (defaults to 1). */
  gridW: number
  gridH: number
  /** Index used by moveNode for sibling ordering inside the grid. */
  insertionIndex: number
}

/** Drop target for flex/grid layouts (index-based) */
export interface FlexDropTarget {
  mode: 'flex'
  containerId: string
  insertionIndex: number
}

/** Drop target for absolute/stacked layouts (position-based) */
export interface AbsoluteDropTarget {
  mode: 'absolute'
  containerId: string
  position: Point
  /** Insertion index (typically 'last' for stacked) */
  insertionIndex: number
}

/** Drop target for empty containers with alignment (9-point grid) */
export interface AlignedDropTarget {
  mode: 'aligned'
  containerId: string
  /** Alignment property to add (tl, tc, tr, cl, center, cr, bl, bc, br) */
  alignmentProperty: string
}
