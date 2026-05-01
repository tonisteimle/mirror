/**
 * Compiler Verification — Charts
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 36. Charts
// =============================================================================

export const chartTests: TestCase[] = describe('Charts', [
  testWithSetup(
    'Line chart',
    `sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280

Line $sales, w 300, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Line chart should render')
    }
  ),

  testWithSetup(
    'Bar chart',
    `data:
  A: 30
  B: 50
  C: 40
  D: 70

Bar $data, w 300, h 200, colors #2271C1`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Bar chart should render')
    }
  ),

  testWithSetup(
    'Pie chart',
    `distribution:
  Desktop: 55
  Mobile: 35
  Tablet: 10

Pie $distribution, w 200, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Pie chart should render')
    }
  ),

  testWithSetup(
    'Donut chart',
    `usage:
  Used: 75
  Free: 25

Donut $usage, w 200, h 200`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Donut chart should render')
    }
  ),

  testWithSetup(
    'Area chart',
    `metrics:
  Week1: 100
  Week2: 150
  Week3: 130
  Week4: 180
  Week5: 220

Area $metrics, w 300, h 150`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Area chart should render')
    }
  ),

  testWithSetup(
    'Chart with title and axes',
    `revenue:
  Q1: 25000
  Q2: 32000
  Q3: 28000
  Q4: 41000

Line $revenue, w 400, h 250, colors #10b981
  Title: text "Revenue 2024", col white
  XAxis: label "Quarter", col #888
  YAxis: label "€", min 0, col #888`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Chart with config should render')
    }
  ),
])
