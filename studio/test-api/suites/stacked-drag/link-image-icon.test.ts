/**
 * Link + Image + Icon Stacked — gallery / overlay drops
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const linkImageIconTests: TestCase[] = describe('Link + Image + Icon Stacked', [
  testWithSetup(
    'Drop Link at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Link', 'node-1', 100, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Link/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Image at center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Image/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Card layout: Image + Icon overlay',
    'Frame stacked, w 300, h 250, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 220, 40)

      const code = api.editor.getCode()
      api.assert.codeContains(/Image/)
      api.assert.codeContains(/Icon/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions`)
    }
  ),

  testWithSetup(
    'Gallery: Multiple images at grid positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 30, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Image', 'node-1', 200, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Link', 'node-1', 100, 200)

      const code = api.editor.getCode()
      const imageMatches = code.match(/\bImage\b/g) || []
      api.assert.ok(imageMatches.length >= 2, `Should have 2 Images, found ${imageMatches.length}`)
      api.assert.codeContains(/Link/)
    }
  ),
])
