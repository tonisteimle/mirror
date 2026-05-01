/**
 * Edge Cases (Mixed) — swap, no-op, centered, spread, wrap containers
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const edgeCaseMixedTests: TestCase[] = describe('Edge Cases (Mixed)', [
  testWithSetup(
    'Two components - swap positions',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "Click"
  Icon "star"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(iconPos < buttonPos, `Icon (${iconPos}) should be before Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'No-op: move to same position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "First"
  Button "Second"
  Icon "star"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-1', 0)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < buttonPos,
        `Text (${textPos}) should still be before Button (${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Centered container reorder',
    `Frame gap 8, center, bg #1a1a1a, pad 16, w 300, h 200
  Icon "check"
  Text "Success"
  Button "Continue"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Spread container reorder',
    `Frame hor, spread, bg #1a1a1a, pad 16
  Text "Left"
  Icon "arrow"
  Button "Right"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-1', 2)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(iconPos > buttonPos, `Icon (${iconPos}) should be after Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'Wrap container reorder',
    `Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, w 200
  Button "A"
  Icon "star"
  Text "Label"
  Button "B"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-5', 'node-1', 0)

      const code = api.editor.getCode()
      const bPos = code.indexOf('"B"')
      const aPos = code.indexOf('"A"')
      api.assert.ok(bPos < aPos, `Button B (${bPos}) should be before Button A (${aPos})`)
    }
  ),
])
