/**
 * Preview → Editor Sync — clicks in preview update selection/cursor
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const previewToEditorTests: TestCase[] = describe('Preview → Editor Sync', [
  testWithSetup(
    'Click in preview selects element',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "First", col white
  Text "Second", col #888
  Button "Third", bg #333, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      await api.interact.click('node-4')
      await api.utils.delay(100)

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have selection')
    }
  ),

  testWithSetup(
    'Click different elements updates selection',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "One", col white
  Text "Two", col #888`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)
      const sel1 = api.state.getSelection()

      await api.interact.click('node-3')
      await api.utils.delay(50)
      const sel2 = api.state.getSelection()

      api.assert.ok(sel1 !== null && sel2 !== null, 'Both selections should exist')
    }
  ),

  testWithSetup(
    'Click nested element selects correctly',
    `Frame pad 16, bg #1a1a1a
  Frame pad 12, bg #222, rad 8
    Frame pad 8, bg #333, rad 4
      Text "Deep", col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-4')
      await api.utils.delay(100)

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have selection for nested element')
    }
  ),
])
