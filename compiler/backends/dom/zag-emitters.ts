/**
 * Zag Component Emitters
 *
 * This file re-exports from the modular zag/ directory for backward compatibility.
 * The actual implementation is split across:
 *
 * - zag/helpers.ts - Shared helper functions
 * - zag/form-emitters.ts - Form components (Switch, Checkbox, RadioGroup, etc.)
 * - zag/nav-emitters.ts - Navigation components (Tabs, SideNav, etc.)
 * - zag/select-emitters.ts - Selection components (Select, TreeView, etc.)
 * - zag/overlay-emitters.ts - Overlay components (Dialog, Tooltip, etc.)
 *
 * TUTORIAL SET (10 components):
 * - Forms: Checkbox, Switch, RadioGroup, Slider, Select, DatePicker
 * - Navigation: Tabs, SideNav
 * - Overlays: Dialog, Tooltip
 *
 * ALL TUTORIAL SET COMPONENTS MIGRATED!
 */

// Re-export everything from the modular structure
export {
  // Dispatcher
  dispatchZagEmitter,
  registerZagEmitter,
  // Helpers
  emitSlotStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
  // Form emitters
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
  // Navigation emitters
  emitTabsComponent,
  emitSideNavComponent,
  emitToggleGroupComponent,
  emitSegmentedControlComponent,
  // Selection emitters
  emitSelectComponent,
  emitTreeViewComponent,
  emitListboxComponent,
  emitAccordionComponent,
  // Overlay emitters
  emitTooltipComponent,
  emitDialogComponent,
  emitPopoverComponent,
  emitHoverCardComponent,
  emitCollapsibleComponent,
  emitDatePickerComponent,
} from './zag/index'
