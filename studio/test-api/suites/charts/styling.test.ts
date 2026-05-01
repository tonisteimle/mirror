/**
 * Chart Styling Tests (custom colors, sizes)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chartStylingTests: TestCase[] = describe('Chart Styling', [
  testWithSetup(
    'Chart with custom colors',
    `data:
  A: 10
  B: 20

Chart type bar, $data, w 200, h 150, colors #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Chart with size',
    `data:
  X: 50
  Y: 50

Chart type pie, $data, w 300, h 300`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Chart should exist')
    }
  ),
])
