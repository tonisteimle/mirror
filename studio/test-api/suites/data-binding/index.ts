/**
 * Data Binding Tests
 *
 * Variables, collections, conditionals, tokens, input binding.
 */

import type { TestCase } from '../../test-runner'

export { variableTests } from './variables.test'
export { collectionTests } from './collections.test'
export { conditionalTests } from './conditionals.test'
export { tokenTests } from './tokens.test'
export { inputBindingTests } from './input-binding.test'
export { tableSyntaxTests } from './table-syntax.test'

import { variableTests } from './variables.test'
import { collectionTests } from './collections.test'
import { conditionalTests } from './conditionals.test'
import { tokenTests } from './tokens.test'
import { inputBindingTests } from './input-binding.test'
import { tableSyntaxTests } from './table-syntax.test'

export const allDataBindingTests: TestCase[] = [
  ...variableTests,
  ...collectionTests,
  ...conditionalTests,
  ...tokenTests,
  ...inputBindingTests,
  ...tableSyntaxTests,
]
