/**
 * State Tests Index
 *
 * Comprehensive tests for Mirror DSL state management:
 * - toggle() function and on/off states
 * - exclusive() function for radio-like behavior
 * - hover: state blocks with transitions
 * - Cross-element state dependencies
 */

import type { TestCase } from '../../types'

// Toggle state tests
import {
  allToggleTests,
  toggleBasicTests,
  toggleWithContentTests,
  toggleMultipleTests,
} from './toggle.test'

// Exclusive state tests
import {
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveGroupTests,
  exclusiveNavigationTests,
} from './exclusive.test'

// Hover state tests
import {
  allHoverTests,
  hoverBasicTests,
  hoverWithTransitionTests,
  hoverNestedTests,
  hoverScaleTests,
} from './hover.test'

// Cross-element state tests
import {
  allCrossElementTests,
  crossElementBasicTests,
  crossElementDropdownTests,
  crossElementModalTests,
  crossElementFormTests,
} from './cross-element.test'

// System states tests (focus, active, disabled)
import {
  allSystemStatesTests,
  focusStateTests,
  activeStateTests,
  disabledStateTests,
  combinedSystemStatesTests,
} from './system-states.test'

// Re-export individual test arrays
export {
  // Toggle
  allToggleTests,
  toggleBasicTests,
  toggleWithContentTests,
  toggleMultipleTests,
  // Exclusive
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveGroupTests,
  exclusiveNavigationTests,
  // Hover
  allHoverTests,
  hoverBasicTests,
  hoverWithTransitionTests,
  hoverNestedTests,
  hoverScaleTests,
  // Cross-element
  allCrossElementTests,
  crossElementBasicTests,
  crossElementDropdownTests,
  crossElementModalTests,
  crossElementFormTests,
  // System states
  allSystemStatesTests,
  focusStateTests,
  activeStateTests,
  disabledStateTests,
  combinedSystemStatesTests,
}

/**
 * All state tests combined
 */
export const allStateTests: TestCase[] = [
  ...allToggleTests,
  ...allExclusiveTests,
  ...allHoverTests,
  ...allCrossElementTests,
  ...allSystemStatesTests,
]

/**
 * Quick state tests for fast validation
 */
export const quickStateTests: TestCase[] = [
  ...toggleBasicTests.slice(0, 3),
  ...exclusiveBasicTests.slice(0, 2),
  ...hoverBasicTests.slice(0, 3),
  ...crossElementBasicTests.slice(0, 2),
  ...focusStateTests.slice(0, 2),
  ...disabledStateTests.slice(0, 2),
]
