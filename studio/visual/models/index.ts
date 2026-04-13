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

// Coordinate Calculator (centralized position calculations)
export {
  calculateElementPosition,
  calculateDragDelta,
  calculateGhostPosition,
  calculateDropPosition,
  calculateAbsolutePosition,
  calculateFlexToAbsolutePosition,
  validateCoordinate,
  validatePoint,
  validateAndClampCoordinates,
  snapPointToGrid as snapPointToGridCalc,
  snapToGridSafe,
  type ValidatedCoordinates,
} from './coordinate-calculator'
