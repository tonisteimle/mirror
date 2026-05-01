/**
 * Image + Text + Button Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const imageTextButtonTests: TestCase[] = describe('Image + Text + Button Reorder', [
  testWithSetup(
    'Move Button before Image (card layout)',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "photo.jpg", w 200
  Text "Caption"
  Button "View"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const imagePos = findComponentPos(code, 'Image')
      api.assert.ok(
        buttonPos < imagePos,
        `Button (${buttonPos}) should be before Image (${imagePos})`
      )
    }
  ),

  testWithSetup(
    'Move first to middle position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "avatar.png", w 100
  Text "Username"
  Button "Follow"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-1', 1)

      const code = api.editor.getCode()
      const imagePos = findComponentPos(code, 'Image')
      const textPos = findComponentPos(code, 'Text')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < imagePos && imagePos < buttonPos,
        `Order: Text(${textPos}) < Image(${imagePos}) < Button(${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Horizontal mixed: swap first and last',
    `Frame hor, gap 12, bg #1a1a1a, pad 16
  Icon "camera"
  Image src "thumb.jpg", w 50
  Text "Captured"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos < iconPos, `Text (${textPos}) should be before Icon (${iconPos})`)
    }
  ),
])
