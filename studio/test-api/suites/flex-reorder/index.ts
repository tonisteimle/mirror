/**
 * Flex Container Reorder Tests
 *
 * Reordering mixed component types in flex containers via drag & drop.
 */

import type { TestCase } from '../../types'

export { buttonTextIconTests } from './button-text-icon.test'
export { inputButtonTextTests } from './input-button-text.test'
export { imageTextButtonTests } from './image-text-button.test'
export { linkIconTextTests } from './link-icon-text.test'
export { dividerSpacerMixedTests } from './divider-spacer-mixed.test'
export { textareaInputButtonTests } from './textarea-input-button.test'
export { zagMixedTests } from './zag-mixed.test'
export { complexMixedTests } from './complex-mixed.test'
export { edgeCaseMixedTests } from './edge-cases.test'
export { sequentialMixedTests } from './sequential-mixed.test'

import { buttonTextIconTests } from './button-text-icon.test'
import { inputButtonTextTests } from './input-button-text.test'
import { imageTextButtonTests } from './image-text-button.test'
import { linkIconTextTests } from './link-icon-text.test'
import { dividerSpacerMixedTests } from './divider-spacer-mixed.test'
import { textareaInputButtonTests } from './textarea-input-button.test'
import { zagMixedTests } from './zag-mixed.test'
import { complexMixedTests } from './complex-mixed.test'
import { edgeCaseMixedTests } from './edge-cases.test'
import { sequentialMixedTests } from './sequential-mixed.test'

export const allFlexReorderTests: TestCase[] = [
  ...buttonTextIconTests,
  ...inputButtonTextTests,
  ...imageTextButtonTests,
  ...linkIconTextTests,
  ...dividerSpacerMixedTests,
  ...textareaInputButtonTests,
  ...zagMixedTests,
  ...complexMixedTests,
  ...edgeCaseMixedTests,
  ...sequentialMixedTests,
]

// Backwards-compatibility aliases (used by drag/index.ts re-exports)
export const buttonReorderVerticalTests = buttonTextIconTests
export const buttonReorderHorizontalTests = inputButtonTextTests
export const textReorderTests = imageTextButtonTests
export const iconReorderTests = linkIconTextTests
export const inputReorderTests = textareaInputButtonTests
export const imageReorderTests = imageTextButtonTests
export const dividerSpacerReorderTests = dividerSpacerMixedTests
export const linkTextareaReorderTests = linkIconTextTests
export const mixedComponentReorderTests = complexMixedTests
export const zagComponentReorderTests = zagMixedTests
export const nestedContainerReorderTests = edgeCaseMixedTests
export const reorderEdgeCaseTests = edgeCaseMixedTests
export const sequentialReorderTests = sequentialMixedTests

export default allFlexReorderTests
