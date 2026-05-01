/**
 * Chart Data Format Tests (key-value object, single value entries)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chartDataTests: TestCase[] = describe('Chart Data Formats', [
  testWithSetup(
    'Key-value object data',
    `revenue:
  January: 1200
  February: 1800
  March: 2400
  April: 2000

Chart type line, $revenue, w 300, h 200`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Single value entries',
    `metrics:
  Users: 1500
  Sessions: 3200
  Pageviews: 8500

Chart type bar, $metrics, w 300, h 200`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),
])
