/**
 * Textarea + Input + Button Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos, verifyCodeOrder } from './_helpers'

export const textareaInputButtonTests: TestCase[] = describe('Textarea + Input + Button Reorder', [
  testWithSetup(
    'Contact form reorder',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Subject"
  Textarea placeholder "Message"
  Button "Send"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Textarea', 'Input', 'Button'])
      api.assert.ok(
        result.ok,
        `Expected Textarea, Input, Button but got: ${result.actual.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Move Button before form fields',
    `Frame gap 12, bg #1a1a1a, pad 16
  Text "Contact Us"
  Input placeholder "Email"
  Textarea placeholder "Your message"
  Button "Submit"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-5', 'node-1', 1)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const inputPos = findComponentPos(code, 'Input')
      api.assert.ok(buttonPos < inputPos, 'Button should be before Input')
    }
  ),
])
