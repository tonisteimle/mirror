/**
 * Autocomplete Test Suite Index
 */

import type { TestCase } from '../../test-runner'
import { primitiveCompletionTests } from './primitives.test'
import { propertyCompletionTests } from './properties.test'
import { valueCompletionTests } from './values.test'
import { iconCompletionTests } from './icons.test'
import { tokenCompletionTests } from './tokens.test'
import { stateCompletionTests } from './states.test'
import { componentCompletionTests } from './components.test'

export {
  primitiveCompletionTests,
  propertyCompletionTests,
  valueCompletionTests,
  iconCompletionTests,
  tokenCompletionTests,
  stateCompletionTests,
  componentCompletionTests,
}

export const allAutocompleteTests: TestCase[] = [
  ...primitiveCompletionTests,
  ...propertyCompletionTests,
  ...valueCompletionTests,
  ...iconCompletionTests,
  ...tokenCompletionTests,
  ...stateCompletionTests,
  ...componentCompletionTests,
]
