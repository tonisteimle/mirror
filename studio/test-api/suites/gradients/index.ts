/**
 * Gradient Tests Index
 *
 * Comprehensive tests for Mirror DSL gradients:
 * - grad (horizontal linear gradient)
 * - grad-ver (vertical linear gradient)
 * - grad with angle
 * - Text gradients (col grad)
 */

import type { TestCase } from '../../types'

// Linear gradient tests
import {
  allGradientTests,
  horizontalGradientTests,
  verticalGradientTests,
  angledGradientTests,
  gradientTextTests,
  gradientWithEffectsTests,
} from './linear.test'

// Re-export individual test arrays
export {
  allGradientTests,
  horizontalGradientTests,
  verticalGradientTests,
  angledGradientTests,
  gradientTextTests,
  gradientWithEffectsTests,
}

/**
 * Quick gradient tests for fast validation
 */
export const quickGradientTests: TestCase[] = [
  ...horizontalGradientTests.slice(0, 2),
  ...verticalGradientTests.slice(0, 2),
  ...angledGradientTests.slice(0, 2),
]
