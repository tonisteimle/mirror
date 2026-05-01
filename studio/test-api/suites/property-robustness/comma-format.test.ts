/**
 * Comma-Separated Properties — classic comma-list format
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const commaFormatTests: TestCase[] = describe('Comma-Separated Properties', [
  testWithSetup(
    'Parse and modify comma-separated properties',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('pad 16'), 'Should have pad 16')
      api.assert.ok(code.includes('bg #333'), 'Should have bg #333')
      api.assert.ok(code.includes('col white'), 'Should have col white')
      api.assert.ok(code.includes('rad 8'), 'Should have rad 8')

      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)

      code = api.editor.getCode()
      api.assert.ok(code.includes('bg #2271C1'), 'Should have updated bg')
      api.assert.ok(!code.includes('bg #333'), 'Should not have old bg')
    }
  ),

  testWithSetup(
    'Modify property at different positions',
    `Button "Click", pad 12 24, bg #2271C1, col white, rad 6, fs 14`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '8 16')
      await api.utils.delay(300)
      let code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16'), 'Should have updated pad')

      await api.panel.property.setProperty('fs', '16')
      await api.utils.delay(300)
      code = api.editor.getCode()
      api.assert.ok(code.includes('fs 16'), 'Should have updated fs')
    }
  ),
])
