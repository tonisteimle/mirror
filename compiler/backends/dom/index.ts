/**
 * DOM Backend Module Exports
 *
 * Barrel file for clean imports from the dom backend modules.
 */

// Types
export { ZAG_SLOT_NAMES, type GenerateDOMOptions } from './types'

// Consolidated Emitter Contexts (primary source)
export type {
  // Base types
  BaseEmitterContext,
  EmitterContext,
  EmitterFn,
  DeferredWhenWatcher,
  // Specialized contexts
  ZagEmitterContext,
  ZagEmitterFn,
  EventEmitterContext,
  StateMachineEmitterContext,
  LoopEmitterContext,
} from './base-emitter-context'

// Utilities
export { escapeJSString, sanitizeVarName, cssPropertyToJS, generateVarName } from './utils'

// Zag Emitters
export {
  dispatchZagEmitter,
  registerZagEmitter,
  emitSlotStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
} from './zag-emitters'

// Table Emitter
export { emitTable } from './table-emitter'

// State Machine Emitter
export {
  emitStateMachine,
  emitWhenWatcher,
  emitDeferredWhenWatchers,
} from './state-machine-emitter'

// Loop Emitter
export {
  emitEachLoop,
  emitConditional,
} from './loop-emitter'

// Event Emitter
export {
  emitEventListener,
  emitTemplateEventListener,
  emitAction,
  mapKeyName,
} from './event-emitter'

// Token Emitter
export {
  emitTokens,
  emitMethods,
  emitQueries,
  serializeDataObject,
  serializeDataValue,
  type TokenEmitterContext,
  type TokenEmitterData,
} from './token-emitter'
