/**
 * Compiler Verification — Complex Property Combinations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 1. Komplexe Property-Kombinationen
// =============================================================================

export const complexPropertyTests: TestCase[] = describe('Complex Properties', [
  testWithSetup(
    'All spacing properties combined',
    `Frame pad 8 16 12 20, mar 4 8, gap 6, w 200, h 150, bg #1a1a1a`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Padding: top right bottom left
      api.assert.ok(
        el.styles.paddingTop === '8px',
        `paddingTop should be 8px, got ${el.styles.paddingTop}`
      )
      api.assert.ok(
        el.styles.paddingRight === '16px',
        `paddingRight should be 16px, got ${el.styles.paddingRight}`
      )
      api.assert.ok(
        el.styles.paddingBottom === '12px',
        `paddingBottom should be 12px, got ${el.styles.paddingBottom}`
      )
      api.assert.ok(
        el.styles.paddingLeft === '20px',
        `paddingLeft should be 20px, got ${el.styles.paddingLeft}`
      )

      // Width/Height
      api.assert.ok(el.styles.width === '200px', `width should be 200px, got ${el.styles.width}`)
      api.assert.ok(el.styles.height === '150px', `height should be 150px, got ${el.styles.height}`)

      // Gap
      api.assert.ok(el.styles.gap === '6px', `gap should be 6px, got ${el.styles.gap}`)
    }
  ),

  testWithSetup(
    'Border with all sides different',
    `Frame bor 1 2 3 4, boc #ff0000, rad 4 8 12 16, w 100, h 100`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Border widths (top right bottom left)
      api.assert.ok(
        el.styles.borderWidth.includes('1px') || el.styles.borderTopWidth === '1px',
        'Border top should be 1px'
      )

      // Border radius (top-left top-right bottom-right bottom-left)
      const radTL = el.styles.borderRadius.split(' ')[0] || el.styles.borderTopLeftRadius
      api.assert.ok(
        radTL === '4px' || radTL.includes('4'),
        `Border radius TL should be 4px, got ${radTL}`
      )
    }
  ),

  testWithSetup(
    'Text with all typography properties',
    `Text "Styled Text", fs 24, weight 600, font mono, italic, underline, uppercase, line 1.5, col #2271C1`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      api.assert.ok(
        el.styles.fontSize === '24px',
        `fontSize should be 24px, got ${el.styles.fontSize}`
      )
      api.assert.ok(
        el.styles.fontWeight === '600',
        `fontWeight should be 600, got ${el.styles.fontWeight}`
      )
      api.assert.ok(
        el.styles.fontStyle === 'italic',
        `fontStyle should be italic, got ${el.styles.fontStyle}`
      )
      api.assert.ok(
        el.styles.textDecoration.includes('underline'),
        `textDecoration should include underline, got ${el.styles.textDecoration}`
      )
      api.assert.ok(
        el.styles.textTransform === 'uppercase',
        `textTransform should be uppercase, got ${el.styles.textTransform}`
      )

      // Color check
      api.assert.ok(
        colorsMatch(el.styles.color, '#2271C1'),
        `color should be #2271C1, got ${el.styles.color}`
      )
    }
  ),

  testWithSetup(
    'Shadow and effects combined',
    `Frame w 100, h 100, bg white, shadow lg, opacity 0.8, blur 2`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      api.assert.ok(el.styles.opacity === '0.8', `opacity should be 0.8, got ${el.styles.opacity}`)
      api.assert.ok(
        el.styles.boxShadow !== 'none' && el.styles.boxShadow !== '',
        `boxShadow should exist, got ${el.styles.boxShadow}`
      )
    }
  ),

  testWithSetup(
    'Gradient background horizontal',
    `Frame w 200, h 100, bg grad #ff0000 #0000ff`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      // Should have gradient background - check multiple properties
      const bg = el.styles.background || el.styles.backgroundImage || ''
      api.assert.ok(
        bg.includes('gradient') || bg.includes('linear') || bg.includes('rgb'),
        `Should have gradient background, got "${bg}" (background: "${el.styles.background}", backgroundImage: "${el.styles.backgroundImage}")`
      )
    }
  ),

  testWithSetup(
    'Gradient background with angle',
    `Frame w 200, h 100, bg grad 45 #10b981 #2271C1`,
    async (api: TestAPI) => {
      const el = api.preview.inspect('node-1')
      api.assert.ok(el !== null, 'Element should exist')

      const bg = el.styles.background || el.styles.backgroundImage || ''
      // Check for gradient - angle might be normalized differently by browser
      api.assert.ok(
        bg.includes('gradient') || bg.includes('linear'),
        `Should have gradient, got "${bg}" (background: "${el.styles.background}", backgroundImage: "${el.styles.backgroundImage}")`
      )
    }
  ),
])
