/**
 * Basic Stacked Drop — single drops into stacked Frame
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyPosition } from './_helpers'

export const basicStackedTests: TestCase[] = describe('Basic Stacked Drop', [
  testWithSetup(
    'Drop Button into empty stacked Frame',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      const pos = verifyPosition(code, 100, 50, 30)
      api.assert.ok(pos.ok, `Position should be ~(100, 50), got (${pos.actualX}, ${pos.actualY})`)
    }
  ),

  testWithSetup(
    'Drop Icon into stacked with existing elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 200, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)

      const buttonMatch = code.match(/Button "A", x 10, y 10/)
      api.assert.ok(buttonMatch !== null, 'Original Button should still exist')
    }
  ),

  testWithSetup(
    'Drop Text at top-left of stacked',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)

      const pos = verifyPosition(code, 20, 20, 50)

      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 0 && pos.actualX <= 70,
        `X position should be near left edge (0-70px), got: ${pos.actualX}`
      )

      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 0 && pos.actualY <= 70,
        `Y position should be near top (0-70px), got: ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 200, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),
])
