/**
 * Mirror Style Validation Testing Infrastructure
 *
 * Validates that UI elements render exactly as expected.
 *
 * @example
 * ```typescript
 * import { renderMirror, validateAll, assertValid } from '../compiler/testing'
 *
 * test('Frame hor should have correct flex styles', () => {
 *   const ctx = renderMirror('Frame hor, gap 12')
 *   try {
 *     assertValid(ctx)
 *   } finally {
 *     ctx.cleanup()
 *   }
 * })
 * ```
 */

// Types
export type {
  StyleMismatch,
  ElementValidation,
  ValidationResult,
  ValidationOptions,
  RenderContext,
  ExpectedStyle,
  AssertionOptions,
} from './types'

// Type helpers
export {
  getBaseStyles,
  getStateStyles,
  getDefinedStates,
  stylesToRecord,
} from './types'

// Render utilities
export {
  renderMirror,
  getElementByNodeId,
  getElementByName,
  getElementByComponent,
  getElementsByComponent,
  getIRNodeById,
  getAllIRNodes,
  getElementBaseStyles,
  getElementStateStyles,
  getInlineStyles,
  getComputedStylesFor,
  getElementState,
} from './render'

// Validation
export {
  validateElement,
  validateElementState,
  validateAll,
  validateById,
  assertValid,
  assertStyle,
  formatReport,
} from './style-validator'

// Convenience re-exports
export { parse } from '../parser/parser'
export { toIR } from '../ir'
export { generateDOM } from '../backends/dom'
