/**
 * Pure-Mirror UI components (Checkbox/Switch/Slider) + Basic Components Reorder.
 * (Historical name "zag-mixed" preserved for compat — these are now Pure Mirror.)
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const zagMixedTests: TestCase[] = describe('Zag + Basic Components Reorder', [
  testWithSetup(
    'Move Checkbox to middle',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Terms"
  Button "Accept"
  Checkbox "I agree"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const checkboxPos = findComponentPos(code, 'Checkbox')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < checkboxPos && checkboxPos < buttonPos,
        `Order: Text(${textPos}) < Checkbox(${checkboxPos}) < Button(${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Switch + Text + Icon horizontal',
    `Frame hor, gap 12, bg #1a1a1a, pad 16
  Switch "Dark Mode"
  Text "Theme"
  Icon "moon"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const switchPos = findComponentPos(code, 'Switch')
      api.assert.ok(iconPos < switchPos, `Icon (${iconPos}) should be before Switch (${switchPos})`)
    }
  ),

  testWithSetup(
    'Slider + Text + Button move',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Volume"
  Slider value 50
  Button "Apply"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const sliderPos = findComponentPos(code, 'Slider')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(sliderPos < textPos, `Slider (${sliderPos}) should be before Text (${textPos})`)
    }
  ),
])
