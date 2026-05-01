/**
 * Divider + Spacer Mixed Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos, verifyCodeOrder } from './_helpers'

export const dividerSpacerMixedTests: TestCase[] = describe('Divider + Spacer Mixed Reorder', [
  testWithSetup(
    'Move Divider position in form',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Section 1"
  Divider
  Text "Section 2"
  Button "Submit"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 3)

      const code = api.editor.getCode()
      const dividerPos = findComponentPos(code, 'Divider')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(dividerPos > buttonPos, 'Divider should be after Button')
    }
  ),

  testWithSetup(
    'Move Spacer in layout',
    `Frame hor, gap 0, bg #1a1a1a, pad 16
  Text "Left"
  Spacer
  Button "Right"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 2)

      const code = api.editor.getCode()
      const spacerPos = findComponentPos(code, 'Spacer')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(spacerPos > buttonPos, 'Spacer should be after Button')
    }
  ),

  testWithSetup(
    'Divider + Icon + Text',
    `Frame gap 8, bg #1a1a1a, pad 16
  Icon "info"
  Divider
  Text "Details"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-1', 2)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Divider', 'Text', 'Icon'])
      api.assert.ok(result.ok, `Expected Divider, Text, Icon but got: ${result.actual.join(', ')}`)
    }
  ),
])
