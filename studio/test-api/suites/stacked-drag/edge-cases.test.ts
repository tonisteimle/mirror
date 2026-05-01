/**
 * Stacked Edge Cases — bounds clamping, multiple drops
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyPosition } from './_helpers'

export const edgeCaseTests: TestCase[] = describe('Stacked Edge Cases', [
  testWithSetup(
    'Drop near edge clamps to bounds',
    'Frame stacked, w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 5, 5)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)

      const pos = verifyPosition(code, 0, 0, 50)
      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 0,
        `X should be >= 0, got ${pos.actualX}`
      )
      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 0,
        `Y should be >= 0, got ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Multiple drops create multiple positioned elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()

      await api.interact.dragToPosition('Text', 'node-1', 200, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)

      const xMatches = code.match(/\bx\s+\d+/g)
      api.assert.ok(
        xMatches !== null && xMatches.length >= 2,
        `Should have 2 x positions, found ${xMatches?.length ?? 0}`
      )
    }
  ),
])
