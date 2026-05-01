/**
 * Multi-Directional Sync — edits in one panel propagate to all others
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const multiDirectionalTests: TestCase[] = describe('Multi-Directional Sync', [
  testWithSetup(
    'Edit in editor, verify in preview',
    `Frame pad 16, bg #1a1a1a
  Button "Start", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Changed", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      api.dom.expect('node-2', { textContains: 'Changed' })
    }
  ),

  testWithSetup(
    'Edit in panel, verify in editor and preview',
    `Frame w 100, h 100, bg #333, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#f59e0b')
      await api.utils.delay(300)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('f59e0b'), 'Code should have new color')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('245, 158, 11') ||
          el.style.background.includes('245, 158, 11'),
        'Preview should show orange'
      )
    }
  ),

  testWithSetup(
    'Sequential edits across panels',
    `Frame pad 16, bg #1a1a1a
  Frame w 80, h 80, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      await api.panel.property.setProperty('width', '120')
      await api.utils.delay(50)

      const code = api.editor.getCode()
      const newCode = code.replace('bg #333', 'bg #2271C1')
      await api.editor.setCode(newCode)
      await api.utils.delay(100)

      const finalCode = api.editor.getCode()
      api.assert.ok(finalCode.includes('w 120'), 'Width should be 120')
      api.assert.ok(finalCode.includes('2271C1'), 'Background should be blue')
    }
  ),
])
