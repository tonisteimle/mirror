/**
 * Rapid Changes — fast property changes, selection switches, code edits
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const rapidChangeTests: TestCase[] = describe('Rapid Changes', [
  testWithSetup(
    'Rapid property changes in panel',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 100, bg #333, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      for (let i = 0; i < 5; i++) {
        await api.panel.property.setProperty('radius', String((i + 1) * 4))
        await api.utils.delay(20)
      }
      await api.utils.delay(100)

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('rad 20') || code.includes('radius 20'),
        'Final radius should be 20'
      )
    }
  ),

  testWithSetup(
    'Rapid selection changes',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "A", col white
  Text "B", col #888
  Text "C", col #666
  Text "D", col #444`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(100)

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have final selection')
    }
  ),

  testWithSetup(
    'Code edit during selection',
    `Frame pad 16, bg #1a1a1a, gap 8
  Button "A", bg #333, col white, pad 8 16, rad 4
  Button "B", bg #444, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "A", bg #2271C1, col white, pad 8 16, rad 4
  Button "B", bg #10b981, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      const btnA = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const btnB = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(btnA !== null, 'Button A should exist')
      api.assert.ok(btnB !== null, 'Button B should exist')
    }
  ),
])
