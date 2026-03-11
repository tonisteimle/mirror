/**
 * Core Module - State, Events, Commands, Context
 */

export { state, actions, selectors, type StudioState, type SelectionOrigin, type BreadcrumbItem, type Subscriber, type Selector } from './state'
export { events, EventBus, type StudioEvents, type ParseError, onSourceChanged, onSelectionChanged, onCommandExecuted } from './events'
export { type Command, type CommandResult, type CommandContext, type CommandType, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, MoveNodeCommand, UpdateSourceCommand, RecordedChangeCommand, BatchCommand, createCommand, parseCommandFromLLM, setCommandContext, getCommandContext } from './commands'
export { executor, CommandExecutor, type CommandExecutorOptions, execute, undo, redo, canUndo, canRedo } from './command-executor'
export { StateSelectionAdapter, getStateSelectionAdapter, disposeStateSelectionAdapter } from './selection-adapter'
export { createStudioContext, createTestContext, getStudioContext, setStudioContext, resetStudioContext, type StudioContext } from './context'
