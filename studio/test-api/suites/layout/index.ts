/**
 * Layout Test Suite Index
 */

import type { TestCase } from '../../types'

export { directionTests } from './direction.test'
export { alignmentTests, distributionTests } from './alignment.test'
export { gapTests, wrapTests, flexTests } from './gap.test'
export { stackedTests } from './stacked.test'
export { gridTests } from './grid.test'
export { nestingTests, complexLayoutTests } from './nesting.test'

import { directionTests } from './direction.test'
import { alignmentTests, distributionTests } from './alignment.test'
import { gapTests, wrapTests, flexTests } from './gap.test'
import { stackedTests } from './stacked.test'
import { gridTests } from './grid.test'
import { nestingTests, complexLayoutTests } from './nesting.test'

export const allLayoutTests: TestCase[] = [
  ...directionTests,
  ...alignmentTests,
  ...distributionTests,
  ...gapTests,
  ...wrapTests,
  ...flexTests,
  ...stackedTests,
  ...gridTests,
  ...nestingTests,
  ...complexLayoutTests,
]
