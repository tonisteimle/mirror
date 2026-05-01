/**
 * Button + Text + Icon Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const buttonTextIconTests: TestCase[] = describe('Button + Text + Icon Reorder', [
  testWithSetup(
    'Move Button to first in vertical',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Label"
  Icon "star"
  Button "Click"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(buttonPos < textPos, `Button (${buttonPos}) should be before Text (${textPos})`)
    }
  ),

  testWithSetup(
    'Move Icon to middle position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "Action"
  Text "Message"
  Icon "check"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(
        buttonPos < iconPos && iconPos < textPos,
        `Order should be Button(${buttonPos}) < Icon(${iconPos}) < Text(${textPos})`
      )
    }
  ),

  testWithSetup(
    'Move Text to end position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Status"
  Button "Submit"
  Icon "alert"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-1', 2)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos > iconPos, `Text (${textPos}) should be after Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Horizontal: move last to first',
    `Frame hor, gap 8, bg #1a1a1a, pad 16
  Icon "home"
  Text "Welcome"
  Button "Enter"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),
])
