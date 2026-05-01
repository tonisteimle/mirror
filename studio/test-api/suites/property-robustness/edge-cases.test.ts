/**
 * Property Edge Cases — single property, text content, long lines, hex variants
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const edgeCaseTests: TestCase[] = describe('Property Edge Cases', [
  testWithSetup('Single property element', `Frame bg #333`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#10b981')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#10b981'), 'Should update single property')
  }),

  testWithSetup(
    'Boolean with one value property',
    `Frame hor center, pad 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 24'), 'Should update padding')
      api.assert.ok(code.includes('hor'), 'Boolean hor should be preserved')
      api.assert.ok(code.includes('center'), 'Boolean center should be preserved')
    }
  ),

  testWithSetup(
    'Element with text content',
    `Button "Click me", pad 12 24, bg #2271C1`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Should update bg')
      api.assert.ok(code.includes('Click me'), 'Text content should be preserved')
    }
  ),

  testWithSetup(
    'Long line with many properties',
    `Frame w 200, h 100, pad 16, bg #333, col white, rad 8, gap 12, shadow md, cursor pointer`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 12'), 'Radius should be updated')
      api.assert.ok(code.includes('shadow md'), 'Other properties preserved')
    }
  ),

  testWithSetup('Hex color with alpha', `Frame bg #2271C180, pad 16`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#10b98150')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#10b98150'), 'Should support 8-char hex')
  }),

  testWithSetup('3-digit hex color', `Frame bg #333, col #fff`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('bg', '#f00')
    await api.utils.delay(300)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('#f00'), 'Should support 3-char hex')
  }),
])
