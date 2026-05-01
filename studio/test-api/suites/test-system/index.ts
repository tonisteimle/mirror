/**
 * Test System Feature Tests
 *
 * Fixtures, isolation, keyboard simulation, wait helpers.
 */

import type { TestCase } from '../../types'

export { fixturesTests } from './fixtures.test'
export { isolationTests } from './isolation.test'
export { keyboardTests } from './keyboard.test'
export { waitHelperTests } from './wait-helpers.test'

import { fixturesTests } from './fixtures.test'
import { isolationTests } from './isolation.test'
import { keyboardTests } from './keyboard.test'
import { waitHelperTests } from './wait-helpers.test'

export const allTestSystemTests: TestCase[] = [
  ...fixturesTests,
  ...isolationTests,
  ...keyboardTests,
  ...waitHelperTests,
]
