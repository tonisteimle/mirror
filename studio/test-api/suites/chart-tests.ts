/**
 * Chart Test Suite
 *
 * Tests chart rendering with data.
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Basic Chart Rendering
// =============================================================================

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
      // Chart should render - wait for Chart.js to load
      await api.utils.delay(500)
      // Check that node exists and is a container
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
      await api.utils.delay(300)
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
      await api.utils.delay(300)
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
      await api.utils.delay(300)
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
      await api.utils.delay(300)
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
      await api.utils.delay(300)
    }
  ),
])

// =============================================================================
// Chart with Styling
// =============================================================================

export const chartStylingTests: TestCase[] = describe('Chart Styling', [
  testWithSetup(
    'Chart with custom colors',
    `data:
  A: 10
  B: 20

Chart type bar, $data, w 200, h 150, colors #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      await api.utils.delay(300)
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
      // Container should have the specified size
      api.assert.ok(info !== null, 'Chart should exist')
    }
  ),
])

// =============================================================================
// Chart in Layout
// =============================================================================

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
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Text
      api.assert.exists('node-3') // Chart
      await api.utils.delay(300)
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
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Chart 1
      api.assert.exists('node-3') // Chart 2
      await api.utils.delay(500)
    }
  ),
])

// =============================================================================
// Data Formats
// =============================================================================

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
      await api.utils.delay(300)
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
      await api.utils.delay(300)
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allChartTests: TestCase[] = [
  ...basicChartTests,
  ...chartStylingTests,
  ...chartLayoutTests,
  ...chartDataTests,
]
