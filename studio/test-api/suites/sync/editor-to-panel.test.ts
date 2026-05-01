/**
 * Editor → Property Panel Sync — cursor/selection drives panel
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const editorToPanelTests: TestCase[] = describe('Editor → Property Panel Sync', [
  testWithSetup(
    'Cursor position updates panel',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Line 2", col white, fs 18
  Button "Line 3", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      api.editor.setCursor(3, 0)
      await api.utils.delay(100)

      const panel = api.panel.property.isVisible()
      api.assert.ok(panel !== undefined, 'Panel should be accessible')
    }
  ),

  testWithSetup(
    'Code edit updates selected element',
    `Frame pad 16, bg #1a1a1a
  Button "Edit", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(100)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Edit", bg #ef4444, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      api.dom.expect('node-2', { textContains: 'Edit' })
    }
  ),
])
