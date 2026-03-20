/**
 * Visual Models - Pure, testable state and calculation logic
 *
 * These models have NO DOM dependencies and can be fully unit tested.
 *
 * Architecture:
 * - Models contain pure state and calculations
 * - Controllers (thin DOM layer) use models for logic
 * - Renderers read from models to update DOM
 */

// Drag State
export {
  DragState,
  createDragState,
  type DragPhase,
  type DragSource,
  type DragTarget,
  type DragResult,
  type DragConfig,
  type DragStateSnapshot,
  type Point,
  type Rect,
} from './drag-state'

// Coordinate Transformations
export {
  clientToCanvas,
  canvasToClient,
  elementToCanvas,
  canvasToElement,
  createCoordinateContext,
  // Rect utilities
  getCenter,
  rectToBounds,
  boundsToRect,
  pointInRect,
  rectsIntersect,
  getIntersection,
  getUnion,
  expandRect,
  contractRect,
  // Point utilities
  distance,
  delta,
  addPoints,
  subtractPoints,
  scalePoint,
  roundPoint,
  clampPoint,
  // Grid utilities
  snapToGrid,
  snapPointToGrid,
  snapRectToGrid,
  type Bounds,
  type CoordinateContext,
} from './coordinate'

// Drop Zone Detection
export {
  findDropZone,
  calculatePlacement,
  getEdgeInfo,
  findInsertionPoint,
  createEdgeIndicator,
  createInsideIndicator,
  createInsertionIndicator,
  createDropZoneConfig,
  type Placement,
  type DropZone,
  type DropCandidate,
  type DropZoneConfig,
} from './drop-zone'

// Snap Calculations
export {
  calculateSnap,
  snapPointToGrid as snapPointToGridWithResult,
  snapRectToGrid as snapRectToGridWithResult,
  createSnapConfig,
  createSnapContext,
  type SnapAxis,
  type SnapResult,
  type SnapAxisInfo,
  type Guide,
  type SnapConfig,
  type SnapContext,
} from './snap'

// Alignment Zone (9-zone detection for empty containers)
export {
  detectZone,
  getZoneId,
  getZoneCenter,
  getVerticalContainerAlign,
  getHorizontalContainerAlign,
  getAlignProperty,
  detectAlignmentZone,
  calculateIndicatorRect,
  type HorizontalZone,
  type VerticalZone,
  type ZoneId,
  type ContainerDirection,
  type AlignmentZoneResult,
} from './alignment-zone'
