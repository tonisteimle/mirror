/**
 * Sync Edge Cases — delete, replace, empty, rapid add/remove, move
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const edgeCaseTests: TestCase[] = describe('Sync Edge Cases', [
  testWithSetup(
    'Delete selected element',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white
  Text "Delete", col #888`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(50)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white`)
      await api.utils.delay(100)

      const deleted = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(deleted === null, 'Deleted element should not exist')
    }
  ),

  testWithSetup(
    'Replace entire code',
    `Frame pad 16, bg #1a1a1a
  Text "Old content", col white`,
    async (api: TestAPI) => {
      await api.editor.setCode(`Frame pad 24, bg #222, rad 12
  Button "New", bg #2271C1, col white, pad 12 24, rad 6
  Icon "check", ic #10b981, is 24`)
      await api.utils.delay(100)

      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'Empty code handling',
    `Frame pad 16, bg #1a1a1a
  Text "Content", col white`,
    async (api: TestAPI) => {
      await api.editor.setCode('')
      await api.utils.delay(100)

      const code = api.editor.getCode()
      api.assert.ok(code.length === 0 || code.trim().length === 0, 'Code should be empty')
    }
  ),

  testWithSetup(
    'Rapid add and remove',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white`,
    async (api: TestAPI) => {
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white
  Text "Added", col #888`)
      await api.utils.delay(50)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white`)
      await api.utils.delay(50)

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white
  Button "New", bg #333, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Move element between parents',
    `Frame pad 16, bg #1a1a1a, gap 8
  Frame pad 8, bg #222, rad 4
    Text "Child", col white
  Frame pad 8, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Frame pad 8, bg #222, rad 4
  Frame pad 8, bg #333, rad 4
    Text "Child", col white`)
      await api.utils.delay(100)

      const text = document.querySelector('[data-mirror-id="node-4"]')
      api.assert.ok(text !== null, 'Moved element should exist')
      api.dom.expect('node-4', { textContains: 'Child' })
    }
  ),
])
