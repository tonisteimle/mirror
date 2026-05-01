/**
 * Property Order Independence — order should not affect parsing/modification
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const orderTests: TestCase[] = describe('Property Order Independence', [
  testWithSetup(
    'Properties in standard order',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Properties in reverse order',
    `Frame rad 8, col white, bg #333, pad 16`,
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
    'Size before color',
    `Frame w 200, h 100, col white, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('h', '150')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('h 150') || code.includes('height 150'), 'Height updated')
    }
  ),
])
