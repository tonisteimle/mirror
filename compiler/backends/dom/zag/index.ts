/**
 * Zag Component Emitters - Main Entry Point
 *
 * Only DatePicker is still emitted as a Zag component. All other components
 * (Switch, Checkbox, Slider, Tabs, Select, Dialog, Tooltip, etc.) are now
 * Pure-Mirror templates — see studio/panels/components/component-templates.ts.
 */

import type { IRZagNode } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../base-emitter-context'

// Re-export helpers used by the DatePicker emitter
export { emitRuntimeInit } from './helpers'

import { emitDatePickerComponent } from './overlay-emitters'
export { emitDatePickerComponent }

// =============================================================================
// Dispatcher (DatePicker only)
// =============================================================================

const emitterRegistry = new Map<string, ZagEmitterFn>([
  ['datepicker', emitDatePickerComponent],
  ['date-picker', emitDatePickerComponent],
])

/**
 * Dispatch to the appropriate Zag component emitter.
 * Returns true if handled, false otherwise.
 */
export function dispatchZagEmitter(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): boolean {
  const emitter =
    emitterRegistry.get(node.zagType) || emitterRegistry.get(node.zagType.replace(/-/g, ''))
  if (emitter) {
    emitter(node, parentVar, ctx)
    return true
  }
  return false
}
