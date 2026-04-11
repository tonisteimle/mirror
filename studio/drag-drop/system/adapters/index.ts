/**
 * Drag & Drop Adapters
 *
 * Export all adapter implementations for the Port interfaces.
 */

// Mock adapters for testing
export {
  createMockPorts,
  createMockLayoutPort,
  createMockStylePort,
  createMockEventPort,
  createMockVisualPort,
  createMockExecutionPort,
  createMockTargetDetectionPort,
} from './mock-adapters'

// DOM adapters for production
export {
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
} from './dom-adapters'

// Native drag adapter for ComponentPanel integration
export {
  createNativeDragAdapter,
  createMockDragEvent,
  createMockComponentData,
  MIRROR_COMPONENT_MIME,
  type NativeDragAdapter,
  type NativeDragAdapterConfig,
  type NativeComponentDragData,
} from './native-drag-adapter'
