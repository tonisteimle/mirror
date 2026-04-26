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

// Zag Emitters (DatePicker only)
export { dispatchZagEmitter, emitRuntimeInit, emitDatePickerComponent } from './zag-emitters'

// State Machine Emitter
export {
  emitStateMachine,
  emitWhenWatcher,
  emitDeferredWhenWatchers,
} from './state-machine-emitter'

// Loop Emitter
export { emitEachLoop, emitConditional } from './loop-emitter'

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

// Node Emitter
export {
  emitElementCreation,
  emitProperties,
  emitIconSetup,
  emitSlotSetup,
  emitBaseStyles,
  emitContainerType,
  emitLayoutType,
  emitStateStyles,
  emitVisibleWhen,
  emitSelectionBinding,
  emitBindAttribute,
  emitComponentAttributes,
  emitRouteAttribute,
  emitKeyboardNav,
  emitLoopFocus,
  emitTypeahead,
  emitTriggerText,
  emitMask,
  emitValueBinding,
  emitAbsolutePositioning,
  emitAbsContainerMarker,
  emitAppendToParent,
  type NodeEmitterContext,
} from './node-emitter'

// Chart Emitter
export { emitChartSetup, type ChartEmitterContext } from './chart-emitter'

// API Emitter
export {
  collectNamedNodes,
  emitPublicAPI,
  emitInitialization,
  emitAutoMount,
  type APIEmitterContext,
} from './api-emitter'

// Animation Emitter
export { emitAnimations, type AnimationEmitterContext } from './animation-emitter'

// Style Emitter
export { emitStyles, type StyleEmitterContext } from './style-emitter'

// Note: dom/value-resolver.ts and dom/template-emitter.ts were removed
// 2026-04-26 — they were dead duplicates of inline code in `dom.ts`. The
// authoritative implementations live there. If you need to re-extract,
// also remove the inline copies in dom.ts.
