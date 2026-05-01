/**
 * Editor → Preview Sync — code changes update preview
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const editorToPreviewTests: TestCase[] = describe('Editor → Preview Sync', [
  testWithSetup(
    'Code change updates preview immediately',
    `Frame pad 16, bg #1a1a1a
  Text "Original", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { textContains: 'Original' })

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "Updated", col white`)
      await api.utils.delay(100)

      api.dom.expect('node-2', { textContains: 'Updated' })
    }
  ),

  testWithSetup(
    'Adding element updates preview',
    `Frame pad 16, bg #1a1a1a
  Text "First", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "First", col white
  Text "Second", col #888`)
      await api.utils.delay(100)

      api.assert.exists('node-3')
      api.dom.expect('node-3', { textContains: 'Second' })
    }
  ),

  testWithSetup(
    'Removing element updates preview',
    `Frame pad 16, bg #1a1a1a
  Text "Keep", col white
  Text "Remove", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "Keep", col white`)
      await api.utils.delay(100)

      const removed = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(removed === null, 'Removed element should not exist')
    }
  ),

  testWithSetup(
    'Style change updates preview',
    `Frame pad 16, bg #1a1a1a
  Button "Click", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Click", bg #2271C1, col white, pad 12 24, rad 6`)
      await api.utils.delay(100)

      const btn = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(
        btn.style.backgroundColor.includes('34, 113, 193') ||
          btn.style.background.includes('34, 113, 193'),
        'Background should be blue'
      )
    }
  ),

  testWithSetup(
    'Nested structure change updates preview',
    `Frame pad 16, bg #1a1a1a
  Frame pad 8, bg #222
    Text "Nested", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Frame pad 8, bg #222
    Text "Changed", col white
    Button "New", bg #333, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: 'Changed' })
      api.assert.exists('node-4')
    }
  ),
])
