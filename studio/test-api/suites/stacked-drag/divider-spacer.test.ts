/**
 * Divider + Spacer Stacked — section separators with positions
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const dividerSpacerStackedTests: TestCase[] = describe('Divider + Spacer Stacked', [
  testWithSetup(
    'Drop Divider with position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Divider', 'node-1', 50, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Divider/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Spacer with position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Spacer', 'node-1', 100, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Spacer/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Section layout: Text + Divider + Text',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Divider', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 50, 120)

      const code = api.editor.getCode()
      const textMatches = code.match(/\bText\b/g) || []
      api.assert.ok(textMatches.length >= 2, `Should have 2 Text elements`)
      api.assert.codeContains(/Divider/)
    }
  ),
])
