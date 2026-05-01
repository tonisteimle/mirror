/**
 * Sequential Mixed Reorders — multiple consecutive moves
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const sequentialMixedTests: TestCase[] = describe('Sequential Mixed Reorders', [
  testWithSetup(
    'Two consecutive moves - both to first',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "B"
  Icon "star"
  Text "T"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)
      await api.utils.waitForIdle()

      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos < iconPos, `Text (${textPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Sequential: rotate through positions',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "T"
  Button "B"
  Icon "star"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 2)
      await api.utils.waitForIdle()

      await api.interact.moveElement('node-2', 'node-1', 2)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(iconPos < textPos, `Icon (${iconPos}) should be before Text (${textPos})`)
    }
  ),
])
