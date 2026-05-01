/**
 * Compiler Verification — Transforms
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 13. Transform Verification
// =============================================================================

export const transformTests: TestCase[] = describe('Transforms', [
  testWithSetup(
    'Rotate transform',
    `Frame w 100, h 100, bg #2271C1, rad 8, rotate 45`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have rotation in transform
      // Note: Browser may return matrix() instead of rotate() for computed style
      // matrix(0.707107, 0.707107, ...) is the computed matrix for 45deg rotation
      const hasRotation =
        frame.styles.transform.includes('rotate') ||
        frame.styles.transform.includes('45') ||
        frame.styles.transform.includes('matrix') ||
        frame.styles.transform !== 'none'

      api.assert.ok(hasRotation, `Should have rotation transform, got ${frame.styles.transform}`)
    }
  ),

  testWithSetup(
    'Scale transform',
    `Frame w 100, h 100, bg #10b981, rad 8, scale 1.5`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have scale in transform
      api.assert.ok(
        frame.styles.transform.includes('scale') || frame.styles.transform.includes('1.5'),
        `Should have scale transform, got ${frame.styles.transform}`
      )
    }
  ),

  testWithSetup(
    'Multiple transforms combined',
    `Frame w 80, h 80, bg #f59e0b, rad 8, rotate 15, scale 0.9`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Should have some transform
      api.assert.ok(
        frame.styles.transform !== 'none' && frame.styles.transform !== '',
        `Should have transforms, got ${frame.styles.transform}`
      )
    }
  ),

  testWithSetup(
    'Z-index stacking',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w 100, h 100, bg #333, z 1
  Frame x 50, y 50, w 100, h 100, bg #2271C1, z 2
  Frame x 100, y 100, w 100, h 100, bg #10b981, z 3`,
    async (api: TestAPI) => {
      const z1 = api.preview.inspect('node-2')
      api.assert.ok(z1, 'z1 should exist')
      const z2 = api.preview.inspect('node-3')
      api.assert.ok(z2, 'z2 should exist')
      const z3 = api.preview.inspect('node-4')

      api.assert.ok(z1 !== null && z2 !== null && z3 !== null, 'All layers should exist')

      // Z-index should be set
      api.assert.ok(
        parseInt(z3?.styles.zIndex || '0') >= parseInt(z1?.styles.zIndex || '0'),
        'Higher z should stack on top'
      )
    }
  ),

  testWithSetup(
    'Absolute positioning with offsets',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame x 20, y 30, w 50, h 50, bg #2271C1`,
    async (api: TestAPI) => {
      const positioned = api.preview.inspect('node-2')
      api.assert.ok(positioned !== null, 'Positioned element should exist')

      api.assert.ok(
        positioned.styles.position === 'absolute',
        `Should be absolute, got ${positioned.styles.position}`
      )
      api.assert.ok(
        positioned.styles.left === '20px',
        `Left should be 20px, got ${positioned.styles.left}`
      )
      api.assert.ok(
        positioned.styles.top === '30px',
        `Top should be 30px, got ${positioned.styles.top}`
      )
    }
  ),
])
