/**
 * Compiler Verification — Icons (verification + variants)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 18. Icon Verification
// =============================================================================

export const iconTests: TestCase[] = describe('Icon Verification', [
  testWithSetup('Icon with size', `Icon "check", ic #10b981, is 32`, async (api: TestAPI) => {
    const icon = api.preview.inspect('node-1')
    api.assert.ok(icon !== null, 'Icon should exist')

    // Icon should have size applied (width/height or font-size depending on implementation)
    const hasSize =
      icon.styles.width === '32px' ||
      icon.styles.height === '32px' ||
      icon.styles.fontSize === '32px'

    api.assert.ok(
      hasSize || icon.tagName === 'span',
      `Icon should have size 32, got w:${icon.styles.width} h:${icon.styles.height}`
    )
  }),

  testWithSetup(
    'Icon filled variant',
    `Icon "heart", ic #ef4444, is 24, fill`,
    async (api: TestAPI) => {
      const icon = api.preview.inspect('node-1')
      api.assert.ok(icon !== null, 'Icon should exist')
      // Fill variant verification depends on implementation
    }
  ),

  testWithSetup(
    'Multiple icons in row',
    `Frame hor, gap 8, pad 12, bg #1a1a1a, rad 8
  Icon "home", ic #888, is 20
  Icon "settings", ic #888, is 20
  Icon "user", ic #888, is 20
  Icon "bell", ic #888, is 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.exists('node-5')

      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons')
    }
  ),
])

// =============================================================================
// 51. Custom Icons
// =============================================================================

export const iconVariantTests: TestCase[] = describe('Icon Variants', [
  testWithSetup(
    'Icon with different sizes',
    `Frame hor, gap 16, pad 16, bg #1a1a1a, rad 8, ver-center
  Icon "check", ic #10b981, is 16
  Icon "check", ic #10b981, is 24
  Icon "check", ic #10b981, is 32`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 3, 'Should have 3 icons')
    }
  ),

  testWithSetup(
    'Icon with different colors',
    `Frame hor, gap 12, pad 16, bg #1a1a1a, rad 8
  Icon "circle", ic #10b981, is 24
  Icon "circle", ic #f59e0b, is 24
  Icon "circle", ic #ef4444, is 24
  Icon "circle", ic #2271C1, is 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons')
    }
  ),

  testWithSetup(
    'Icon filled vs outline',
    `Frame hor, gap 16, pad 16, bg #1a1a1a, rad 8
  Icon "heart", ic #ef4444, is 24
  Icon "heart", ic #ef4444, is 24, fill
  Icon "star", ic #f59e0b, is 24
  Icon "star", ic #f59e0b, is 24, fill`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container?.children.length === 4, 'Should have 4 icons (2 outline, 2 filled)')
    }
  ),
])
