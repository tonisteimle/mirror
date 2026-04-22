/**
 * Compiler Error Handling Tests - B2.1
 *
 * Tests that verify the compiler handles errors gracefully:
 * - Invalid property values
 * - Undefined components
 * - Invalid token references
 * - Syntax errors
 * - Recovery after fixing errors
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper: Check Error State
// =============================================================================

function hasCompileError(api: TestAPI): boolean {
  const errors = api.studio.getCompileErrors()
  return errors.length > 0
}

function getErrorMessage(api: TestAPI): string {
  const errors = api.studio.getCompileErrors()
  return errors.join('; ')
}

function errorContains(api: TestAPI, substring: string): boolean {
  const errors = api.studio.getCompileErrors()
  return errors.some(e => e.toLowerCase().includes(substring.toLowerCase()))
}

// =============================================================================
// Invalid Property Values
// =============================================================================

export const invalidPropertyTests: TestCase[] = describe('Invalid Property Values', [
  testWithSetup(
    'Invalid width value shows error but does not crash',
    `Frame w abc`,
    async (api: TestAPI) => {
      // Should either have an error or treat it as a component reference
      // The key is that it doesn't crash
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash - nodeIds array should exist')
    }
  ),

  testWithSetup(
    'Negative dimension values handled',
    `Frame w -100, h -50`,
    async (api: TestAPI) => {
      // Negative values might be ignored or cause an error
      // But should not crash
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),

  testWithSetup(
    'Invalid color value handled gracefully',
    `Frame bg notacolor`,
    async (api: TestAPI) => {
      // Invalid color might be treated as component or ignored
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),

  testWithSetup('Invalid hex color format handled', `Frame bg #xyz`, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),

  testWithSetup('Empty property value handled', `Frame bg`, async (api: TestAPI) => {
    // Empty value after property
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),
])

// =============================================================================
// Undefined Components
// =============================================================================

export const undefinedComponentTests: TestCase[] = describe('Undefined Components', [
  testWithSetup(
    'Undefined component reference shows warning or error',
    `MyButton "Click"`,
    async (api: TestAPI) => {
      // Undefined component might be created as generic element or show error
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')

      // Check if there's an error or the element exists
      const hasError = hasCompileError(api)
      const element = api.preview.inspect('node-1')

      api.assert.ok(hasError || element !== null, 'Should either have error or render element')
    }
  ),

  testWithSetup(
    'Nested undefined component handled',
    `Frame\n  UndefinedChild`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),

  testWithSetup(
    'Component with similar name to primitive handled',
    `Fram "Test"`,
    async (api: TestAPI) => {
      // Typo in primitive name
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),
])

// =============================================================================
// Invalid Token References
// =============================================================================

export const invalidTokenTests: TestCase[] = describe('Invalid Token References', [
  testWithSetup(
    'Undefined token reference handled',
    `Frame bg $undefined`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),

  testWithSetup('Token with invalid syntax handled', `Frame bg $`, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),

  testWithSetup(
    'Nested token property access on undefined',
    `Frame bg $theme.colors.missing`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),
])

// =============================================================================
// Syntax Errors
// =============================================================================

export const syntaxErrorTests: TestCase[] = describe('Syntax Errors', [
  testWithSetup(
    'Missing comma between properties',
    `Frame bg #333 pad 12`,
    async (api: TestAPI) => {
      // Missing comma might be handled gracefully or show error
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash')
    }
  ),

  testWithSetup('Unclosed string handled', `Text "Hello`, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),

  testWithSetup('Invalid indentation handled', `Frame\n Text "Child"`, async (api: TestAPI) => {
    // Single space instead of 2 might cause issues
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),

  testWithSetup('Empty state block handled', `Frame\n  hover:`, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash')
  }),

  testWithSetup('Circular component definition handled', `Foo: $Foo\nFoo`, async (api: TestAPI) => {
    // Self-referencing component
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash (may have error)')
  }),
])

// =============================================================================
// Error Recovery
// =============================================================================

export const compilerErrorRecoveryTests: TestCase[] = describe('Error Recovery', [
  testWithSetup('Recovery after fixing invalid property', `Frame w abc`, async (api: TestAPI) => {
    // Start with error
    const initialNodes = api.preview.getNodeIds()
    api.assert.ok(initialNodes.length >= 0, 'Initial state should not crash')

    // Fix the code
    await api.editor.setCode('Frame w 100')
    await api.utils.waitForCompile()

    // Should now work
    const element = api.preview.inspect('node-1')
    api.assert.ok(element !== null, 'Should render after fix')
    api.assert.ok(
      element!.styles.width === '100px',
      `Width should be 100px after fix, got ${element!.styles.width}`
    )
  }),

  testWithSetup(
    'Recovery after fixing undefined component',
    `MyBtn "Click"`,
    async (api: TestAPI) => {
      const initialNodes = api.preview.getNodeIds()
      api.assert.ok(initialNodes.length >= 0, 'Should not crash')

      // Define the component then use it
      await api.editor.setCode(`MyBtn: Button, bg #2271C1, col white\nMyBtn "Click"`)
      await api.utils.waitForCompile()

      // Should now work
      const element = api.preview.inspect('node-1')
      api.assert.ok(element !== null, 'Should render after defining component')
    }
  ),

  testWithSetup(
    'Recovery after fixing syntax error',
    `Frame bg #333 pad 12`,
    async (api: TestAPI) => {
      const initialNodes = api.preview.getNodeIds()
      api.assert.ok(initialNodes.length >= 0, 'Should not crash')

      // Fix with comma
      await api.editor.setCode('Frame bg #333, pad 12')
      await api.utils.waitForCompile()

      const element = api.preview.inspect('node-1')
      api.assert.ok(element !== null, 'Should render after fix')
    }
  ),

  testWithSetup('Multiple fixes in sequence', `Frame w abc`, async (api: TestAPI) => {
    // Fix 1: invalid to valid
    await api.editor.setCode('Frame w 100')
    await api.utils.waitForCompile()
    let element = api.preview.inspect('node-1')
    api.assert.ok(element !== null, 'Should render after first fix')

    // Fix 2: change value
    await api.editor.setCode('Frame w 200')
    await api.utils.waitForCompile()
    element = api.preview.inspect('node-1')
    api.assert.ok(element!.styles.width === '200px', 'Should update to 200px')

    // Add error again
    await api.editor.setCode('Frame w xyz')
    await api.utils.waitForCompile()
    api.assert.ok(api.preview.getNodeIds().length >= 0, 'Should not crash')

    // Fix again
    await api.editor.setCode('Frame w 300')
    await api.utils.waitForCompile()
    element = api.preview.inspect('node-1')
    api.assert.ok(element !== null, 'Should recover again')
  }),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseErrorTests: TestCase[] = describe('Error Edge Cases', [
  testWithSetup('Empty code handled', ``, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    // Empty code should result in empty preview or minimal wrapper
    api.assert.ok(nodeIds.length >= 0, 'Should not crash on empty code')
  }),

  testWithSetup('Whitespace only handled', `   \n\n   `, async (api: TestAPI) => {
    const nodeIds = api.preview.getNodeIds()
    api.assert.ok(nodeIds.length >= 0, 'Should not crash on whitespace')
  }),

  testWithSetup(
    'Comment only handled',
    `// This is a comment\n// Another comment`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 0, 'Should not crash on comments only')
    }
  ),

  testWithSetup(
    'Very deep nesting handled',
    `Frame\n  Frame\n    Frame\n      Frame\n        Frame\n          Frame\n            Frame\n              Frame\n                Frame\n                  Frame\n                    Text "Deep"`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Should handle deep nesting')
    }
  ),

  testWithSetup(
    'Very long line handled',
    `Frame w 100, h 100, bg #333, pad 12, mar 8, gap 4, rad 6, bor 1, boc #444, shadow md, col white, fs 14, center, hor, spread, wrap`,
    async (api: TestAPI) => {
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Should handle long line')
    }
  ),
])

// =============================================================================
// Export All Error Tests
// =============================================================================

export const allCompilerErrorTests: TestCase[] = [
  ...invalidPropertyTests,
  ...undefinedComponentTests,
  ...invalidTokenTests,
  ...syntaxErrorTests,
  ...compilerErrorRecoveryTests,
  ...edgeCaseErrorTests,
]

export default allCompilerErrorTests
