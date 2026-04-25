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

// Value Resolver
export {
  escapeString,
  escapeTemplateString,
  resolveLoopVarMarkers,
  resolveExpressionVariables,
  resolveContentValue,
  resolveConditionVariables,
  resolveLoopCondition,
} from './value-resolver'

// Template Emitter
export {
  emitConditionalTemplateNode,
  emitEachTemplateNode,
  emitEachTemplateNodeContent,
  emitNestedEachLoop,
  resolveTemplateValue,
  resolveTemplateStyleValue,
  resolveConditionalExpression,
  emitTemplateAction,
  type TemplateEmitterContext,
} from './template-emitter'
