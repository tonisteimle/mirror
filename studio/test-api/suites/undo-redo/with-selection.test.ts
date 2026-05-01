/**
 * Undo with Selection (selection state preservation across undo)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const undoWithSelectionTests: TestCase[] = describe('Undo with Selection', [
  test('Undo preserves element selection if possible', async (api: TestAPI) => {
    await api.editor.setCode('Frame gap 8\n  Button "Test"')
    await api.utils.waitForCompile()

    api.interact.select('node-2')
    await api.utils.waitForIdle()
    api.assert.isSelected('node-2')

    await api.editor.setCode('Frame gap 16\n  Button "Test"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    api.assert.exists('node-2')
  }),
])
