/**
 * System Module
 *
 * Exports both the legacy DragDropSystem and the new hexagonal architecture.
 */

// ============================================
// Legacy System (to be deprecated)
// ============================================

export { DragDropSystem, createDragDropSystem } from './drag-drop-system'
export type {
  DragDropConfig,
  DragDropSystem as IDragDropSystem,
  DragState,
} from './types'
export {
  detectTarget,
  findClosestTarget,
  getChildRects,
  getSiblingRects,
  getContainerRect,
} from './target-detector'

// ============================================
// New Hexagonal Architecture
// ============================================

// Controller (orchestrates everything)
export {
  DragDropController,
  createDragDropController,
  type DragDropControllerConfig,
} from './drag-drop-controller'

// State Machine (pure, testable)
export {
  transition,
  initialState,
  initialContext,
  isOverTarget,
  getSource,
  getResult,
  canDrop,
  type DragState as NewDragState,
  type DragContext,
  type DragEvent,
  type Effect,
  type TransitionResult,
} from './state-machine'

// Ports (interfaces for external dependencies)
export type {
  LayoutPort,
  StylePort,
  EventPort,
  ExtendedEventPort,
  VisualPort,
  ExecutionPort,
  TargetDetectionPort,
  DragDropPorts,
  DragStartHandler,
  DragMoveHandler,
  DragEndHandler,
  DragCancelHandler,
  KeyHandler,
  CleanupFn,
} from './ports'

// Adapters (implementations)
export {
  // Mock adapters for testing
  createMockPorts,
  createMockLayoutPort,
  createMockStylePort,
  createMockEventPort,
  createMockVisualPort,
  createMockExecutionPort,
  createMockTargetDetectionPort,
  // DOM adapters for production
  createDOMPorts,
  createDOMLayoutPort,
  createDOMStylePort,
  createDOMEventPort,
  createDOMVisualPort,
  createDOMExecutionPort,
  createDOMTargetDetectionPort,
  type DOMAdaptersConfig,
  type DOMPortsConfig,
  type DOMEventPort,
  type ExecutorDependencies,
  // Native drag adapter for ComponentPanel
  createNativeDragAdapter,
  createMockDragEvent,
  createMockComponentData,
  MIRROR_COMPONENT_MIME,
  type NativeDragAdapter,
  type NativeDragAdapterConfig,
  type ComponentDragData,
} from './adapters'

// Bootstrap integration helpers
export {
  bootstrapDragDrop,
  createRenderIntegration,
  createTestBootstrap,
  type DragDropBootstrapConfig,
  type DragDropBootstrapResult,
} from './bootstrap-example'
