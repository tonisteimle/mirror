/**
 * Property Aliases — shorthand vs longform (w/width, bg/background, …)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const aliasTests: TestCase[] = describe('Property Aliases', [
  testWithSetup(
    'Parse shorthand properties',
    `Frame w 200, h 100, bg #333, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 200'), 'Should have w shorthand')
      api.assert.ok(code.includes('h 100'), 'Should have h shorthand')
    }
  ),

  testWithSetup(
    'Modify using shorthand name',
    `Frame width 200, height 100, background #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#2271C1'), 'Should have updated color value')
    }
  ),

  testWithSetup(
    'Mixed alias usage preserved',
    `Frame w 100, height 50, bg #333, color white`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('w', '150')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 150') || code.includes('width 150'), 'Width updated')
    }
  ),
])
