/**
 * Tutorial — Multi-File (videos/tut-08-multi-file.webm)
 *
 * Zeigt: Tokens werden definiert, dann via $name in einer Frame-Zeile
 * verwendet. Mirror löst sie projekt-weit auf — die Token-Definition
 * lebt normalerweise in tokens.tok, hier zu Demo-Zwecken inline.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const TOKENS = `primary.bg: #2271C1
card.pad: 16
card.rad: 8`

const FULL = `primary.bg: #2271C1
card.pad: 16
card.rad: 8

Frame bg $primary, pad $card, rad $card, w 200, h 80`

export const tutorial08: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tut-08: Multi-File (Tokens via $name)', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    const cdpInput = requireCdpInput()

    // Initial state assertion.
    api.assert.equals(
      document.querySelectorAll('#preview [data-mirror-id]').length,
      0,
      'preview starts empty'
    )

    // Cursor approaches the editor.
    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(500)
    await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
    await sleep(400)

    // Beat 1 — define three tokens (visible as a setCode update).
    await api.editor.setCode(TOKENS)
    await sleep(900)
    const afterTokens = api.editor.getCode()
    api.assert.matches(afterTokens, /primary\.bg:\s*#2271C1/, 'primary token defined')
    api.assert.matches(afterTokens, /card\.pad:\s*16/, 'card.pad token defined')
    api.assert.matches(afterTokens, /card\.rad:\s*8/, 'card.rad token defined')

    // Beat 2 — add the Frame line that consumes the tokens.
    await api.editor.setCode(FULL)
    await sleep(900)

    const finalCode = api.editor.getCode()
    api.assert.matches(finalCode, /Frame\s+bg\s+\$primary/, 'Frame references $primary token')
    api.assert.matches(finalCode, /pad\s+\$card/, 'Frame uses $card for padding')
    api.assert.matches(finalCode, /rad\s+\$card/, 'Frame uses $card for radius')

    // Preview should render the Frame with resolved token values.
    const frameEl = document.querySelector('#preview [data-mirror-id]') as HTMLElement | null
    api.assert.ok(frameEl, 'Frame is rendered in preview')
    if (frameEl) {
      const bg = getComputedStyle(frameEl).backgroundColor
      // #2271C1 = rgb(34, 113, 193)
      api.assert.equals(bg, 'rgb(34, 113, 193)', '$primary resolved to #2271C1 in computed style')
    }

    await sleep(700)
    await osMouse.park()
  }),
])
