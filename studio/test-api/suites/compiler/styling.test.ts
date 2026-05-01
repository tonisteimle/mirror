/**
 * Compiler Styling Tests — colors, padding, radius, font, dimensions, opacity
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const stylingTests: TestCase[] = describe('Styling', [
  testWithSetup('bg applies background color', 'Frame bg #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('col applies text color', 'Text "Hello", col #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(239, 68, 68)')
  }),

  testWithSetup('pad applies padding', 'Frame pad 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '20px')
  }),

  testWithSetup('rad applies border-radius', 'Frame rad 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '8px')
  }),

  testWithSetup('fs applies font-size', 'Text "Big", fs 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontSize', '24px')
  }),

  testWithSetup('weight applies font-weight', 'Text "Bold", weight bold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '700')
  }),

  testWithSetup('w and h apply dimensions', 'Frame w 200, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '200px')
    api.assert.hasStyle('node-1', 'height', '100px')
  }),

  testWithSetup('opacity applies', 'Frame opacity 0.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'opacity', '0.5')
  }),
])
