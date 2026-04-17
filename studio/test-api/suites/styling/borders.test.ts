/**
 * Border Tests
 *
 * Tests for: bor, boc, rad
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const borderTests: TestCase[] = describe('Borders', [
  testWithSetup('bor sets border width', 'Frame bor 1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '1px')
  }),

  testWithSetup('bor with color', 'Frame bor 2, boc #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '2px')
    api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('rad sets border-radius', 'Frame rad 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '8px')
  }),

  testWithSetup('rad 99 for pill shape', 'Frame rad 99, w 100, h 40', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '99px')
  }),

  testWithSetup('bor 0 removes border', 'Frame bor 0', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '0px')
  }),
])
