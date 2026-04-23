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

// Imports for aggregation
import { datePickerTests } from './date-picker.test'
import { allAccordionTests } from './accordion.test'
import { allAccordionDropTests } from './accordion-drop.test'
import { pureCheckboxTests } from './pure-checkbox.test'
import { pureRadioGroupTests } from './pure-radio-group.test'
import { allPanelDragTests } from './panel-drag-all.test'
import { allSelectDragAndVerifyTests } from './select-drag-and-verify.test'
import { componentPreviewStylingTests } from './component-preview-styling.test'

// Legacy exports for backwards compatibility (empty arrays or filled)
export const checkboxTests: TestCase[] = []
export const switchTests: TestCase[] = []
export const sliderTests: TestCase[] = []
export const selectTests: TestCase[] = [...allSelectDragAndVerifyTests]
export const radioGroupTests: TestCase[] = []
export const dialogTests: TestCase[] = []
export const tooltipTests: TestCase[] = []
export const tabsTests: TestCase[] = []
export const sidenavTests: TestCase[] = []
export const zagInLayoutTests: TestCase[] = []
export const allZagDragTests: TestCase[] = []
export const allZagResizeHandleTests: TestCase[] = []
export const allTabsDropTests: TestCase[] = []
export const allZagKeyboardTests: TestCase[] = []
export const allZagTests: TestCase[] = []

// All component tests
export const allComponentTests: TestCase[] = [
  ...datePickerTests,
  ...allAccordionTests,
  ...allAccordionDropTests,
  ...pureCheckboxTests,
  ...pureRadioGroupTests,
  ...allPanelDragTests,
  ...allSelectDragAndVerifyTests,
  ...componentPreviewStylingTests,
]
