/**
 * Sizing Tests
 *
 * Tests for: w, h, minw, maxw, minh, maxh
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sizingTests: TestCase[] = describe('Sizing', [
  testWithSetup('w sets width', 'Frame w 200', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '200px')
  }),

  testWithSetup('h sets height', 'Frame h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'height', '100px')
  }),

  testWithSetup('w and h together', 'Frame w 150, h 75', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '150px')
    api.assert.hasStyle('node-1', 'height', '75px')
  }),

  testWithSetup('minw sets min-width', 'Frame minw 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minWidth', '100px')
  }),

  testWithSetup('maxw sets max-width', 'Frame maxw 500', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxWidth', '500px')
  }),

  testWithSetup('minh sets min-height', 'Frame minh 50', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minHeight', '50px')
  }),

  testWithSetup('maxh sets max-height', 'Frame maxh 300', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxHeight', '300px')
  }),
])
