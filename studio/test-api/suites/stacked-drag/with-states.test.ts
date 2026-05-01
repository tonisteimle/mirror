/**
 * Stacked with States — drop into stacked Frame that has hover/active states
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const stackedWithStatesTests: TestCase[] = describe('Stacked with States', [
  testWithSetup(
    'Drop into stacked Frame with hover state',
    `Frame stacked, w 300, h 200, bg #1a1a1a
  hover:
    bg #333`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
      api.assert.codeContains(/hover:/)
    }
  ),

  testWithSetup(
    'Drop into stacked Frame with multiple states',
    `Frame stacked, w 300, h 200, bg #1a1a1a
  hover:
    bg #333
  active:
    scale 0.95`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/hover:/)
      api.assert.codeContains(/active:/)
    }
  ),
])
