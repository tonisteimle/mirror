/**
 * Test Isolation — reset clears editor/history/selection, getStateSnapshot
 */

import type { TestCase, TestAPI } from '../../types'

export const isolationTests: TestCase[] = [
  {
    name: 'Isolation: reset clears editor',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      await api.editor.setCode('Frame\n  Text "Before Reset"')
      await api.utils.delay(100)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('Before Reset'), 'Code should be set')

      await api.studio.reset()

      code = api.editor.getCode()
      api.assert.ok(code === '', 'Code should be empty after reset')
    },
  },

  {
    name: 'Isolation: reset clears history',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      await api.editor.setCode('Frame\n  Text "Change 1"')
      await api.utils.delay(100)
      await api.editor.setCode('Frame\n  Text "Change 2"')
      await api.utils.delay(100)

      await api.studio.reset()

      api.assert.ok(api.studio.history.getUndoStackSize() === 0, 'Undo stack should be empty')
      api.assert.ok(api.studio.history.getRedoStackSize() === 0, 'Redo stack should be empty')
    },
  },

  {
    name: 'Isolation: reset clears selection',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      await api.editor.setCode('Frame\n  Text "Select Me"')
      await api.utils.delay(200)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Should have nodes to select')

      api.interact.select(nodeIds[0])
      await api.utils.delay(100)

      const selectionBefore = api.studio.getSelection()
      api.assert.ok(
        selectionBefore === nodeIds[0],
        `Should have selected ${nodeIds[0]}, got ${selectionBefore}`
      )

      await api.studio.reset()

      const selection = api.studio.getSelection()
      api.assert.ok(selection === null, 'Selection should be null after reset')
    },
  },

  {
    name: 'Isolation: getStateSnapshot captures state',
    category: 'testSystem',
    run: async (api: TestAPI) => {
      await api.editor.setCode('Frame\n  Text "Snapshot Test"')
      await api.utils.delay(200)

      const snapshot = api.studio.getStateSnapshot()

      api.assert.ok(snapshot.code.includes('Snapshot Test'), 'Snapshot should have code')
      api.assert.ok(Array.isArray(snapshot.nodeIds), 'Snapshot should have nodeIds')
      api.assert.ok(snapshot.nodeIds.length >= 2, 'Should have at least 2 nodes')
      api.assert.ok(typeof snapshot.undoStackSize === 'number', 'Should have undoStackSize')
    },
  },
]
