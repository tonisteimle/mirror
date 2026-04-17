/**
 * Property Robustness Tests
 *
 * Tests for robust handling of various property arrangements:
 * - Single line with commas
 * - Single line without commas (auto-separation)
 * - Multi-line properties
 * - Different property orders
 * - Shorthand vs longform (bg vs background)
 * - Multi-value properties (pad 8 16)
 * - Boolean properties (hor, center)
 * - Token references ($primary)
 * - Mixed formats
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Single Line with Commas (Classic Format)
// =============================================================================

export const commaFormatTests: TestCase[] = describe('Comma-Separated Properties', [
  testWithSetup(
    'Parse and modify comma-separated properties',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify parsing - check code contains all properties
      let code = api.editor.getCode()
      api.assert.ok(code.includes('pad 16'), 'Should have pad 16')
      api.assert.ok(code.includes('bg #333'), 'Should have bg #333')
      api.assert.ok(code.includes('col white'), 'Should have col white')
      api.assert.ok(code.includes('rad 8'), 'Should have rad 8')

      // Modify property via panel
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)

      // Verify modification
      code = api.editor.getCode()
      api.assert.ok(code.includes('bg #2271C1'), 'Should have updated bg')
      api.assert.ok(!code.includes('bg #333'), 'Should not have old bg')
    }
  ),

  testWithSetup(
    'Modify property at different positions',
    `Button "Click", pad 12 24, bg #2271C1, col white, rad 6, fs 14`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify first property
      await api.panel.property.setProperty('pad', '8 16')
      await api.utils.delay(300)
      let code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16'), 'Should have updated pad')

      // Modify last property
      await api.panel.property.setProperty('fs', '16')
      await api.utils.delay(300)
      code = api.editor.getCode()
      api.assert.ok(code.includes('fs 16'), 'Should have updated fs')
    }
  ),
])

// =============================================================================
// Single Line Without Commas (Auto-Separation)
// =============================================================================

export const autoSeparationTests: TestCase[] = describe('Auto-Separated Properties', [
  testWithSetup(
    'Parse properties without commas',
    `Frame pad 16 bg #333 col white rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify parsing works
      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 16'), 'Should parse pad')
      api.assert.ok(code.includes('bg #333'), 'Should parse bg')
    }
  ),

  testWithSetup(
    'Modify property in auto-separated line',
    `Frame w 200 h 100 bg #444 rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify property
      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Should have updated bg')
    }
  ),

  testWithSetup(
    'Boolean properties auto-separated',
    `Frame hor center gap 8 pad 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify boolean properties are preserved
      let code = api.editor.getCode()
      api.assert.ok(code.includes('hor'), 'Should have hor')
      api.assert.ok(code.includes('center'), 'Should have center')

      // Modify numeric property
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)
      code = api.editor.getCode()
      api.assert.ok(code.includes('gap 12'), 'Should have updated gap')
      api.assert.ok(code.includes('hor'), 'Should still have hor')
    }
  ),
])

// =============================================================================
// Multi-Value Properties
// =============================================================================

export const multiValueTests: TestCase[] = describe('Multi-Value Properties', [
  testWithSetup(
    'Parse two-value padding (V H)',
    `Frame pad 8 16, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16'), 'Should have two-value padding')
    }
  ),

  testWithSetup(
    'Parse four-value padding (T R B L)',
    `Frame pad 8 16 12 16, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16 12 16'), 'Should have four-value padding')
    }
  ),

  testWithSetup(
    'Modify multi-value property',
    `Frame pad 8 16, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Change to different multi-value
      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 12 24'), 'Should have updated padding')
      api.assert.ok(!code.includes('pad 8 16'), 'Should not have old padding')
    }
  ),

  testWithSetup(
    'Multi-value without commas preserved',
    `Frame pad 8 16 bg #333 rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify different property
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      // Padding should be unchanged
      api.assert.ok(code.includes('8') && code.includes('16'), 'Padding values should be preserved')
      api.assert.ok(code.includes('rad 8'), 'Radius should be updated')
    }
  ),
])

// =============================================================================
// Shorthand vs Longform (Aliases)
// =============================================================================

export const aliasTests: TestCase[] = describe('Property Aliases', [
  testWithSetup(
    'Parse shorthand properties',
    `Frame w 200, h 100, bg #333, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 200'), 'Should have w shorthand')
      api.assert.ok(code.includes('h 100'), 'Should have h shorthand')
    }
  ),

  testWithSetup(
    'Modify using shorthand name',
    `Frame width 200, height 100, background #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify using shorthand
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      // Should update the background property (might keep original name or use shorthand)
      api.assert.ok(code.includes('#2271C1'), 'Should have updated color value')
    }
  ),

  testWithSetup(
    'Mixed alias usage preserved',
    `Frame w 100, height 50, bg #333, color white`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify one property
      await api.panel.property.setProperty('w', '150')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 150') || code.includes('width 150'), 'Width updated')
    }
  ),
])

// =============================================================================
// Property Order
// =============================================================================

export const orderTests: TestCase[] = describe('Property Order Independence', [
  testWithSetup(
    'Properties in standard order',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Properties in reverse order',
    `Frame rad 8, col white, bg #333, pad 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify middle property
      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Should have updated bg')
    }
  ),

  testWithSetup(
    'Size before color',
    `Frame w 200, h 100, col white, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('h', '150')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('h 150') || code.includes('height 150'), 'Height updated')
    }
  ),
])

// =============================================================================
// Complex Mixed Formats
// =============================================================================

export const mixedFormatTests: TestCase[] = describe('Mixed Property Formats', [
  testWithSetup(
    'Commas and auto-separation mixed',
    `Frame pad 16 bg #333, col white rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#888'), 'Should have updated color')
    }
  ),

  testWithSetup(
    'Boolean with value properties mixed',
    `Frame hor, gap 8, center, pad 16 bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 16'), 'Gap should be updated')
      api.assert.ok(code.includes('hor'), 'hor should be preserved')
      api.assert.ok(code.includes('center'), 'center should be preserved')
    }
  ),

  testWithSetup(
    'Multi-value in mixed context',
    `Frame hor pad 8 16, gap 8 bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#444')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#444'), 'bg should be updated')
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Property Edge Cases', [
  testWithSetup('Single property element', `Frame bg #333`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#10b981')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#10b981'), 'Should update single property')
  }),

  testWithSetup(
    'Boolean with one value property',
    `Frame hor center, pad 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify the value property
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 24'), 'Should update padding')
      api.assert.ok(code.includes('hor'), 'Boolean hor should be preserved')
      api.assert.ok(code.includes('center'), 'Boolean center should be preserved')
    }
  ),

  testWithSetup(
    'Element with text content',
    `Button "Click me", pad 12 24, bg #2271C1`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Should update bg')
      api.assert.ok(code.includes('Click me'), 'Text content should be preserved')
    }
  ),

  testWithSetup(
    'Long line with many properties',
    `Frame w 200, h 100, pad 16, bg #333, col white, rad 8, gap 12, shadow md, cursor pointer`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Modify property in middle
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 12'), 'Radius should be updated')
      api.assert.ok(code.includes('shadow md'), 'Other properties preserved')
    }
  ),

  testWithSetup('Hex color with alpha', `Frame bg #2271C180, pad 16`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#10b98150')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#10b98150'), 'Should support 8-char hex')
  }),

  testWithSetup('3-digit hex color', `Frame bg #333, col #fff`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#f00')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#f00'), 'Should support 3-char hex')
  }),
])

// =============================================================================
// Sequential Modifications
// =============================================================================

export const sequentialModTests: TestCase[] = describe('Sequential Modifications', [
  testWithSetup(
    'Multiple property changes on same element',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // First change
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(200)

      // Second change
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(200)

      // Third change
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#2271C1'), 'bg should be updated')
      api.assert.ok(code.includes('rad 12'), 'rad should be updated')
      api.assert.ok(code.includes('pad 24'), 'pad should be updated')
    }
  ),

  testWithSetup('Change then revert property', `Frame bg #333, pad 16`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    // Change
    await api.panel.property.setProperty('bg', '#2271C1')
    await api.utils.delay(200)

    let code = api.editor.getCode()
    api.assert.ok(code.includes('#2271C1'), 'Should change to blue')

    // Revert
    await api.panel.property.setProperty('bg', '#333')
    await api.utils.delay(300)

    code = api.editor.getCode()
    api.assert.ok(code.includes('#333'), 'Should revert to original')
  }),
])

// =============================================================================
// Preview Sync Verification
// =============================================================================

export const previewSyncTests: TestCase[] = describe('Preview Sync After Property Change', [
  testWithSetup(
    'Background color syncs to preview',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(400)

      // Check preview
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('16, 185, 129') ||
          el.style.background.includes('16, 185, 129'),
        'Preview should show green'
      )
    }
  ),

  testWithSetup('Width syncs to preview', `Frame w 100, h 50, bg #333`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('w', '200')
    await api.utils.delay(400)

    const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(el !== null, 'Element should exist')
    const width = parseInt(el.style.width || '0')
    api.assert.ok(width >= 195 && width <= 205, `Width should be ~200, got ${width}`)
  }),

  testWithSetup(
    'Padding syncs to preview',
    `Frame pad 8, bg #333, w 100, h 50`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(400)

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.padding === '24px' || el.style.padding.includes('24'),
        'Preview should have 24px padding'
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allPropertyRobustnessTests: TestCase[] = [
  ...commaFormatTests,
  ...autoSeparationTests,
  ...multiValueTests,
  ...aliasTests,
  ...orderTests,
  ...mixedFormatTests,
  ...edgeCaseTests,
  ...sequentialModTests,
  ...previewSyncTests,
]
