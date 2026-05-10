/**
 * Tutorial — Autocomplete für Properties (videos/code-autocomplete-props.webm)
 * Embedded in: docs/tutorial/24-code-editor.html § Autocomplete für Property-Namen
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

export const codeAutocompleteProps: TestCase[] = describe('demos.tutorial', [
  testWithSetup('code: autocomplete property names', 'Frame bg #1a1a1a', async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    const cdpInput = requireCdpInput()

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(400)
    await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
    await sleep(400)

    // Position caret at end of line, then type a partial property.
    await cdpInput.keyDown({ key: 'End' })
    await cdpInput.keyUp({ key: 'End' })
    await sleep(200)
    await cdpInput.typeText({ text: ', pa', perCharDelay: 200 })
    await sleep(900)

    // Autocomplete tooltip should appear.
    const tooltip = document.querySelector('.cm-tooltip-autocomplete')
    api.assert.ok(tooltip, 'autocomplete tooltip appeared after typing "pa"')

    // Tab accepts the first suggestion (typically "pad").
    await cdpInput.keyDown({ key: 'Tab' })
    await cdpInput.keyUp({ key: 'Tab' })
    await sleep(400)
    await cdpInput.typeText({ text: ' 16', perCharDelay: 140 })
    await sleep(700)

    const code = api.editor.getCode()
    api.assert.matches(code, /pad?\s*16/, 'pad 16 (or similar) added via autocomplete')

    await sleep(500)
    await osMouse.park()
  }),
])
