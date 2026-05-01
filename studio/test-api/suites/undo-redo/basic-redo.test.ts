/**
 * Basic Redo Tests
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const basicRedoTests: TestCase[] = describe('Basic Redo', [
  test('Redo restores undone change', async (api: TestAPI) => {
    await api.editor.setCode('Text "Before"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Text "After"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'Before')

    api.assert.ok(api.studio.history.canRedo(), 'Should be able to redo')

    api.editor.redo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'After')

    api.assert.ok(!api.studio.history.canRedo(), 'Should not be able to redo after redoing')
  }),

  test('Multiple redos work sequentially', async (api: TestAPI) => {
    await api.editor.setCode('Text "A"')
    await api.utils.waitForCompile()
    await api.editor.setCode('Text "B"')
    await api.utils.waitForCompile()
    await api.editor.setCode('Text "C"')
    await api.utils.waitForCompile()

    api.editor.undo()
    api.editor.undo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'A')

    api.assert.ok(api.studio.history.canRedo(), 'Should have redo available after undos')

    api.editor.redo()
    api.editor.redo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'C')
  }),

  test('Redo does nothing when at end', async (api: TestAPI) => {
    await api.editor.setCode('Text "Latest"')
    await api.utils.waitForCompile()

    const codeBefore = api.editor.getCode()

    api.assert.ok(!api.studio.history.canRedo(), 'Should not have redo available initially')

    api.editor.redo()
    api.editor.redo()
    await api.utils.waitForIdle()

    const codeAfter = api.editor.getCode()
    api.assert.equals(codeBefore, codeAfter)
  }),

  test('New edit clears redo stack', async (api: TestAPI) => {
    await api.editor.setCode('Text "A"')
    await api.utils.waitForCompile()
    await api.editor.setCode('Text "B"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'A')

    api.assert.ok(api.studio.history.canRedo(), 'Should have redo available after undo')

    await api.editor.setCode('Text "C"')
    await api.utils.waitForCompile()

    api.assert.ok(!api.studio.history.canRedo(), 'Redo should be cleared after new edit')

    api.editor.redo()
    await api.utils.waitForIdle()
    api.assert.contains(api.editor.getCode(), 'C')
  }),
])
