/**
 * Compiler Test Suite Index — DOM/CSS smoke tests for the Mirror DSL compiler.
 *
 * For deeper compiler verification (multi-file, prelude, edge cases) see
 * compiler-verification/.
 */

import type { TestCase } from '../../test-runner'
import { primitiveTests } from './primitives.test'
import { layoutTests } from './layout.test'
import { stylingTests } from './styling.test'
import { nestingTests } from './nesting.test'

export { primitiveTests, layoutTests, stylingTests, nestingTests }

export const allCompilerTests: TestCase[] = [
  ...primitiveTests,
  ...layoutTests,
  ...stylingTests,
  ...nestingTests,
]

/**
 * Convenience helper for running all compiler smoke tests from the
 * browser console: `await runCompilerTests()`
 */
export async function runCompilerTests() {
  const api = (window as any).__mirrorTest
  if (!api) {
    console.error('Mirror Test API not available')
    return
  }
  return api.run(allCompilerTests, 'Compiler Tests')
}
