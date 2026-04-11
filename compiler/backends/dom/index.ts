/**
 * DOM Backend Module Exports
 *
 * Barrel file for clean imports from the dom backend modules.
 */

// Types
export { ZAG_SLOT_NAMES, type GenerateDOMOptions } from './types'

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
export type { ZagEmitterContext, ZagEmitterFn } from './zag-emitter-context'
