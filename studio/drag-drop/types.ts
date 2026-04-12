/**
 * Drag & Drop Type Definitions
 *
 * Central type definitions for the drag-drop system.
 */

// ============================================================================
// Geometry
// ============================================================================

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// ============================================================================
// Drag Source
// ============================================================================

export type DragSourceType = 'palette' | 'canvas'

export interface DragSource {
  type: DragSourceType

  // Palette source
  componentId?: string // For template lookup (e.g., 'zag-dialog')
  componentName?: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]

  // Canvas source
  nodeId?: string
  element?: HTMLElement

  // Size for ghost indicator (used in absolute positioning)
  size?: Size
}

export interface ComponentChild {
  template: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]
  isSlot?: boolean
  isItem?: boolean
}

// ============================================================================
// Drop Target
// ============================================================================

export type LayoutType = 'flex' | 'positioned' | 'none'
export type Direction = 'horizontal' | 'vertical'

export interface DropTarget {
  nodeId: string
  element: HTMLElement
  layoutType: LayoutType
  direction: Direction | null // null for positioned layouts where direction doesn't apply
  hasChildren: boolean
  isPositioned: boolean
}

// ============================================================================
// Drop Result
// ============================================================================

export type Placement = 'before' | 'after' | 'inside' | 'absolute'

export interface AlignmentZone {
  row: 'top' | 'middle' | 'bottom'
  col: 'left' | 'center' | 'right'
}

export interface DropResult {
  target: DropTarget
  placement: Placement
  /** Target element for before/after placement */
  targetId: string
  /** Absolute position for positioned containers */
  position?: Point
  /** Alignment zone for empty flex containers */
  zone?: AlignmentZone
  /** Insertion index for flex containers */
  insertionIndex?: number
  /** True if this drop would result in no change (element stays in place) */
  isNoOp?: boolean
  /** Ghost size for absolute positioning visual hint */
  ghostSize?: Size
}

// ============================================================================
// Visual Hints
// ============================================================================

export type VisualHintType = 'line' | 'zone' | 'outline' | 'ghost'

export interface VisualHint {
  type: VisualHintType
  rect: Rect
  direction?: 'horizontal' | 'vertical'
  zone?: AlignmentZone
  guides?: SnapGuide[]
  /** For ghost type: the size of the ghost element */
  ghostSize?: Size
}

// ============================================================================
// Snap
// ============================================================================

export interface SnapConfig {
  /** Pixel threshold for snapping */
  threshold: number
  /** Grid size (0 = disabled) */
  gridSize: number
  /** Snap to container edges */
  snapToEdges: boolean
  /** Snap to container center */
  snapToCenter: boolean
  /** Snap to sibling edges/centers */
  snapToSiblings: boolean
}

export type SnapGuideType = 'edge' | 'center' | 'sibling' | 'grid'

export interface SnapGuide {
  axis: 'x' | 'y'
  position: number
  type: SnapGuideType
}

export interface SnapResult {
  position: Point
  snapped: boolean
  guides: SnapGuide[]
}

// ============================================================================
// Code Execution
// ============================================================================

export interface ExecutionResult {
  success: boolean
  newSource?: string
  newNodeId?: string
  error?: string
}

export interface CodeExecutor {
  execute(source: DragSource, result: DropResult): ExecutionResult
  duplicate(source: DragSource, result: DropResult): ExecutionResult
}

// ============================================================================
// Palette Data
// ============================================================================

export interface PaletteItemData {
  componentName: string
  properties?: string
  textContent?: string
  children?: ComponentChild[]
  defaultSize?: Size
}
