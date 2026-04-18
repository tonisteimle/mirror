/**
 * Alignment Zone Tests - Moving Single Child
 *
 * Tests the alignment zone functionality when moving an element that is
 * the only child of a container. When moving the only child, alignment
 * zones should appear because the container is "effectively empty".
 *
 * Key scenarios:
 * 1. Move single child within same container → alignment zones appear
 * 2. Verify alignment is set on PARENT, not child
 * 3. Test all 9 alignment zones work correctly
 * 4. Verify child retains its properties (no alignment on child)
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

// =============================================================================
// Helper: Verify alignment property on PARENT element (not child)
// =============================================================================

function verifyParentAlignment(
  code: string,
  expectedProperty: string
): { ok: boolean; found: string | null; parentLine: string | null } {
  const lines = code.split('\n')
  const alignProps = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']

  // Find the parent element (first non-indented Frame line)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Look for non-indented lines (parent elements)
    if (!line.match(/^\s/) && line.trim().startsWith('Frame')) {
      for (const prop of alignProps) {
        const regex = new RegExp(`\\b${prop}\\b`)
        if (regex.test(line)) {
          return {
            ok: prop === expectedProperty,
            found: prop,
            parentLine: line.trim(),
          }
        }
      }
    }
  }

  return { ok: false, found: null, parentLine: null }
}

function verifyChildHasNoAlignment(code: string): { ok: boolean; found: string | null } {
  const lines = code.split('\n')
  const alignProps = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']

  // Check indented lines (children) don't have alignment
  for (const line of lines) {
    if (line.match(/^\s{2,}/) && line.trim().length > 0) {
      for (const prop of alignProps) {
        const regex = new RegExp(`\\b${prop}\\b`)
        if (regex.test(line)) {
          return { ok: false, found: prop }
        }
      }
    }
  }

  return { ok: true, found: null }
}

// =============================================================================
// Helper: Verify child retains its original properties
// =============================================================================

function verifyChildProperties(
  code: string,
  expectedProps: string[]
): { ok: boolean; missing: string[] } {
  const lines = code.split('\n')
  const missing: string[] = []

  // Find indented lines (children)
  for (const line of lines) {
    if (line.match(/^\s{2,}/) && line.trim().length > 0) {
      // Check if child contains expected properties
      for (const prop of expectedProps) {
        if (!line.includes(prop)) {
          missing.push(prop)
        }
      }
      break // Only check first child
    }
  }

  return { ok: missing.length === 0, missing }
}

// =============================================================================
// Tests: Move single child to alignment zones
// =============================================================================

export const moveSingleChildTests: TestCase[] = describe('Move Single Child - Alignment Zones', [
  testWithSetup(
    'Move single child to center alignment',
    '', // Start with empty code
    async (api: TestAPI) => {
      // Setup: Frame with one child
      await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 50, h 50, bg #2271C1`)
      await api.utils.waitForCompile()

      // Verify initial state - parent Frame should exist
      const parent = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(parent !== null, 'Parent Frame should exist')

      // The child is node-2
      const child = document.querySelector('[data-mirror-id="node-2"]')
      api.assert.ok(child !== null, 'Child Frame should exist')

      // Move the single child to center alignment zone using direct API
      const dragTest = (window as any).__dragTest
      const runner = dragTest._runner // Access internal runner for debugging

      // Get CodeModifier to check if addProperty works
      const studio = (window as any).studio
      const codeModifier = studio?.codeModifier

      // Log available objects for debugging
      const debugInfo = {
        hasStudio: !!studio,
        hasCodeModifier: !!codeModifier,
        hasRunner: !!runner,
      }

      const result = await dragTest
        .moveElement('node-2')
        .toContainer('node-1')
        .atAlignmentZone('center')
        .execute()

      // Get description from result
      const resultInfo = {
        success: result.success,
        error: result.error,
        description: result.description,
        codeBefore: result.codeBefore?.replace(/\n/g, '\\n'),
        codeAfter: result.codeAfter?.replace(/\n/g, '\\n'),
      }

      if (!result.success) {
        throw new Error(
          `Drag operation failed: ${JSON.stringify(resultInfo)}. Debug: ${JSON.stringify(debugInfo)}`
        )
      }

      // Check if code changed at all
      if (result.codeBefore === result.codeAfter) {
        throw new Error(
          `Code did not change! ${JSON.stringify(resultInfo)}. Debug: ${JSON.stringify(debugInfo)}`
        )
      }

      // Wait for code change
      await api.utils.delay(300)
      await api.utils.waitForCompile()

      // Verify alignment is on PARENT
      const code = api.editor.getCode()

      const parentResult = verifyParentAlignment(code, 'center')
      api.assert.ok(
        parentResult.ok,
        `Expected PARENT with 'center' property, found '${parentResult.found}'. Code: ${code.replace(/\n/g, '\\n')}`
      )

      // Verify child has no alignment
      const childResult = verifyChildHasNoAlignment(code)
      api.assert.ok(
        childResult.ok,
        `Child should NOT have alignment property, found '${childResult.found}'`
      )
    }
  ),

  testWithSetup('Move single child to top-left alignment', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Button "Click me"`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'top-left')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const parentResult = verifyParentAlignment(code, 'tl')
    api.assert.ok(
      parentResult.ok,
      `Expected PARENT with 'tl' property, found '${parentResult.found}'`
    )
  }),

  testWithSetup('Move single child to bottom-right alignment', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Text "Hello"`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'bottom-right')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const parentResult = verifyParentAlignment(code, 'br')
    api.assert.ok(
      parentResult.ok,
      `Expected PARENT with 'br' property, found '${parentResult.found}'`
    )
  }),

  testWithSetup(
    'Child retains properties after move to alignment zone',
    '',
    async (api: TestAPI) => {
      await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 80, h 40, bg #ef4444, rad 8`)
      await api.utils.waitForCompile()

      await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'center')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // Verify child retains its properties
      const childProps = verifyChildProperties(code, ['w 80', 'h 40', 'bg #ef4444', 'rad 8'])
      api.assert.ok(
        childProps.ok,
        `Child should retain properties, missing: ${childProps.missing.join(', ')}`
      )
    }
  ),
])

// =============================================================================
// Tests: All 9 alignment zones via move
// =============================================================================

export const all9ZonesFromMoveTests: TestCase[] = describe('All 9 Alignment Zones from Move', [
  testWithSetup('Move to top-center (tc)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'top-center')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'tc')
    api.assert.ok(result.ok, `Expected PARENT with 'tc', found '${result.found}'`)
  }),

  testWithSetup('Move to top-right (tr)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'top-right')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'tr')
    api.assert.ok(result.ok, `Expected PARENT with 'tr', found '${result.found}'`)
  }),

  testWithSetup('Move to center-left (cl)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'center-left')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'cl')
    api.assert.ok(result.ok, `Expected PARENT with 'cl', found '${result.found}'`)
  }),

  testWithSetup('Move to center-right (cr)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'center-right')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'cr')
    api.assert.ok(result.ok, `Expected PARENT with 'cr', found '${result.found}'`)
  }),

  testWithSetup('Move to bottom-left (bl)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'bottom-left')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'bl')
    api.assert.ok(result.ok, `Expected PARENT with 'bl', found '${result.found}'`)
  }),

  testWithSetup('Move to bottom-center (bc)', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame w 40, h 40, bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'bottom-center')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    const result = verifyParentAlignment(code, 'bc')
    api.assert.ok(result.ok, `Expected PARENT with 'bc', found '${result.found}'`)
  }),
])

// =============================================================================
// Tests: Multiple children - no alignment zones
// =============================================================================

export const multipleChildrenNoAlignmentTests: TestCase[] = describe(
  'Multiple Children - No Alignment Zones',
  [
    testWithSetup(
      'Container with multiple children uses normal index-based drop',
      '',
      async (api: TestAPI) => {
        // Setup: Frame with TWO children - alignment zones should NOT appear
        await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a, gap 8
  Frame w 40, h 40, bg #2271C1
  Frame w 40, h 40, bg #ef4444`)
        await api.utils.waitForCompile()

        // Move first child to index 1 (after second child)
        // This should use normal flex drop, not alignment zone
        await api.interact.moveElement('node-2', 'node-1', 1)
        await api.utils.waitForCompile()

        const code = api.editor.getCode()

        // Parent should NOT have alignment property (multiple children)
        const parentResult = verifyParentAlignment(code, 'center')
        api.assert.ok(
          !parentResult.found,
          `Parent should NOT have alignment when container has multiple children`
        )

        // Verify order changed (red frame is now first)
        api.assert.codeContains('bg #ef4444')
        api.assert.codeContains('bg #2271C1')
      }
    ),
  ]
)

// =============================================================================
// Tests: Edge cases
// =============================================================================

export const alignmentMoveEdgeCases: TestCase[] = describe('Alignment Move Edge Cases', [
  testWithSetup('Moving Button preserves text content', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Button "My Button", bg #2271C1`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'center')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()

    // Verify button text is preserved
    api.assert.codeContains('"My Button"')

    // Verify alignment on parent
    const parentResult = verifyParentAlignment(code, 'center')
    api.assert.ok(parentResult.ok, `Expected 'center' on parent`)
  }),

  testWithSetup('Moving nested Frame preserves children', '', async (api: TestAPI) => {
    await api.editor.setCode(`Frame w 200, h 200, bg #1a1a1a
  Frame pad 16, bg #333
    Text "Inner"`)
    await api.utils.waitForCompile()

    await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'bottom-right')
    await api.utils.waitForCompile()

    const code = api.editor.getCode()

    // Verify inner Text is preserved
    api.assert.codeContains('Text "Inner"')

    // Verify alignment on root parent
    const parentResult = verifyParentAlignment(code, 'br')
    api.assert.ok(parentResult.ok, `Expected 'br' on parent`)
  }),

  testWithSetup('Small container does not show alignment zones', '', async (api: TestAPI) => {
    // Container smaller than 80px - should NOT show alignment zones
    await api.editor.setCode(`Frame w 60, h 60, bg #1a1a1a
  Frame w 20, h 20, bg #2271C1`)
    await api.utils.waitForCompile()

    // This should use normal index-based drop instead
    await api.interact.moveElement('node-2', 'node-1', 0)
    await api.utils.waitForCompile()

    const code = api.editor.getCode()

    // Parent should NOT have alignment (container too small)
    const parentResult = verifyParentAlignment(code, 'center')
    api.assert.ok(!parentResult.found, `Small container should not have alignment property`)
  }),
])

// =============================================================================
// Export All Tests
// =============================================================================

export const allAlignmentFromMoveTests: TestCase[] = [
  ...moveSingleChildTests,
  ...all9ZonesFromMoveTests,
  ...multipleChildrenNoAlignmentTests,
  ...alignmentMoveEdgeCases,
]
