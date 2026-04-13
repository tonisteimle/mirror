/**
 * Zag Component Emitters - Main Entry Point
 *
 * Modular architecture for Zag component code generation.
 * Each category file contains emitters for related components.
 *
 * Categories:
 * - form-emitters: Switch, Checkbox, RadioGroup, Slider, Editable, PinInput, etc.
 * - nav-emitters: Tabs, SideNav, ToggleGroup, SegmentedControl
 * - select-emitters: Select, TreeView, Listbox, Accordion
 * - overlay-emitters: Tooltip, Dialog, Popover, HoverCard, Collapsible, DatePicker
 */

import type { IRZagNode } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../zag-emitter-context'

// Import helpers
export { emitSlotStyles, emitComponentHeader, emitMachineConfig, emitRuntimeInit } from './helpers'

// Import form emitters
import {
  emitSwitchComponent,
  emitCheckboxComponent,
  emitRadioGroupComponent,
  emitSliderComponent,
  emitEditableComponent,
  emitPinInputComponent,
  emitPasswordInputComponent,
  emitTagsInputComponent,
  emitNumberInputComponent,
  emitDateInputComponent,
  emitFormComponent,
} from './form-emitters'

// Import navigation emitters
import {
  emitTabsComponent,
  emitSideNavComponent,
  emitToggleGroupComponent,
  emitSegmentedControlComponent,
} from './nav-emitters'

// Import selection emitters
import {
  emitSelectComponent,
  emitTreeViewComponent,
  emitListboxComponent,
  emitAccordionComponent,
} from './select-emitters'

// Import overlay emitters
import {
  emitTooltipComponent,
  emitDialogComponent,
  emitPopoverComponent,
  emitHoverCardComponent,
  emitCollapsibleComponent,
  emitDatePickerComponent,
} from './overlay-emitters'

// Re-export all emitters for direct use
export {
  // Form
  emitSwitchComponent,
  emitCheckboxComponent,
  emitRadioGroupComponent,
  emitSliderComponent,
  emitEditableComponent,
  emitPinInputComponent,
  emitPasswordInputComponent,
  emitTagsInputComponent,
  emitNumberInputComponent,
  emitDateInputComponent,
  emitFormComponent,
  // Navigation
  emitTabsComponent,
  emitSideNavComponent,
  emitToggleGroupComponent,
  emitSegmentedControlComponent,
  // Selection
  emitSelectComponent,
  emitTreeViewComponent,
  emitListboxComponent,
  emitAccordionComponent,
  // Overlay
  emitTooltipComponent,
  emitDialogComponent,
  emitPopoverComponent,
  emitHoverCardComponent,
  emitCollapsibleComponent,
  emitDatePickerComponent,
}

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Registry of Zag component emitters
 * Maps zagType to emitter function
 */
const emitterRegistry = new Map<string, ZagEmitterFn>([
  // Form components
  ['switch', emitSwitchComponent],
  ['checkbox', emitCheckboxComponent],
  ['radio-group', emitRadioGroupComponent],
  ['radiogroup', emitRadioGroupComponent],
  ['slider', emitSliderComponent],
  ['rangeslider', emitSliderComponent],
  ['editable', emitEditableComponent],
  ['pin-input', emitPinInputComponent],
  ['pininput', emitPinInputComponent],
  ['password-input', emitPasswordInputComponent],
  ['passwordinput', emitPasswordInputComponent],
  ['tags-input', emitTagsInputComponent],
  ['tagsinput', emitTagsInputComponent],
  ['number-input', emitNumberInputComponent],
  ['numberinput', emitNumberInputComponent],
  ['date-input', emitDateInputComponent],
  ['dateinput', emitDateInputComponent],
  ['form', emitFormComponent],
  // Navigation components
  ['tabs', emitTabsComponent],
  ['sidenav', emitSideNavComponent],
  ['side-nav', emitSideNavComponent],
  ['toggle-group', emitToggleGroupComponent],
  ['togglegroup', emitToggleGroupComponent],
  ['segmented-control', emitSegmentedControlComponent],
  ['segmentedcontrol', emitSegmentedControlComponent],
  // Selection components
  ['select', emitSelectComponent],
  ['tree-view', emitTreeViewComponent],
  ['treeview', emitTreeViewComponent],
  ['listbox', emitListboxComponent],
  ['accordion', emitAccordionComponent],
  // Overlay components
  ['tooltip', emitTooltipComponent],
  ['dialog', emitDialogComponent],
  ['popover', emitPopoverComponent],
  ['hover-card', emitHoverCardComponent],
  ['hovercard', emitHoverCardComponent],
  ['collapsible', emitCollapsibleComponent],
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
