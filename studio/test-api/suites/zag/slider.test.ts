/**
 * Slider Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sliderTests: TestCase[] = describe('Slider', [
  testWithSetup('Slider renders with value', 'Slider value 50', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Slider should render')

    const value = api.zag.getValue('node-1')
    api.assert.ok(value === 50 || value === '50', `Slider value should be 50, got ${value}`)
  }),

  testWithSetup('Slider with min/max', 'Slider min 0, max 100, value 25', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const value = api.zag.getValue('node-1')
    api.assert.ok(value === 25 || value === '25', `Slider value should be 25, got ${value}`)
  }),

  testWithSetup(
    'Slider with step',
    'Slider min 0, max 100, step 10, value 50',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const value = api.zag.getValue('node-1')
      api.assert.ok(value === 50 || value === '50', `Slider value should be 50, got ${value}`)
    }
  ),

  testWithSetup('Slider disabled', 'Slider value 30, disabled', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const value = api.zag.getValue('node-1')
    api.assert.ok(value === 30 || value === '30', `Slider value should be 30, got ${value}`)
  }),
])
