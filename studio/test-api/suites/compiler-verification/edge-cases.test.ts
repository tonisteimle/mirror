/**
 * Compiler Verification — Edge Cases
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 10. Edge Cases & Stress
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Edge Cases', [
  testWithSetup('Empty Frame renders', `Frame w 100, h 100, bg #333`, async (api: TestAPI) => {
    api.assert.exists('node-1')
    const frame = api.preview.inspect('node-1')
    api.assert.ok(frame?.children.length === 0, 'Empty frame should have no children')
  }),

  testWithSetup(
    'Very long text content',
    `Text "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.", col white, w 200, truncate`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text should exist')
      api.assert.ok(
        text.styles.textOverflow === 'ellipsis' || text.styles.overflow === 'hidden',
        'Should truncate with ellipsis'
      )
    }
  ),

  testWithSetup(
    'Special characters in text',
    `Text "Hello <World> & 'Friends' \"Everyone\"", col white`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText?.includes('<World>') || text?.fullText?.includes('&lt;World&gt;'),
        'Special characters should be handled'
      )
    }
  ),

  testWithSetup(
    'Unicode and emoji',
    `Text "Hello 世界 🌍 مرحبا", col white, fs 18`,
    async (api: TestAPI) => {
      const text = api.preview.inspect('node-1')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText?.includes('🌍') || text?.fullText?.includes('世界'),
        'Unicode should render correctly'
      )
    }
  ),

  testWithSetup(
    'Zero and negative values',
    `Frame w 0, h 0, pad 0, gap 0, mar 0, rad 0, bor 0`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist even with zero values')
    }
  ),

  testWithSetup(
    'Very large values',
    `Frame w 9999, h 9999, pad 999, gap 999`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should handle large values')
      api.assert.ok(
        frame.styles.width === '9999px',
        `Width should be 9999px, got ${frame.styles.width}`
      )
    }
  ),

  testWithSetup(
    'Comments in code',
    `// Header comment
Frame pad 16, bg #1a1a1a
  // Child comment
  Text "Hello", col white
  // Another comment
  Button "Click", bg #2271C1, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame?.children.length === 2, 'Comments should not create elements')
    }
  ),

  testWithSetup(
    'Multiple empty lines',
    `Frame pad 16, bg #1a1a1a


  Text "After blank lines", col white


  Button "Also works", bg #333`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),
])
