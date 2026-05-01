/**
 * Stacked Preserve Positions — adding to existing stacked container keeps positions
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const stackedPreservePositionsTests: TestCase[] = describe('Stacked Preserve Positions', [
  testWithSetup(
    'Add Button preserves existing Icon position',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Icon "star", x 50, y 50`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 200, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon "star", x 50, y 50/)
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'Add multiple preserves all positions',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Text "Title", x 30, y 20
  Button "Action", x 30, y 60`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 300, 40)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text "Title", x 30, y 20/)
      api.assert.codeContains(/Button "Action", x 30, y 60/)
      api.assert.codeContains(/Icon/)
    }
  ),

  testWithSetup(
    'Add Switch preserves Checkbox position',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Checkbox "Option A", x 40, y 40`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 40, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox "Option A", x 40, y 40/)
      api.assert.codeContains(/Switch/)
    }
  ),
])
