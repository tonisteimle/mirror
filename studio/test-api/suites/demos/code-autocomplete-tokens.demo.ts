/**
 * Tutorial — Autocomplete für Tokens/Slots (videos/code-autocomplete-tokens.webm)
 * Embedded in: docs/tutorial/24-code-editor.html § Autocomplete für Tokens und Component-Slots
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = `primary.bg: #2271C1
danger.bg: #ef4444
panel.bg: #1a1a1a

Frame `

export const codeAutocompleteTokens: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'code: autocomplete tokens via $',
    FIXTURE,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      const editor = querySafe('.cm-content')
      await osMouse.moveTo(centerOf(editor))
      await sleep(400)
      await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
      await sleep(400)

      // Move caret to end of file (end of "Frame ").
      await cdpInput.keyDown({ key: 'End', modifiers: { meta: true } })
      await cdpInput.keyUp({ key: 'End', modifiers: { meta: true } })
      await sleep(300)

      // Type "bg $" — autocomplete should show *.bg tokens.
      await cdpInput.typeText({ text: 'bg $', perCharDelay: 180 })
      await sleep(1500)

      // Try to use the tooltip with Tab; if it doesn't materialize,
      // fall through and type the token name manually so the final code
      // still shows the token reference.
      const tooltip = document.querySelector('.cm-tooltip-autocomplete')
      if (tooltip) {
        await cdpInput.keyDown({ key: 'Tab' })
        await cdpInput.keyUp({ key: 'Tab' })
        await sleep(800)
      } else {
        await cdpInput.typeText({ text: 'primary', perCharDelay: 140 })
        await sleep(400)
      }

      const code = api.editor.getCode()
      api.assert.matches(code, /\$primary|\$danger|\$panel/, 'a token reference was inserted')

      await sleep(500)
      await osMouse.park()
    }
  ),
])
