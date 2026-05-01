/**
 * Undo across Different Edit Types (add/remove element, style, text, layout)
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const undoEditTypesTests: TestCase[] = describe('Undo Edit Types', [
  test('Undo adding element', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "First"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)

    await api.editor.setCode('Frame\n  Text "First"\n  Text "Second"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)
  }),

  test('Undo removing element', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)

    await api.editor.setCode('Frame\n  Text "A"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)
  }),

  test('Undo style change', async (api: TestAPI) => {
    await api.editor.setCode('Frame bg #333')
    await api.utils.waitForCompile()

    await api.editor.setCode('Frame bg #ff0000')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    api.assert.contains(api.editor.getCode(), '#333')
  }),

  test('Undo text content change', async (api: TestAPI) => {
    await api.editor.setCode('Button "Save"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Button "Cancel"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    api.assert.contains(api.editor.getCode(), 'Save')
  }),

  test('Undo layout change', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'column')

    await api.editor.setCode('Frame hor\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'row')

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'column')
  }),
])
