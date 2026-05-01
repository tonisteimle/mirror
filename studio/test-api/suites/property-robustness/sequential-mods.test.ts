/**
 * Sequential Modifications — multiple property changes on same element
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sequentialModTests: TestCase[] = describe('Sequential Modifications', [
  testWithSetup(
    'Multiple property changes on same element',
    `Frame pad 16, bg #333, col white, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#2271C1'), 'bg should be updated')
      api.assert.ok(code.includes('rad 12'), 'rad should be updated')
      api.assert.ok(code.includes('pad 24'), 'pad should be updated')
    }
  ),

  testWithSetup('Change then revert property', `Frame bg #333, pad 16`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#2271C1')
    await api.utils.delay(200)

    let code = api.editor.getCode()
    api.assert.ok(code.includes('#2271C1'), 'Should change to blue')

    await api.panel.property.setProperty('bg', '#333')
    await api.utils.delay(300)

    code = api.editor.getCode()
    api.assert.ok(code.includes('#333'), 'Should revert to original')
  }),
])
