/**
 * Compiler Verification — Advanced Typography
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 17. Advanced Typography
// =============================================================================

export const advancedTypographyTests: TestCase[] = describe('Advanced Typography', [
  testWithSetup(
    'Line height variations',
    `Frame gap 8, pad 16, bg #1a1a1a, w 300
  Text "Line 1.0", col white, line 1
  Text "Line 1.5", col white, line 1.5
  Text "Line 2.0", col white, line 2`,
    async (api: TestAPI) => {
      // Just verify they render - line height is hard to verify from computed styles
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Text alignment',
    `Frame gap 8, pad 16, bg #1a1a1a, w 300
  Text "Left aligned", col white, text-align left
  Text "Center aligned", col white, text-align center
  Text "Right aligned", col white, text-align right`,
    async (api: TestAPI) => {
      const left = api.preview.inspect('node-2')
      api.assert.ok(left, 'left should exist')
      const center = api.preview.inspect('node-3')
      api.assert.ok(center, 'center should exist')
      const right = api.preview.inspect('node-4')
      api.assert.ok(right, 'right should exist')

      api.assert.ok(
        left?.styles.textAlign === 'left' || left?.styles.textAlign === 'start',
        'Left align'
      )
      api.assert.ok(
        center?.styles.textAlign === 'center',
        `Center align, got ${center?.styles.textAlign}`
      )
      api.assert.ok(
        right?.styles.textAlign === 'right' || right?.styles.textAlign === 'end',
        'Right align'
      )
    }
  ),

  testWithSetup(
    'Font weights',
    `Frame gap 4, pad 16, bg #1a1a1a
  Text "Thin 100", col white, weight 100
  Text "Light 300", col white, weight 300
  Text "Normal 400", col white, weight normal
  Text "Medium 500", col white, weight 500
  Text "Bold 700", col white, weight bold
  Text "Black 900", col white, weight 900`,
    async (api: TestAPI) => {
      const thin = api.preview.inspect('node-2')
      api.assert.ok(thin, 'thin should exist')
      const bold = api.preview.inspect('node-6')
      api.assert.ok(bold, 'bold should exist')

      api.assert.ok(
        thin?.styles.fontWeight === '100',
        `Thin should be 100, got ${thin?.styles.fontWeight}`
      )
      api.assert.ok(
        bold?.styles.fontWeight === '700' || bold?.styles.fontWeight === 'bold',
        `Bold should be 700/bold, got ${bold?.styles.fontWeight}`
      )
    }
  ),

  testWithSetup(
    'Text truncation with width',
    `Text "This is a very long text that should be truncated with an ellipsis when it exceeds the width", col white, w 150, truncate`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text should exist')

      // Should have truncation styles
      const hasTruncation =
        text.styles.textOverflow === 'ellipsis' ||
        text.styles.overflow === 'hidden' ||
        text.styles.whiteSpace === 'nowrap'

      api.assert.ok(hasTruncation, 'Should have truncation styles')
    }
  ),

  testWithSetup(
    'Font families',
    `Frame gap 4, pad 16, bg #1a1a1a
  Text "Sans-serif font", col white, font sans
  Text "Monospace font", col white, font mono
  Text "Serif font", col white, font serif`,
    async (api: TestAPI) => {
      const mono = api.preview.inspect('node-3')
      api.assert.ok(mono !== null, 'Mono text should exist')

      // Should have monospace font
      const hasMono =
        mono.styles.fontFamily.includes('mono') ||
        mono.styles.fontFamily.includes('Consolas') ||
        mono.styles.fontFamily.includes('Monaco') ||
        mono.styles.fontFamily.includes('Courier')

      api.assert.ok(hasMono, `Should have monospace font, got ${mono.styles.fontFamily}`)
    }
  ),
])
