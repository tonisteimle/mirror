/**
 * Undo/Redo Edge Cases (rapid cycles, whitespace-only changes)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const undoEdgeCasesTests: TestCase[] = describe('Undo Edge Cases', [
  test('Rapid undo/redo cycles', async (api: TestAPI) => {
    await api.editor.setCode('Text "Start"')
    await api.utils.waitForCompile()
    await api.editor.setCode('Text "End"')
    await api.utils.waitForCompile()

    for (let i = 0; i < 5; i++) {
      api.editor.undo()
      await api.utils.waitForIdle()
      api.editor.redo()
      await api.utils.waitForIdle()
    }

    api.assert.contains(api.editor.getCode(), 'End')
  }),

  test('Undo after whitespace-only change', async (api: TestAPI) => {
    await api.editor.setCode('Text "Test"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Text "Test"\n\n')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForIdle()

    const code = api.editor.getCode()
    api.assert.ok(!code.endsWith('\n\n'), 'Whitespace should be undone')
  }),
])
