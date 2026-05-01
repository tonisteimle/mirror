/**
 * Basic Chart Rendering Tests (line / bar / pie / donut / area)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const basicChartTests: TestCase[] = describe('Basic Charts', [
  testWithSetup(
    'Chart with inline data renders canvas',
    `sales:
  Jan: 120
  Feb: 180
  Mar: 240

Chart type line, $sales, w 300, h 200`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Chart container should exist')
    }
  ),

  testWithSetup(
    'Line chart renders',
    `data:
  A: 10
  B: 20
  C: 30

Chart type line, $data, w 200, h 150`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Bar chart renders',
    `data:
  Q1: 100
  Q2: 150
  Q3: 200
  Q4: 180

Chart type bar, $data, w 200, h 150`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Pie chart renders',
    `categories:
  Design: 35
  Dev: 45
  Marketing: 20

Chart type pie, $categories, w 200, h 200`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Donut chart renders',
    `data:
  A: 30
  B: 40
  C: 30

Chart type donut, $data, w 200, h 200`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Area chart renders',
    `traffic:
  Mon: 100
  Tue: 120
  Wed: 90
  Thu: 150
  Fri: 80

Chart type area, $traffic, w 250, h 150`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.waitForIdle()
    }
  ),
])
