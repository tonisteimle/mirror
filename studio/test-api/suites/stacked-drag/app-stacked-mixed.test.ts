/**
 * App Stacked Mixed Components — App-root stacked with mixed components
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const appStackedMixedTests: TestCase[] = describe('App Stacked Mixed Components', [
  testWithSetup(
    'App stacked: Icon + Text header',
    'App stacked, w 500, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 30, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 70, 35)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/Text/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions`)
    }
  ),

  testWithSetup(
    'App stacked: Form layout with Input + Textarea + Button',
    'App stacked, w 500, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 250)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'App stacked: Zag controls',
    'App stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Slider', 'node-1', 50, 160)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/Switch/)
      api.assert.codeContains(/Slider/)
    }
  ),
])
