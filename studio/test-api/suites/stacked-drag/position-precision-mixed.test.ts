/**
 * Position Precision Mixed — grids, diagonals, corners with mixed components
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const positionPrecisionMixedTests: TestCase[] = describe('Position Precision Mixed', [
  testWithSetup(
    'Grid positions: 3x3 Icons',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 175, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 300, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 50, 175)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 175, 175)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 300, 175)

      const code = api.editor.getCode()
      const iconMatches = code.match(/\bIcon\b/g) || []
      api.assert.ok(iconMatches.length >= 6, `Should have 6 Icons, found ${iconMatches.length}`)
    }
  ),

  testWithSetup(
    'Diagonal: Button trail',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 150, 150)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 250, 250)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 350, 350)

      const code = api.editor.getCode()
      const buttonMatches = code.match(/\bButton\b/g) || []
      api.assert.ok(
        buttonMatches.length >= 4,
        `Should have 4 Buttons, found ${buttonMatches.length}`
      )

      const xMatches = code.match(/\bx\s+(\d+)/g) || []
      const yMatches = code.match(/\by\s+(\d+)/g) || []
      api.assert.ok(xMatches.length >= 4, `Should have 4 x positions`)
      api.assert.ok(yMatches.length >= 4, `Should have 4 y positions`)
    }
  ),

  testWithSetup(
    'Corner positions: different components',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 20, 20)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 330, 20)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 20, 250)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Link', 'node-1', 330, 250)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Link/)
    }
  ),
])
