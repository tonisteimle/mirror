/**
 * Spacing Tests
 *
 * Tests for: pad, p, pad-x, pad-y, px, py, mar, m, mar-x, mar-y
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const spacingTests: TestCase[] = describe('Spacing', [
  // Padding
  testWithSetup('pad single value', 'Frame pad 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '16px')
  }),

  testWithSetup('pad two values (vertical horizontal)', 'Frame pad 8 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '8px')
    api.assert.hasStyle('node-1', 'paddingRight', '16px')
    api.assert.hasStyle('node-1', 'paddingBottom', '8px')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
  }),

  testWithSetup('pad four values (TRBL)', 'Frame pad 4 8 12 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '4px')
    api.assert.hasStyle('node-1', 'paddingRight', '8px')
    api.assert.hasStyle('node-1', 'paddingBottom', '12px')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
  }),

  testWithSetup('p alias for pad', 'Frame p 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '20px')
  }),

  testWithSetup('pad-x sets horizontal padding', 'Frame pad-x 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '24px')
    api.assert.hasStyle('node-1', 'paddingRight', '24px')
  }),

  testWithSetup('pad-y sets vertical padding', 'Frame pad-y 12', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '12px')
    api.assert.hasStyle('node-1', 'paddingBottom', '12px')
  }),

  testWithSetup('px alias for pad-x', 'Frame px 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
    api.assert.hasStyle('node-1', 'paddingRight', '16px')
  }),

  testWithSetup('py alias for pad-y', 'Frame py 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '8px')
    api.assert.hasStyle('node-1', 'paddingBottom', '8px')
  }),

  // Margin
  testWithSetup('mar single value', 'Frame mar 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'margin', '16px')
  }),

  testWithSetup('m alias for mar', 'Frame m 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'margin', '8px')
  }),

  testWithSetup('mar-x sets horizontal margin', 'Frame mar-x 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginLeft', '20px')
    api.assert.hasStyle('node-1', 'marginRight', '20px')
  }),

  testWithSetup('mar-y sets vertical margin', 'Frame mar-y 10', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginTop', '10px')
    api.assert.hasStyle('node-1', 'marginBottom', '10px')
  }),
])
