/**
 * Chart-in-Layout Tests (Chart inside Frame, multiple charts)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chartLayoutTests: TestCase[] = describe('Chart in Layout', [
  testWithSetup(
    'Chart inside Frame',
    `data:
  A: 100
  B: 200

Frame pad 16, bg #1a1a1a, rad 8
  Text "Sales Chart", col white
  Chart type line, $data, w 280, h 180`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Multiple charts in layout',
    `sales:
  Q1: 100
  Q2: 150

visits:
  Mon: 50
  Tue: 80

Frame hor, gap 16
  Chart type line, $sales, w 200, h 150
  Chart type bar, $visits, w 200, h 150`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      await api.utils.waitForIdle()
    }
  ),
])
