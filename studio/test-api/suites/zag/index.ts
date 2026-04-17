/**
 * Zag Components Test Suite Index
 */

import type { TestCase } from '../../types'

export { checkboxTests } from './checkbox.test'
export { switchTests } from './switch.test'
export { sliderTests } from './slider.test'
export { selectTests } from './select.test'
export { radioGroupTests } from './radio-group.test'
export { dialogTests } from './dialog.test'
export { tooltipTests } from './tooltip.test'
export { tabsTests } from './tabs.test'
export { datePickerTests } from './date-picker.test'
export { sidenavTests } from './sidenav.test'
export { zagInLayoutTests } from './layout.test'
export {
  allZagDragTests,
  tabsDragTests,
  selectDragTests,
  checkboxDragTests,
  switchDragTests,
  dialogDragTests,
  sliderDragTests,
  combinedZagTests,
  zagStylingTests,
} from './drag-and-style.test'

import { checkboxTests } from './checkbox.test'
import { switchTests } from './switch.test'
import { sliderTests } from './slider.test'
import { selectTests } from './select.test'
import { radioGroupTests } from './radio-group.test'
import { dialogTests } from './dialog.test'
import { tooltipTests } from './tooltip.test'
import { tabsTests } from './tabs.test'
import { datePickerTests } from './date-picker.test'
import { sidenavTests } from './sidenav.test'
import { zagInLayoutTests } from './layout.test'
import { allZagDragTests } from './drag-and-style.test'

export const allZagTests: TestCase[] = [
  ...checkboxTests,
  ...switchTests,
  ...sliderTests,
  ...selectTests,
  ...radioGroupTests,
  ...dialogTests,
  ...tooltipTests,
  ...tabsTests,
  ...datePickerTests,
  ...sidenavTests,
  ...zagInLayoutTests,
  ...allZagDragTests,
]
