/**
 * Responsive State Tests — container queries, size states, breakpoints.
 */

import type { TestCase } from '../../test-runner'

export { basicResponsiveTests } from './basic.test'
export { responsiveLayoutTests } from './layout.test'
export { responsiveStylingTests } from './styling.test'
export { responsiveVisibilityTests } from './visibility.test'
export { customThresholdTests } from './custom-thresholds.test'
export { responsiveComponentTests } from './components.test'
export { complexResponsiveTests } from './complex.test'

import { basicResponsiveTests } from './basic.test'
import { responsiveLayoutTests } from './layout.test'
import { responsiveStylingTests } from './styling.test'
import { responsiveVisibilityTests } from './visibility.test'
import { customThresholdTests } from './custom-thresholds.test'
import { responsiveComponentTests } from './components.test'
import { complexResponsiveTests } from './complex.test'

export const allResponsiveTests: TestCase[] = [
  ...basicResponsiveTests,
  ...responsiveLayoutTests,
  ...responsiveStylingTests,
  ...responsiveVisibilityTests,
  ...customThresholdTests,
  ...responsiveComponentTests,
  ...complexResponsiveTests,
]
