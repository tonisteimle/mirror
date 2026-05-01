/**
 * Property Panel → Editor Sync — panel changes update code & preview
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const panelToEditorTests: TestCase[] = describe('Property Panel → Editor Sync', [
  testWithSetup(
    'Change property updates code',
    `Button "Test", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('#2271C1') || code.includes('2271C1'),
        'Code should contain new color'
      )
    }
  ),

  testWithSetup(
    'Change numeric property via panel',
    `Text "Test", col white, fs 16`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 24'), 'Code should contain updated font-size')
    }
  ),

  testWithSetup(
    'Property change reflects in preview',
    `Frame w 100, h 100, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Code should contain new color')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('16, 185, 129') ||
          el.style.background.includes('16, 185, 129'),
        'Preview should show green background'
      )
    }
  ),
])
