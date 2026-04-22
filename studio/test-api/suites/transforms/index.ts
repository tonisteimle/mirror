/**
 * Transform Tests Index
 *
 * Comprehensive tests for Mirror DSL transforms:
 * - rotate/rot property
 * - scale property
 * - x, y positioning (absolute)
 * - x-offset, y-offset (translate)
 * - z (z-index)
 * - Combinations (A4.2 - Phase 4)
 */

import type { TestCase } from '../../types'

// Rotate tests
import {
  allRotateTests,
  rotateBasicTests,
  rotateWithOtherTransformsTests,
  rotateInteractiveTests,
  rotateAnglesTests,
} from './rotate.test'

// Scale tests
import {
  allScaleTests,
  scaleBasicTests,
  scaleInteractiveTests,
  scaleEdgeCasesTests,
  scaleWithOtherPropertiesTests,
} from './scale.test'

// Translate/Position tests
import {
  allTranslateTests,
  positionBasicTests,
  stackedPositionTests,
  zIndexTests,
  translateOffsetTests,
} from './translate.test'

// Combination tests (A4.2)
import {
  allCombinationTests,
  rotateScaleTests,
  translateRotateTests,
  multiTransformTests,
  transformOrderTests,
  transformOriginTests,
  transformEdgeCaseTests,
} from './combinations.test'

// Re-export individual test arrays
export {
  // Rotate
  allRotateTests,
  rotateBasicTests,
  rotateWithOtherTransformsTests,
  rotateInteractiveTests,
  rotateAnglesTests,
  // Scale
  allScaleTests,
  scaleBasicTests,
  scaleInteractiveTests,
  scaleEdgeCasesTests,
  scaleWithOtherPropertiesTests,
  // Translate/Position
  allTranslateTests,
  positionBasicTests,
  stackedPositionTests,
  zIndexTests,
  translateOffsetTests,
  // Combinations (A4.2)
  allCombinationTests,
  rotateScaleTests,
  translateRotateTests,
  multiTransformTests,
  transformOrderTests,
  transformOriginTests,
  transformEdgeCaseTests,
}

/**
 * All transform tests combined
 */
export const allTransformTests: TestCase[] = [
  ...allRotateTests,
  ...allScaleTests,
  ...allTranslateTests,
  ...allCombinationTests,
]

/**
 * Quick transform tests for fast validation
 */
export const quickTransformTests: TestCase[] = [
  ...rotateBasicTests.slice(0, 2),
  ...scaleBasicTests.slice(0, 2),
  ...positionBasicTests.slice(0, 2),
  ...rotateScaleTests.slice(0, 2),
]
