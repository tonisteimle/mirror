/**
 * Smart Guides Types
 *
 * Types for alignment guide calculation and rendering.
 */

export type EdgeType = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY'

export interface AlignmentEdge {
  type: EdgeType
  position: number         // px value
  elementId: string
}

export interface Guide {
  axis: 'horizontal' | 'vertical'
  position: number
  start: number           // Line start coordinate
  end: number             // Line end coordinate
  alignedEdges: AlignmentEdge[]
}

export interface SnapResult {
  x: number               // Final X position (after snap)
  y: number               // Final Y position (after snap)
  guides: Guide[]         // Guides to display
  snappedX: boolean       // Whether X was snapped
  snappedY: boolean       // Whether Y was snapped
}

export interface ElementRect {
  id: string
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
}

export interface SmartGuidesConfig {
  /** Snap threshold in pixels */
  threshold?: number
  /** Guide line color */
  color?: string
  /** Show distance indicators */
  showDistances?: boolean
}
