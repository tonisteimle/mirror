/**
 * Drag & Drop Module - Webflow Style
 *
 * Simple drag-drop system: insert between siblings or inside containers.
 * No absolute positioning, no 9-zone system.
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
  StrategyRegistry,
  createWebflowRegistry,
  calculateInsertionLineRect,
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
