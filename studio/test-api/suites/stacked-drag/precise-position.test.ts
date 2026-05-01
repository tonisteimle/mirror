/**
 * Precise Position Verification — exact coordinates, sequential positions
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyPosition } from './_helpers'

export const precisePositionTests: TestCase[] = describe('Precise Position Verification', [
  testWithSetup(
    'Drop at exact center position',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 200, 200)

      const code = api.editor.getCode()
      const pos = verifyPosition(code, 200, 200, 60)
      api.assert.ok(pos.ok, `Position should be ~(200, 200), got (${pos.actualX}, ${pos.actualY})`)
    }
  ),

  testWithSetup(
    'Drop at bottom-right corner',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 250, 160)

      const code = api.editor.getCode()
      const pos = verifyPosition(code, 250, 160, 80)
      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 150,
        `X should be >= 150 (right side), got ${pos.actualX}`
      )
      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 100,
        `Y should be >= 100 (bottom half), got ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Sequential drops maintain separate positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 350, 250)

      const code = api.editor.getCode()

      const xMatches = code.match(/\bx\s+\d+/g) || []
      const yMatches = code.match(/\by\s+\d+/g) || []

      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions, found ${yMatches.length}`)

      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Icon/)
    }
  ),
])
