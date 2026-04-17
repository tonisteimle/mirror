/**
 * Drag & Drop v3 - Shared Types
 */

export interface Point {
  x: number
  y: number
}

export interface ChildInfo {
  nodeId: string
  rect: DOMRect
}

export type FlexLayout = 'flex-row' | 'flex-column'

/** Layout type including absolute/stacked positioning */
export type LayoutType = 'flex-row' | 'flex-column' | 'absolute'

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
export type DropTarget = FlexDropTarget | AbsoluteDropTarget | AlignedDropTarget

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
