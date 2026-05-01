/**
 * Multi-Value Properties — pad/mar with 2 or 4 values
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const multiValueTests: TestCase[] = describe('Multi-Value Properties', [
  testWithSetup(
    'Parse two-value padding (V H)',
    `Frame pad 8 16, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16'), 'Should have two-value padding')
    }
  ),

  testWithSetup(
    'Parse four-value padding (T R B L)',
    `Frame pad 8 16 12 16, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 8 16 12 16'), 'Should have four-value padding')
    }
  ),

  testWithSetup(
    'Modify multi-value property',
    `Frame pad 8 16, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 12 24'), 'Should have updated padding')
      api.assert.ok(!code.includes('pad 8 16'), 'Should not have old padding')
    }
  ),

  testWithSetup(
    'Multi-value without commas preserved',
    `Frame pad 8 16 bg #333 rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('8') && code.includes('16'), 'Padding values should be preserved')
      api.assert.ok(code.includes('rad 8'), 'Radius should be updated')
    }
  ),
])
