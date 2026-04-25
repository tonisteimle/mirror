/**
 * Zag Component Emitters
 *
 * Re-exports from the modular zag/ directory.
 * Only DatePicker is still emitted as a Zag component — all other components
 * are Pure-Mirror templates (studio/panels/components/component-templates.ts).
 */

export {
  dispatchZagEmitter,
  registerZagEmitter,
  emitSlotStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
  emitDatePickerComponent,
} from './zag/index'
