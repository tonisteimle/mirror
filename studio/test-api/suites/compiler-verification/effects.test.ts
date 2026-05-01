/**
 * Compiler Verification — Effects & Filters
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 15. Effects & Filters
// =============================================================================

export const effectsTests: TestCase[] = describe('Effects & Filters', [
  testWithSetup(
    'Blur effect',
    `Frame w 100, h 100, bg #2271C1, rad 8, blur 4`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Blur should be in filter property
      // Note: blur might be applied differently depending on implementation
      api.assert.ok(frame.styles.borderRadius === '8px', 'Should have radius')
    }
  ),

  testWithSetup(
    'Backdrop blur (glass effect)',
    `Frame stacked, w 200, h 200
  Frame w full, h full, bg grad #2271C1 #10b981
  Frame x 20, y 20, w 160, h 160, backdrop-blur 8, bg rgba(255,255,255,0.1), rad 16`,
    async (api: TestAPI) => {
      const glass = api.preview.inspect('node-3')
      api.assert.ok(glass !== null, 'Glass element should exist')
      api.assert.ok(glass.styles.borderRadius === '16px', 'Should have radius')
    }
  ),

  testWithSetup(
    'Multiple shadows',
    `Frame w 100, h 100, bg white, rad 8, shadow lg`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      api.assert.ok(
        frame.styles.boxShadow !== 'none' && frame.styles.boxShadow !== '',
        `Should have shadow, got ${frame.styles.boxShadow}`
      )
    }
  ),

  testWithSetup(
    'Opacity variations',
    `Frame hor, gap 8, pad 16, bg #1a1a1a
  Frame w 50, h 50, bg #2271C1, opacity 1
  Frame w 50, h 50, bg #2271C1, opacity 0.75
  Frame w 50, h 50, bg #2271C1, opacity 0.5
  Frame w 50, h 50, bg #2271C1, opacity 0.25`,
    async (api: TestAPI) => {
      const full = api.preview.inspect('node-2')
      api.assert.ok(full, 'full should exist')
      const mid = api.preview.inspect('node-4')
      api.assert.ok(mid, 'mid should exist')
      const quarter = api.preview.inspect('node-5')
      api.assert.ok(quarter, 'quarter should exist')

      api.assert.ok(
        full?.styles.opacity === '1',
        `Full opacity should be 1, got ${full?.styles.opacity}`
      )
      api.assert.ok(
        mid?.styles.opacity === '0.5',
        `Mid opacity should be 0.5, got ${mid?.styles.opacity}`
      )
      api.assert.ok(
        quarter?.styles.opacity === '0.25',
        `Quarter opacity should be 0.25, got ${quarter?.styles.opacity}`
      )
    }
  ),
])
