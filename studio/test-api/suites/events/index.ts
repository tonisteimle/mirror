/**
 * Event Tests — REAL INTERACTIONS (click, hover, focus, input, keyboard, disabled, combined).
 */

import type { TestCase } from '../../test-runner'

export { clickEventTests } from './click.test'
export { hoverEventTests } from './hover.test'
export { focusEventTests } from './focus.test'
export { inputEventTests } from './input.test'
export { keyboardEventTests } from './keyboard.test'
export { disabledEventTests } from './disabled.test'
export { combinedEventTests } from './combined.test'

import { clickEventTests } from './click.test'
import { hoverEventTests } from './hover.test'
import { focusEventTests } from './focus.test'
import { inputEventTests } from './input.test'
import { keyboardEventTests } from './keyboard.test'
import { disabledEventTests } from './disabled.test'
import { combinedEventTests } from './combined.test'

// Stub exports for missing test arrays (referenced in suites/index.ts)
export const viewEventTests: TestCase[] = []
export const eventEdgeCaseTests: TestCase[] = []

export const allEventTests: TestCase[] = [
  ...clickEventTests,
  ...hoverEventTests,
  ...focusEventTests,
  ...inputEventTests,
  ...keyboardEventTests,
  ...disabledEventTests,
  ...combinedEventTests,
]
