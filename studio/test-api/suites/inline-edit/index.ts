/**
 * Inline-Edit tests — preview-side text editing
 */

import type { TestCase } from '../../test-runner'

export { inlineEditTextTests } from './inline-edit-text.test'

import { inlineEditTextTests } from './inline-edit-text.test'

export const allInlineEditTests: TestCase[] = [...inlineEditTextTests]
