/**
 * Selection Sync Tests (preview selection ↔ editor selection)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const selectionSyncTests: TestCase[] = describe('Selection Sync', [
  testWithSetup(
    'Selecting element highlights code',
    'Frame gap 8\n  Text "Select me"\n  Text "Other"',
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      api.interact.select('node-2')
      await api.utils.waitForIdle()

      api.assert.isSelected('node-2')
    }
  ),

  testWithSetup(
    'Selection persists after recompile',
    'Frame\n  Button "Click"',
    async (api: TestAPI) => {
      api.interact.select('node-2')
      await api.utils.waitForIdle()
      api.assert.isSelected('node-2')

      await api.editor.setCode('Frame gap 4\n  Button "Click"')
      await api.utils.waitForCompile()

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Selection should persist')
    }
  ),

  testWithSetup(
    'Escape navigates to parent element',
    'Frame\n  Button "Test"',
    async (api: TestAPI) => {
      api.interact.select('node-2')
      await api.utils.waitForIdle()
      api.assert.isSelected('node-2')

      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      const selection = api.state.getSelection()
      api.assert.ok(
        selection === 'node-1',
        `Selection should navigate to parent (node-1), got: ${selection}`
      )

      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      const finalSelection = api.state.getSelection()
      api.assert.ok(
        finalSelection === null || finalSelection === undefined,
        `Selection should be cleared after Escape from root, got: ${finalSelection}`
      )
    }
  ),
])
