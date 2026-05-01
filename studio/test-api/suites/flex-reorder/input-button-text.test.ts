/**
 * Input + Button + Text Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyCodeOrder } from './_helpers'

export const inputButtonTextTests: TestCase[] = describe('Input + Button + Text Reorder', [
  testWithSetup(
    'Move Button before Input',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Enter name"
  Button "Submit"
  Text "Required"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Button', 'Input', 'Text'])
      api.assert.ok(result.ok, `Expected Button, Input, Text but got: ${result.actual.join(', ')}`)
    }
  ),

  testWithSetup(
    'Move Text between Input and Button',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Email"
  Button "Send"
  Text "We will contact you"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Input', 'Text', 'Button'])
      api.assert.ok(result.ok, `Expected Input, Text, Button but got: ${result.actual.join(', ')}`)
    }
  ),

  testWithSetup(
    'Swap Input and Button positions',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Search"
  Button "Go"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Button', 'Input'])
      api.assert.ok(result.ok, `Expected Button, Input but got: ${result.actual.join(', ')}`)
    }
  ),
])
