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

// Drag Drop Visualizer
export {
  DragDropVisualizer,
  createDragDropVisualizer,
  type DragDropVisualizerConfig,
  type DropZoneInfo,
} from './drag-drop-visualizer'

// Drop Handler
export {
  DropHandler,
  createDropHandler,
  type DropData,
  type DropHandlerOptions,
} from './drop-handler'

// Element Mover
export {
  ElementMover,
  createElementMover,
  type ElementMoverConfig,
  type MoveResult,
  type MoveCallback,
} from './element-mover'

// Drop Indicator
export {
  DropIndicator,
  createDropIndicator,
  type DropIndicatorConfig,
} from './drop-indicator'

// Position Controls
export {
  NumericInput,
  PositionSection,
  createPositionSection,
  type NumericInputConfig,
  type PositionSectionConfig,
  type PositionValue,
} from './position-controls'

// Smart Guides
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
