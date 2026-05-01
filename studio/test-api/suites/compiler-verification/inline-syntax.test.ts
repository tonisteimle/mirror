/**
 * Compiler Verification — Inline Syntax
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 8. Inline Syntax (Semicolon)
// =============================================================================

export const inlineSyntaxTests: TestCase[] = describe('Inline Syntax', [
  testWithSetup(
    'Semicolon separated elements',
    `Frame hor, gap 8; Button "A", bg #333; Button "B", bg #444; Button "C", bg #555`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button A
      api.assert.exists('node-3') // Button B
      api.assert.exists('node-4') // Button C

      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame, 'frame should exist')
      api.assert.ok(
        frame?.children.length === 3,
        `Should have 3 children, got ${frame?.children.length}`
      )
    }
  ),

  testWithSetup(
    'Icon with text inline',
    `Frame hor, gap 8, ver-center; Icon "check", ic #10b981, is 20; Text "Success", col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Icon
      api.assert.exists('node-3') // Text

      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame?.styles.alignItems === 'center', 'Should be vertically centered')
    }
  ),
])
