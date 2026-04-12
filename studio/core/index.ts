/**
 * Core Module - State, Events, Commands, Context
 */

export { state, actions, selectors, computed, type StudioState, type SelectionOrigin, type BreadcrumbItem, type Subscriber, type Selector, type PendingSelection, type PanelVisibility, type LayoutRect } from './state'
export { events, EventBus, type StudioEvents, type ParseError, type EventMeta, type EventMiddleware, createLoggerMiddleware, createAnalyticsMiddleware, onSourceChanged, onSelectionChanged, onCommandExecuted } from './events'
export { type Command, type CommandResult, type CommandContext, type CommandType, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, MoveNodeCommand, MoveNodeWithLayoutCommand, UpdateSourceCommand, RecordedChangeCommand, WrapNodesCommand, BatchCommand, ResizeCommand, SetPositionCommand, SetTextContentCommand, createCommand, parseCommandFromLLM, setCommandContext, getCommandContext } from './commands'
export { executor, CommandExecutor, type CommandExecutorOptions, execute, undo, redo, canUndo, canRedo } from './command-executor'
export { StateSelectionAdapter, getStateSelectionAdapter, disposeStateSelectionAdapter, type SelectionSyncHandler } from './selection-adapter'
export { createStudioContext, createTestContext, getStudioContext, setStudioContext, resetStudioContext, type StudioContext } from './context'
export { gridSettings, smartGuidesSettings, generalSettings, handleSnapSettings, type GridSettings, type SmartGuidesSettings, type GeneralSettings, type HandleSnapSettings } from './settings'
export { changeService, change, ChangeService, type ChangeIntent, type ChangeResult } from './change-service'
export {
  runPipeline,
  defaultPipeline,
  readStateStep,
  validateSourceMapStep,
  validateNodeStep,
  createModifierStep,
  executeIntentStep,
  extractEditorContentStep,
  applyToEditorStep,
  emitChangeEventStep,
  type PipelineStep,
  type PipelineContext,
  type PipelineResult,
} from './change-pipeline'
export {
  LayoutService,
  createLayoutService,
  getLayoutService,
  setLayoutService,
  type ElementLayout,
  type LayoutReadOptions,
} from './layout-service'
