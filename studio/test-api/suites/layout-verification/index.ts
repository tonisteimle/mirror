/**
 * Layout Verification Tests
 *
 * Tests that verify rendered layouts match expected behavior using
 * bounding rectangles and computed positions rather than just CSS properties.
 */

import type { TestCase } from '../../test-runner'

export { directionVerificationTests } from './direction.test'
export { sizeVerificationTests } from './size.test'
export { gapVerificationTests } from './gap.test'
export { alignmentVerificationTests } from './alignment.test'
export { complexLayoutVerificationTests } from './complex-layouts.test'

import { directionVerificationTests } from './direction.test'
import { sizeVerificationTests } from './size.test'
import { gapVerificationTests } from './gap.test'
import { alignmentVerificationTests } from './alignment.test'
import { complexLayoutVerificationTests } from './complex-layouts.test'

export const allLayoutVerificationTests: TestCase[] = [
  ...directionVerificationTests,
  ...sizeVerificationTests,
  ...gapVerificationTests,
  ...alignmentVerificationTests,
  ...complexLayoutVerificationTests,
]
