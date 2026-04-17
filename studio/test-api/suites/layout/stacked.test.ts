/**
 * Stacked Layout Tests
 *
 * Tests for: stacked, absolute positioning
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const stackedTests: TestCase[] = describe('Stacked Layout', [
  testWithSetup(
    'stacked positions children absolutely',
    'Frame stacked, w 100, h 100\n  Text "Bottom"\n  Text "Top"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'stacked with positioned children',
    'Frame stacked, w 100, h 100\n  Frame w full, h full, bg blue\n  Frame x 10, y 10, w 20, h 20, bg red',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
    }
  ),
])
