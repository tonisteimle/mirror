/**
 * Complex Mixed (4+ components) — toolbar/header/form/card/settings reorders
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const complexMixedTests: TestCase[] = describe('Complex Mixed (4+ components)', [
  testWithSetup(
    'Header: move Button to front',
    `Frame hor, gap 8, bg #1a1a1a, pad 16
  Icon "menu"
  Text "App"
  Spacer
  Button "Login"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-5', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Form: move Textarea to front',
    `Frame gap 12, bg #1a1a1a, pad 16
  Text "Feedback"
  Input placeholder "Title"
  Textarea placeholder "Details"
  Button "Send"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const textareaPos = findComponentPos(code, 'Textarea')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(
        textareaPos < textPos,
        `Textarea (${textareaPos}) should be before Text (${textPos})`
      )
    }
  ),

  testWithSetup(
    'Card: move Icon to front',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "cover.jpg", w full
  Text "Title"
  Icon "heart"
  Button "Like"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const imagePos = findComponentPos(code, 'Image')
      api.assert.ok(iconPos < imagePos, `Icon (${iconPos}) should be before Image (${imagePos})`)
    }
  ),

  testWithSetup(
    'Toolbar: move Export before Divider',
    `Frame hor, gap 4, bg #1a1a1a, pad 8
  Icon "undo"
  Icon "redo"
  Divider
  Button "Save"
  Button "Export"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-6', 'node-1', 2)

      const code = api.editor.getCode()
      const exportPos = code.indexOf('"Export"')
      const dividerPos = findComponentPos(code, 'Divider')
      api.assert.ok(
        exportPos < dividerPos,
        `Export (${exportPos}) should be before Divider (${dividerPos})`
      )
    }
  ),

  testWithSetup(
    'Settings: move Divider to front',
    `Frame gap 8, bg #1a1a1a, pad 16
  Switch "Notifications"
  Switch "Sound"
  Divider
  Button "Save"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const dividerPos = findComponentPos(code, 'Divider')
      const switchPos = findComponentPos(code, 'Switch')
      api.assert.ok(
        dividerPos < switchPos,
        `Divider (${dividerPos}) should be before Switch (${switchPos})`
      )
    }
  ),
])
