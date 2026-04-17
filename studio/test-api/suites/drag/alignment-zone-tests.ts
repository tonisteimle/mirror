/**
 * Alignment Zone Drag & Drop Tests
 *
 * Tests for dropping components into alignment zones (9-point grid)
 * in empty containers >= 80x80px.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase } from '../../types'

// =============================================================================
// Helper: Verify alignment property in code
// =============================================================================

function verifyAlignmentProperty(
  code: string,
  expectedProperty: string
): { ok: boolean; found: string | null } {
  const alignProps = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']
  for (const prop of alignProps) {
    // Match standalone property (not part of another word)
    const regex = new RegExp(`\\b${prop}\\b`)
    if (regex.test(code)) {
      return { ok: prop === expectedProperty, found: prop }
    }
  }
  return { ok: false, found: null }
}

// =============================================================================
// Basic Alignment Zone Tests
// =============================================================================

export const basicAlignmentZoneTests: TestCase[] = describe('Basic Alignment Zone Drops', [
  testWithSetup('Drop Button at center zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')

    const code = api.editor.getCode()
    api.assert.codeContains(/Button/)
    const result = verifyAlignmentProperty(code, 'center')
    api.assert.ok(result.ok, `Expected 'center' property, found '${result.found}'`)
  }),

  testWithSetup('Drop Text at top-left zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Text', 'node-1', 'top-left')

    const code = api.editor.getCode()
    api.assert.codeContains(/Text/)
    const result = verifyAlignmentProperty(code, 'tl')
    api.assert.ok(result.ok, `Expected 'tl' property, found '${result.found}'`)
  }),

  testWithSetup('Drop Icon at bottom-right zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Icon', 'node-1', 'bottom-right')

    const code = api.editor.getCode()
    api.assert.codeContains(/Icon/)
    const result = verifyAlignmentProperty(code, 'br')
    api.assert.ok(result.ok, `Expected 'br' property, found '${result.found}'`)
  }),

  testWithSetup('Drop Button at top-center zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-center')

    const code = api.editor.getCode()
    api.assert.codeContains(/Button/)
    const result = verifyAlignmentProperty(code, 'tc')
    api.assert.ok(result.ok, `Expected 'tc' property, found '${result.found}'`)
  }),

  testWithSetup('Drop Text at center-left zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Text', 'node-1', 'center-left')

    const code = api.editor.getCode()
    api.assert.codeContains(/Text/)
    const result = verifyAlignmentProperty(code, 'cl')
    api.assert.ok(result.ok, `Expected 'cl' property, found '${result.found}'`)
  }),
])

// =============================================================================
// All 9 Zones Tests
// =============================================================================

export const allZonesTests: TestCase[] = describe('All 9 Alignment Zones', [
  testWithSetup('Drop at top-right zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-right')

    const code = api.editor.getCode()
    const result = verifyAlignmentProperty(code, 'tr')
    api.assert.ok(result.ok, `Expected 'tr' property, found '${result.found}'`)
  }),

  testWithSetup('Drop at center-right zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'center-right')

    const code = api.editor.getCode()
    const result = verifyAlignmentProperty(code, 'cr')
    api.assert.ok(result.ok, `Expected 'cr' property, found '${result.found}'`)
  }),

  testWithSetup('Drop at bottom-left zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'bottom-left')

    const code = api.editor.getCode()
    const result = verifyAlignmentProperty(code, 'bl')
    api.assert.ok(result.ok, `Expected 'bl' property, found '${result.found}'`)
  }),

  testWithSetup('Drop at bottom-center zone', 'Frame w 200, h 200, bg #1a1a1a', async api => {
    await api.interact.dragToAlignmentZone('Button', 'node-1', 'bottom-center')

    const code = api.editor.getCode()
    const result = verifyAlignmentProperty(code, 'bc')
    api.assert.ok(result.ok, `Expected 'bc' property, found '${result.found}'`)
  }),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const alignmentEdgeCaseTests: TestCase[] = describe('Alignment Zone Edge Cases', [
  testWithSetup(
    'Alignment zone works at minimum size (80x80)',
    'Frame w 80, h 80, bg #1a1a1a',
    async api => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      const result = verifyAlignmentProperty(code, 'center')
      api.assert.ok(result.ok, `Expected 'center' property, found '${result.found}'`)
    }
  ),

  testWithSetup(
    'Alignment zone works with large container',
    'Frame w 500, h 400, bg #1a1a1a',
    async api => {
      await api.interact.dragToAlignmentZone('Text', 'node-1', 'bottom-right')

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)
      const result = verifyAlignmentProperty(code, 'br')
      api.assert.ok(result.ok, `Expected 'br' property, found '${result.found}'`)
    }
  ),

  testWithSetup(
    'Nested empty container gets alignment zone',
    'Frame w 300, h 300, bg #1a1a1a, pad 20\n  Frame w 200, h 200, bg #333',
    async api => {
      // Drop into the nested Frame (node-2)
      await api.interact.dragToAlignmentZone('Button', 'node-2', 'center')

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      const result = verifyAlignmentProperty(code, 'center')
      api.assert.ok(result.ok, `Expected 'center' property, found '${result.found}'`)
    }
  ),
])

// =============================================================================
// Component Variety Tests
// =============================================================================

export const componentVarietyTests: TestCase[] = describe(
  'Different Components in Alignment Zones',
  [
    testWithSetup('Drop Input at center', 'Frame w 200, h 200, bg #1a1a1a', async api => {
      await api.interact.dragToAlignmentZone('Input', 'node-1', 'center')

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      const result = verifyAlignmentProperty(code, 'center')
      api.assert.ok(result.ok, `Expected 'center' property, found '${result.found}'`)
    }),

    testWithSetup('Drop Image at top-left', 'Frame w 200, h 200, bg #1a1a1a', async api => {
      await api.interact.dragToAlignmentZone('Image', 'node-1', 'top-left')

      const code = api.editor.getCode()
      api.assert.codeContains(/Image/)
      const result = verifyAlignmentProperty(code, 'tl')
      api.assert.ok(result.ok, `Expected 'tl' property, found '${result.found}'`)
    }),

    testWithSetup('Drop Divider at center', 'Frame w 200, h 200, bg #1a1a1a', async api => {
      await api.interact.dragToAlignmentZone('Divider', 'node-1', 'center')

      const code = api.editor.getCode()
      api.assert.codeContains(/Divider/)
      const result = verifyAlignmentProperty(code, 'center')
      api.assert.ok(result.ok, `Expected 'center' property, found '${result.found}'`)
    }),
  ]
)

// =============================================================================
// Export All Tests
// =============================================================================

export const allAlignmentZoneTests: TestCase[] = [
  ...basicAlignmentZoneTests,
  ...allZonesTests,
  ...alignmentEdgeCaseTests,
  ...componentVarietyTests,
]
