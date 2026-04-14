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

export interface HitResult {
  containerId: string
  layout: FlexLayout
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
}

export interface DropTarget {
  containerId: string
  insertionIndex: number
}
