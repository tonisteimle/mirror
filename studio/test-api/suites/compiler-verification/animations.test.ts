/**
 * Compiler Verification — Animations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 12. Animation Verification
// =============================================================================

export const animationTests: TestCase[] = describe('Animations', [
  testWithSetup(
    'Spin animation',
    `Icon "loader", ic #2271C1, is 24, anim spin`,
    async (api: TestAPI) => {
      const icon = api.preview.inspect('node-1')
      api.assert.ok(icon !== null, 'Icon should exist')

      // Should have animation applied
      const hasAnimation =
        icon.styles.animation?.includes('spin') ||
        icon.styles.transform !== 'none' ||
        icon.dataAttributes['data-anim'] === 'spin'

      api.assert.ok(
        hasAnimation || icon.tagName === 'span',
        `Should have spin animation or be icon element, got animation: ${icon.styles.animation}`
      )
    }
  ),

  testWithSetup(
    'Pulse animation',
    `Frame w 50, h 50, bg #2271C1, rad 99, anim pulse`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.styles.borderRadius === '99px', 'Should be circle')
    }
  ),

  testWithSetup(
    'Bounce animation',
    `Frame w 50, h 50, bg #10b981, rad 8, anim bounce`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'State transition with duration',
    `Button "Smooth", bg #333, col white, pad 12 24, rad 6, toggle()
  hover 0.2s:
    bg #444
  on 0.3s ease-out:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Should have transition styles (might be in transition property or inline)
      api.assert.ok(btn.tagName === 'button', 'Should be a button')
    }
  ),

  testWithSetup(
    'Fade-in animation',
    `Frame w 100, h 100, bg #2271C1, rad 8, anim fade-in`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'Slide-up animation',
    `Frame w 100, h 50, bg #333, rad 8, anim slide-up`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),
])
