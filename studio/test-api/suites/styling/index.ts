/**
 * Styling Test Suite Index
 */

import type { TestCase } from '../../types'

export { colorTests } from './colors.test'
export { sizingTests } from './sizing.test'
export { spacingTests } from './spacing.test'
export { borderTests } from './borders.test'
export { typographyTests } from './typography.test'
export { effectTests, visibilityTests, combinedTests } from './effects.test'

// Extended Styling Tests (B3.2)
export {
  allExtendedStylingTests,
  rgbaColorTests,
  hexAlphaTests,
  perSidePaddingTests,
  perSideMarginTests,
  perSideBorderTests,
  shadowValidationTests,
} from './extended.test'

import { colorTests } from './colors.test'
import { sizingTests } from './sizing.test'
import { spacingTests } from './spacing.test'
import { borderTests } from './borders.test'
import { typographyTests } from './typography.test'
import { effectTests, visibilityTests, combinedTests } from './effects.test'
import { allExtendedStylingTests } from './extended.test'

export const allStylingTests: TestCase[] = [
  ...colorTests,
  ...sizingTests,
  ...spacingTests,
  ...borderTests,
  ...typographyTests,
  ...effectTests,
  ...visibilityTests,
  ...combinedTests,
  ...allExtendedStylingTests,
]
