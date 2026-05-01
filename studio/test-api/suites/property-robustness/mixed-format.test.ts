/**
 * Mixed Property Formats — commas + auto-separation, booleans + values
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const mixedFormatTests: TestCase[] = describe('Mixed Property Formats', [
  testWithSetup(
    'Commas and auto-separation mixed',
    `Frame pad 16 bg #333, col white rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#888'), 'Should have updated color')
    }
  ),

  testWithSetup(
    'Boolean with value properties mixed',
    `Frame hor, gap 8, center, pad 16 bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 16'), 'Gap should be updated')
      api.assert.ok(code.includes('hor'), 'hor should be preserved')
      api.assert.ok(code.includes('center'), 'center should be preserved')
    }
  ),

  testWithSetup(
    'Multi-value in mixed context',
    `Frame hor pad 8 16, gap 8 bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#444')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#444'), 'bg should be updated')
    }
  ),
])
