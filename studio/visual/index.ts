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
