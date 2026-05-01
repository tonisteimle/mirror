/**
 * Components Test Suite Index
 *
 * Contains tests for:
 * - DatePicker (only remaining Zag component)
 * - Accordion (Pure Mirror)
 * - Pure Checkbox (Pure Mirror)
 * - Pure Radio Group (Pure Mirror)
 * - Panel drag tests for all components
 */

import type { TestCase } from '../../types'

// DatePicker (Zag)
export { datePickerTests } from './date-picker.test'

// Accordion (Pure Mirror)
export {
  allAccordionTests,
  accordionStructureTests,
  accordionToggleTests,
  accordionChevronTests,
  accordionStylingTests,
  accordionContentTests,
  accordionEdgeCaseTests,
} from './accordion.test'

export {
  allAccordionDropTests,
  accordionDropTests,
  accordionStylingAfterDropTests,
  accordionWithTabsTests,
} from './accordion-drop.test'

// Pure Components (Pure Mirror)
export { pureCheckboxTests } from './pure-checkbox.test'
export { pureRadioGroupTests } from './pure-radio-group.test'

// Select Component Tests - Drag & Verify (comprehensive)
export {
  allSelectDragAndVerifyTests,
  selectDragTests,
  selectAppearanceTests,
  selectFunctionalityTests,
  selectKeyboardTests,
  selectHoverTests,
} from './select-drag-and-verify.test'

// Panel Drag All Components Tests
export {
  allPanelDragTests,
  layoutDragTests,
  basicPrimitiveDragTests,
  presetDragTests,
  tableTabsDragTests,
  formControlDragTests,
  zagComponentDragTests,
  dataComponentDragTests,
  insertionPositionTests,
  codeVerificationTests,
} from './panel-drag-all.test'

// Component Preview Styling Tests
export { componentPreviewStylingTests } from './component-preview-styling.test'

// Mirror DSL Component System Tests (definition, inheritance, slots, variants, states)
export { basicComponentTests } from './basic.test'
export { propertyOverrideTests } from './property-overrides.test'
export { inheritanceTests } from './inheritance.test'
export { variantTests } from './variants.test'
export { nestedSlotTests } from './nested-slots.test'
export { layoutComponentTests } from './layout-components.test'
export { multiLevelInheritanceTests } from './multi-level-inheritance.test'
export { componentStateTests } from './component-states.test'
export { complexComponentTests } from './complex-patterns.test'

import { basicComponentTests } from './basic.test'
import { propertyOverrideTests } from './property-overrides.test'
import { inheritanceTests } from './inheritance.test'
import { variantTests } from './variants.test'
import { nestedSlotTests } from './nested-slots.test'
import { layoutComponentTests } from './layout-components.test'
import { multiLevelInheritanceTests } from './multi-level-inheritance.test'
import { componentStateTests } from './component-states.test'
import { complexComponentTests } from './complex-patterns.test'
import { allSelectDragAndVerifyTests } from './select-drag-and-verify.test'

// Select component (still has real tests via select-drag-and-verify)
export const selectTests: TestCase[] = [...allSelectDragAndVerifyTests]

/**
 * DSL component-system tests aggregate (definition / inheritance / slots / variants /
 * states / complex patterns). Migrated from the former monolithic component-tests.ts.
 * Component-library tests (DatePicker, Accordion, Pure-Checkbox, etc.) are exported
 * individually above and aggregated by callers as needed.
 */
export const allComponentTests: TestCase[] = [
  ...basicComponentTests,
  ...propertyOverrideTests,
  ...inheritanceTests,
  ...variantTests,
  ...nestedSlotTests,
  ...layoutComponentTests,
  ...multiLevelInheritanceTests,
  ...componentStateTests,
  ...complexComponentTests,
]
