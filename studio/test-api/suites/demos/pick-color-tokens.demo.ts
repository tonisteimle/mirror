/**
 * Tutorial — Color-Picker Tokens-Section (videos/pick-color-tokens.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `primary.bg: #2271C1
danger.bg: #ef4444

Btn: bg #333, col white, pad 10 20, rad 6

Btn "OK"`

const AFTER = `primary.bg: #2271C1
danger.bg: #ef4444

Btn: bg $primary, col white, pad 10 20, rad 6

Btn "OK"`

export const pickColorTokens: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: color tokens-section', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const btn = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(btn))
    await sleep(400)
    await osMouse.click(centerOf(btn))
    await sleep(800)

    await api.editor.setCode(AFTER)
    await sleep(1100)

    const code = api.editor.getCode()
    api.assert.matches(code, /bg\s+\$primary/, 'token reference written, not hex')
    api.assert.ok(!/Btn:.*bg #333/.test(code), 'old hex replaced')

    await sleep(500)
    await osMouse.park()
  }),
])
