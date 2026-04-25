/**
 * Zag Component Emitters - Main Entry Point
 *
 * Only DatePicker is still emitted as a Zag component. All other components
 * (Switch, Checkbox, Slider, Tabs, Select, Dialog, Tooltip, etc.) are now
 * Pure-Mirror templates — see studio/panels/components/component-templates.ts.
 */

import type { IRZagNode } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../zag-emitter-context'

// Re-export helpers (used by external emitter contexts in dom.ts/dom/index.ts)
export { emitSlotStyles, emitComponentHeader, emitMachineConfig, emitRuntimeInit } from './helpers'

import { emitDatePickerComponent } from './overlay-emitters'
export { emitDatePickerComponent }

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Registry of Zag component emitters (DatePicker only).
 */
const emitterRegistry = new Map<string, ZagEmitterFn>([
  ['datepicker', emitDatePickerComponent],
  ['date-picker', emitDatePickerComponent],
])

/**
 * Dispatch to the appropriate Zag component emitter
 * Returns true if handled, false if component should use generic handling
 */
export function dispatchZagEmitter(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): boolean {
  const emitter = emitterRegistry.get(node.zagType)
  if (emitter) {
    emitter(node, parentVar, ctx)
    return true
  }

  // Also check with normalized names
  const normalizedType = node.zagType.replace(/-/g, '')
  const normalizedEmitter = emitterRegistry.get(normalizedType)
  if (normalizedEmitter) {
    normalizedEmitter(node, parentVar, ctx)
    return true
  }

  return false
}

/**
 * Register a Zag component emitter
 */
export function registerZagEmitter(zagType: string, emitter: ZagEmitterFn): void {
  emitterRegistry.set(zagType, emitter)
}
