/**
 * Visual Code System - Module Exports
 *
 * Stellt visuelle Manipulation-Features für Mirror Studio bereit.
 */

// Overlay Manager
export {
  OverlayManager,
  createOverlayManager,
  type OverlayManagerConfig,
  type SemanticZone,
} from './overlay-manager'

// Resize Manager
export {
  ResizeManager,
  createResizeManager,
  type ResizeManagerConfig,
  type ResizeHandle,
  type ResizeState,
  type SizingMode,
} from './resize-manager'

// Padding Manager
export {
  PaddingManager,
  createPaddingManager,
  type PaddingManagerConfig,
  type PaddingHandle,
  type PaddingState,
} from './padding-manager'

// Gap Manager
export { GapManager, createGapManager, type GapManagerConfig, type GapState } from './gap-manager'

// Position Controls
export {
  NumericInput,
  PositionSection,
  createPositionSection,
  type NumericInputConfig,
  type PositionSectionConfig,
  type PositionValue,
} from './position-controls'

// Smart Guides (used by resize and drawing)
export {
  GuideCalculator,
  createGuideCalculator,
  GuideRenderer,
  createGuideRenderer,
  type EdgeType,
  type AlignmentEdge,
  type Guide,
  type SnapResult,
  type ElementRect,
  type SmartGuidesConfig,
} from './smart-guides'

// Constraints
export {
  ConstraintPanel,
  createConstraintPanel,
  type PinEdge,
  type PinCenter,
  type ConstraintValue,
  type ConstraintState,
  type ConstraintPanelConfig,
  type ConstraintChangeEvent,
} from './constraints'

// Draw Manager
export {
  DrawManager,
  createDrawManager,
  type DrawManagerConfig,
  type DrawState,
  type DrawResult,
} from './draw-manager'

// Snap Integration (used by resize)
export {
  SnapIntegration,
  createSnapIntegration,
  type SnapConfig as SnapIntegrationConfig,
} from './snap-integration'

// Pure Models (coordinate utilities)
export {
  // Coordinate Transformations
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
} from './models/coordinate'

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
  type ValidatedCoordinates,
} from './models/coordinate-calculator'

// Snap Calculations (used by resize and drawing)
export {
  calculateSnap,
  createSnapConfig,
  createSnapContext,
  type SnapAxis,
  type SnapResult as SnapCalcResult,
  type SnapAxisInfo,
  type Guide as SnapGuide,
  type SnapConfig,
  type SnapContext,
} from './models/snap'

// Snapping Service (token and grid snapping)
export {
  SnappingService,
  getSnappingService,
  initSnappingService,
  resetSnappingService,
  shouldBypassSnapping,
  type SnapResult as SpacingSnapResult,
  type SpacingToken,
  type SpacingPropertyType,
} from './snapping-service'

// Snap Indicator (visual feedback)
export { SnapIndicator, createSnapIndicator, type SnapIndicatorConfig } from './snap-indicator'
