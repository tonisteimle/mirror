/**
 * Selection Persistence — selection survives unrelated edits, clears on delete
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const selectionPersistenceTests: TestCase[] = describe('Selection Persistence', [
  testWithSetup(
    'Selection persists after code edit',
    `Frame pad 16, bg #1a1a1a, gap 8
  Button "Selected", bg #333, col white, pad 12 24, rad 6
  Text "Other", col #888`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(100)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "Selected", bg #333, col white, pad 12 24, rad 6
  Text "Changed", col #888`)
      await api.utils.delay(100)

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Selection should persist')
    }
  ),

  testWithSetup(
    'Selection updates when selected element changes',
    `Frame pad 16, bg #1a1a1a
  Button "Original", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(100)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Modified", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      api.dom.expect('node-2', { textContains: 'Modified' })
    }
  ),

  testWithSetup(
    'Clear selection when element deleted',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white
  Text "ToDelete", col #888`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(100)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white`)
      await api.utils.delay(100)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(!nodeIds.includes('node-3'), 'Deleted element (node-3) should no longer exist')

      api.assert.exists('node-2')
      api.assert.hasText('node-2', 'Keep')

      const selection = api.state.getSelection()
      api.assert.ok(
        selection !== 'node-3',
        `Selection should not point to deleted node, got: ${selection}`
      )
    }
  ),
])
