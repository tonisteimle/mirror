/**
 * Compiler Verification — Responsive States
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 39. Responsive / Container States
// =============================================================================

export const responsiveTests: TestCase[] = describe('Responsive States', [
  testWithSetup(
    'Compact state',
    `Frame w 300, pad 16, bg #1a1a1a, rad 8
  compact:
    pad 8
    gap 4
  regular:
    pad 16
    gap 8
  wide:
    pad 24
    gap 12
  Text "Responsive Content", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'Layout changes by size',
    `Frame w 400, pad 16, bg #1a1a1a, rad 8
  compact:
    ver
  regular:
    hor
  Frame w 100, h 50, bg #333, rad 4
  Frame w 100, h 50, bg #444, rad 4
  Frame w 100, h 50, bg #555, rad 4`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.children.length === 3, 'Should have 3 children')
    }
  ),
])
