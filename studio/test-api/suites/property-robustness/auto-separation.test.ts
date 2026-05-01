/**
 * Auto-Separated Properties — single-line without commas
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const autoSeparationTests: TestCase[] = describe('Auto-Separated Properties', [
  testWithSetup(
    'Parse properties without commas',
    `Frame pad 16 bg #333 col white rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 16'), 'Should parse pad')
      api.assert.ok(code.includes('bg #333'), 'Should parse bg')
    }
  ),

  testWithSetup(
    'Modify property in auto-separated line',
    `Frame w 200 h 100 bg #444 rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Should have updated bg')
    }
  ),

  testWithSetup(
    'Boolean properties auto-separated',
    `Frame hor center gap 8 pad 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('hor'), 'Should have hor')
      api.assert.ok(code.includes('center'), 'Should have center')

      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)
      code = api.editor.getCode()
      api.assert.ok(code.includes('gap 12'), 'Should have updated gap')
      api.assert.ok(code.includes('hor'), 'Should still have hor')
    }
  ),
])
