/**
 * System Module
 *
 * Hexagonal architecture for Drag & Drop operations.
 */

// ============================================
// Legacy Types (deprecated, for backwards compatibility)
// ============================================

/** @deprecated Use DragDropBootstrapConfig instead */
export type { DragDropConfig } from './types'
/** @deprecated Use DragDropController instead */
export type { DragDropSystem } from './types'
/** @deprecated Use NewDragState from state-machine.ts instead */
export type { DragState } from './types'
export {
  detectTarget,
  findClosestTarget,
  getChildRects,
  getSiblingRects,
  getContainerRect,
} from './target-detector'

// ============================================
// Hexagonal Architecture
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
  type NativeComponentDragData,
} from './adapters'

// Bootstrap integration helpers
export {
  bootstrapDragDrop,
  createRenderIntegration,
  createTestBootstrap,
  type DragDropBootstrapConfig,
  type DragDropBootstrapResult,
} from './bootstrap-example'
