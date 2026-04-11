/**
 * Drag & Drop Module
 *
 * Drag-drop system supporting:
 * - Flex layout: insert between siblings or inside containers
 * - Positioned (stacked) containers: absolute x/y positioning
 */

// Types
export type {
  Point,
  Size,
  Rect,
  DragSource,
  DragSourceType,
  DropTarget,
  LayoutType,
  Direction,
  DropResult,
  Placement,
  VisualHint,
  VisualHintType,
  ExecutionResult,
  CodeExecutor,
  PaletteItemData,
  ComponentChild,
} from './types'

// Strategies
export {
  FlexWithChildrenStrategy,
  NonContainerStrategy,
  SimpleInsideStrategy,
  AbsolutePositionStrategy,
  StrategyRegistry,
  createWebflowRegistry,
} from './strategies'

export type { DropStrategy, ChildRect } from './strategies'

// Visual
export { VisualSystem, createVisualSystem, VISUAL_IDS } from './visual'
export type { VisualSystem as IVisualSystem } from './visual'

// System
export {
  DragDropSystem,
  createDragDropSystem,
  detectTarget,
  findClosestTarget,
  getChildRects,
  getSiblingRects,
  getContainerRect,
} from './system'

export type { DragDropConfig, DragState } from './system'

// Executor
export { CodeExecutor as CodeExecutorImpl, createCodeExecutor } from './executor'
export type { CodeExecutorDependencies } from './executor'

// ============================================
// New Hexagonal Architecture (v2)
// ============================================

// Bootstrap helpers for integration
export {
  bootstrapDragDrop,
  createRenderIntegration,
  createTestBootstrap,
  type DragDropBootstrapConfig,
  type DragDropBootstrapResult,
} from './system'

// Controller
export {
  DragDropController,
  createDragDropController,
  type DragDropControllerConfig,
} from './system'

// State Machine
export {
  transition,
  initialState,
  initialContext,
  isOverTarget,
  getSource,
  getResult,
  canDrop,
  type NewDragState,
  type DragContext,
  type DragEvent,
  type Effect,
  type TransitionResult,
} from './system'

// Ports (interfaces)
export type {
  LayoutPort,
  StylePort,
  EventPort,
  ExtendedEventPort,
  VisualPort,
  ExecutionPort,
  TargetDetectionPort,
  DragDropPorts,
  CleanupFn,
} from './system'

// DOM Adapters (production)
export {
  createDOMPorts,
  createDOMLayoutPort,
  createDOMStylePort,
  createDOMEventPort,
  createDOMVisualPort,
  createDOMExecutionPort,
  createDOMTargetDetectionPort,
  type DOMEventPort,
  type DOMPortsConfig,
} from './system'

// Mock Adapters (testing)
export {
  createMockPorts,
  createMockLayoutPort,
  createMockStylePort,
  createMockEventPort,
  createMockVisualPort,
  createMockExecutionPort,
  createMockTargetDetectionPort,
} from './system'

// Native Drag Adapter (ComponentPanel integration)
export {
  createNativeDragAdapter,
  createMockDragEvent,
  createMockComponentData,
  MIRROR_COMPONENT_MIME,
  type NativeDragAdapter,
  type NativeDragAdapterConfig,
  type ComponentDragData,
} from './system'
