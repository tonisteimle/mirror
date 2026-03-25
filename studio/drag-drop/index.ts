/**
 * Drag & Drop Module
 *
 * New drag-drop system based on Pragmatic DnD.
 *
 * @example
 * ```typescript
 * import { DragDropSystem, createDefaultRegistry } from './drag-drop'
 *
 * const system = new DragDropSystem(previewContainer, {
 *   registry: createDefaultRegistry(),
 *   codeExecutor: myCodeExecutor,
 * })
 *
 * system.initialize()
 * ```
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
  AlignmentZone,
  VisualHint,
  VisualHintType,
  SnapConfig,
  SnapGuide,
  SnapResult,
  ExecutionResult,
  CodeExecutor,
  PaletteItemData,
  ComponentChild,
} from './types'

// Strategies
export {
  FlexWithChildrenStrategy,
  EmptyFlexStrategy,
  PositionedStrategy,
  NonContainerStrategy,
  StrategyRegistry,
  createDefaultRegistry,
  detectZone,
  getZoneRect,
  zoneToDSLProperties,
  calculateInsertionLineRect,
  getDefaultComponentSize,
} from './strategies'

export type { DropStrategy, ChildRect } from './strategies'

// Snap
export { calculateSnap, DEFAULT_SNAP_CONFIG } from './snap'

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
  isPositionedContainer,
} from './system'

export type { DragDropConfig, DragState } from './system'

// Executor
export { CodeExecutor as CodeExecutorImpl, createCodeExecutor } from './executor'
export type { CodeExecutorDependencies } from './executor'
