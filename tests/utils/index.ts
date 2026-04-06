/**
 * Test Utilities
 *
 * Shared utilities for Mirror test suite.
 *
 * @example
 * ```typescript
 * import { compileAndExecute, parseOnly } from '../test-utils'
 *
 * const { root } = compileAndExecute(`
 * Card as frame:
 *   pad 16
 *
 * Card
 * `)
 *
 * expect(root).toHaveStyle({ padding: '16px' })
 * ```
 */

// Compilation helpers
export {
  compile,
  compileAndExecute,
  compileOnly,
  parseOnly,
  toIROnly,
  testProperty,
} from './compile'

// Types
export type {
  DOMResult,
  MirrorAPI,
  MatcherResult,
  StyleExpectation,
  DatasetExpectation,
  DOMStructure,
  ParseError,
  IRNodeExpectation,
} from './types'

// Custom matchers (for manual extension if needed)
export * as matchers from './matchers'

// Mock factories
export * from './mocks'

// Test helpers
export * from './helpers'
