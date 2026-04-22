/**
 * Property Panel Error Handling Tests - B2.2
 *
 * Tests that verify the property panel handles errors gracefully:
 * - Invalid color values
 * - Negative/invalid sizes
 * - Invalid token references
 * - Edge cases in input handling
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper: Select element and wait for panel
// =============================================================================

async function selectAndWait(api: TestAPI, nodeId: string): Promise<boolean> {
  await api.interact.click(nodeId)
  await api.utils.delay(100)
  return api.panel.property.isVisible()
}

// =============================================================================
// Invalid Color Values
// =============================================================================

export const invalidColorTests: TestCase[] = describe('Property Panel: Invalid Colors', [
  testWithSetup(
    'Invalid hex color does not crash panel',
    `Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try to set invalid color
      const result = await api.panel.property.setProperty('background', 'xyz')

      // Panel should still be functional
      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')

      // Element should still exist
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Incomplete hex color handled',
    `Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try to set incomplete hex
      await api.panel.property.setProperty('background', '#12')
      await api.utils.delay(100)

      // Panel should still work
      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Invalid rgba format handled',
    `Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid rgba
      await api.panel.property.setProperty('background', 'rgba(300, 300, 300)')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Empty color value handled',
    `Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try empty color
      await api.panel.property.setProperty('background', '')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),
])

// =============================================================================
// Invalid Size Values
// =============================================================================

export const invalidSizeTests: TestCase[] = describe('Property Panel: Invalid Sizes', [
  testWithSetup(
    'Negative width value handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative width
      await api.panel.property.setProperty('width', '-50')
      await api.utils.delay(100)

      // Panel should not crash
      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Non-numeric width value handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try non-numeric
      await api.panel.property.setProperty('width', 'abc')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Very large size value handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try very large value
      await api.panel.property.setProperty('width', '999999')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Decimal size value handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try decimal value
      await api.panel.property.setProperty('width', '50.5')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup('Zero size value handled', `Frame w 100, h 100, bg #333`, async (api: TestAPI) => {
    await selectAndWait(api, 'node-1')

    // Try zero
    await api.panel.property.setProperty('width', '0')
    await api.utils.delay(100)

    api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
  }),
])

// =============================================================================
// Invalid Token References
// =============================================================================

export const invalidTokenReferenceTests: TestCase[] = describe('Property Panel: Invalid Tokens', [
  testWithSetup(
    'Non-existent token handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try to set non-existent token
      await api.panel.property.setProperty('background', '$nonexistent')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid token syntax handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid token syntax
      await api.panel.property.setProperty('background', '$')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Token click on unavailable token handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try to click a token that doesn't exist
      const result = await api.panel.property.clickToken('background', 'nonexistent')

      // Should not crash
      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),
])

// =============================================================================
// Spacing Property Errors
// =============================================================================

export const spacingErrorTests: TestCase[] = describe('Property Panel: Spacing Errors', [
  testWithSetup(
    'Negative padding handled',
    `Frame pad 12, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative padding
      await api.panel.property.setProperty('padding', '-10')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid margin format handled',
    `Frame mar 8, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid format
      await api.panel.property.setProperty('margin', '10 20 30 40 50')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid gap value handled',
    `Frame gap 8, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid gap
      await api.panel.property.setProperty('gap', 'invalid')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),
])

// =============================================================================
// Border & Radius Errors
// =============================================================================

export const borderErrorTests: TestCase[] = describe('Property Panel: Border Errors', [
  testWithSetup(
    'Negative border width handled',
    `Frame bor 1, boc #444, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative border
      await api.panel.property.setProperty('border', '-5')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid border color handled',
    `Frame bor 1, boc #444, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid border color
      await api.panel.property.setProperty('borderColor', 'notacolor')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Negative radius handled',
    `Frame rad 8, w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative radius
      await api.panel.property.setProperty('radius', '-10')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),
])

// =============================================================================
// Typography Errors
// =============================================================================

export const typographyErrorTests: TestCase[] = describe('Property Panel: Typography Errors', [
  testWithSetup(
    'Negative font size handled',
    `Text "Hello", fs 14, col white`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative font size
      await api.panel.property.setProperty('fontSize', '-10')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid font weight handled',
    `Text "Hello", weight bold, col white`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try invalid weight
      await api.panel.property.setProperty('fontWeight', 'verybold')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Invalid line height handled',
    `Text "Hello", line 1.5, col white`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try negative line height
      await api.panel.property.setProperty('lineHeight', '-2')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const panelEdgeCaseTests: TestCase[] = describe('Property Panel: Edge Cases', [
  testWithSetup(
    'Rapid property changes handled',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Rapid fire property changes
      for (let i = 0; i < 10; i++) {
        api.panel.property.setProperty('width', String(100 + i * 10))
        // Don't await - fire rapidly
      }

      await api.utils.delay(300)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Property change during selection change',
    `Frame w 100, h 100, bg #333\nFrame w 50, h 50, bg #444`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Start property change
      const changePromise = api.panel.property.setProperty('width', '200')

      // Immediately select another element
      await api.interact.click('node-2')

      await changePromise
      await api.utils.delay(100)

      // Should not crash
      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Unicode in property value handled',
    `Text "Hello", col white`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try unicode in text
      await api.panel.property.setProperty('content', 'Hello 👋 World')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup(
    'Special characters in value handled',
    `Text "Hello", col white`,
    async (api: TestAPI) => {
      await selectAndWait(api, 'node-1')

      // Try special chars
      await api.panel.property.setProperty('content', '<script>alert(1)</script>')
      await api.utils.delay(100)

      api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
    }
  ),

  testWithSetup('Very long value handled', `Text "Hello", col white`, async (api: TestAPI) => {
    await selectAndWait(api, 'node-1')

    // Try very long text
    const longText = 'A'.repeat(1000)
    await api.panel.property.setProperty('content', longText)
    await api.utils.delay(100)

    api.assert.ok(api.panel.property.isVisible(), 'Panel should remain visible')
  }),
])

// =============================================================================
// Export All Panel Error Tests
// =============================================================================

export const allPanelErrorTests: TestCase[] = [
  ...invalidColorTests,
  ...invalidSizeTests,
  ...invalidTokenReferenceTests,
  ...spacingErrorTests,
  ...borderErrorTests,
  ...typographyErrorTests,
  ...panelEdgeCaseTests,
]

export default allPanelErrorTests
