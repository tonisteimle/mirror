/**
 * Basic Undo Tests
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const basicUndoTests: TestCase[] = describe('Basic Undo', [
  test('Undo reverts single change', async (api: TestAPI) => {
    await api.editor.setCode('Text "Original"')
    await api.utils.waitForCompile()
    api.assert.hasText('node-1', 'Original')

    await api.editor.setCode('Text "Changed"')
    await api.utils.waitForCompile()
    api.assert.hasText('node-1', 'Changed')

    api.assert.ok(api.studio.history.canUndo(), 'Should be able to undo')

    api.editor.undo()
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    api.assert.contains(code, 'Original')

    api.assert.ok(api.studio.history.canRedo(), 'Should be able to redo after undo')
  }),

  test('Multiple undos work sequentially', async (api: TestAPI) => {
    await api.editor.setCode('Text "Step1"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Text "Step2"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Text "Step3"')
    await api.utils.waitForCompile()

    api.assert.ok(api.studio.history.canUndo(), 'Should have undo history')

    api.editor.undo()
    await api.utils.waitForIdle()
    api.editor.undo()
    await api.utils.waitForIdle()

    const code = api.editor.getCode()
    api.assert.contains(code, 'Step1')
  }),

  test('Undo does nothing when at beginning', async (api: TestAPI) => {
    api.studio.history.clear()

    await api.editor.setCode('Text "Only"')
    await api.utils.waitForCompile()

    api.editor.undo()
    api.editor.undo()
    api.editor.undo()
    await api.utils.waitForIdle()

    const codeAfter = api.editor.getCode()
    api.assert.ok(codeAfter.length > 0, 'Code should not be empty')
  }),
])
