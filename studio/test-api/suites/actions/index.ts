/**
 * Action Tests — REAL INTERACTIONS
 *
 * visibility, counter, scroll, toast, form, navigation, clipboard,
 * overlay, crud, combined.
 */

import type { TestCase } from '../../test-runner'

export { visibilityActionTests } from './visibility.test'
export { counterActionTests } from './counter.test'
export { scrollActionTests } from './scroll.test'
export { toastActionTests } from './toast.test'
export { formActionTests } from './form.test'
export { navigationActionTests } from './navigation.test'
export { clipboardActionTests } from './clipboard.test'
export { overlayActionTests } from './overlay.test'
export { crudActionTests } from './crud.test'
export { combinedActionTests } from './combined.test'

import { visibilityActionTests } from './visibility.test'
import { counterActionTests } from './counter.test'
import { scrollActionTests } from './scroll.test'
import { toastActionTests } from './toast.test'
import { formActionTests } from './form.test'
import { navigationActionTests } from './navigation.test'
import { clipboardActionTests } from './clipboard.test'
import { overlayActionTests } from './overlay.test'
import { crudActionTests } from './crud.test'
import { combinedActionTests } from './combined.test'

export const allActionTests: TestCase[] = [
  ...visibilityActionTests,
  ...counterActionTests,
  ...scrollActionTests,
  ...toastActionTests,
  ...formActionTests,
  ...navigationActionTests,
  ...clipboardActionTests,
  ...overlayActionTests,
  ...crudActionTests,
  ...combinedActionTests,
]
