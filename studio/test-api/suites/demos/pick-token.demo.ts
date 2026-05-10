/**
 * Tutorial — Token-Picker (videos/pick-token.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `card.pad: 16
card.rad: 8

Frame bg #1a1a1a, pad 12, rad 4, w 240, h 100`

const AFTER = `card.pad: 16
card.rad: 8

Frame bg #1a1a1a, pad $card, rad $card, w 240, h 100`

export const pickToken: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: token-picker for non-color', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const frame = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(frame))
    await sleep(400)
    await osMouse.click(centerOf(frame))
    await sleep(800)

    await api.editor.setCode(AFTER)
    await sleep(1000)

    const code = api.editor.getCode()
    api.assert.matches(code, /pad\s+\$card/, 'pad references card token')
    api.assert.matches(code, /rad\s+\$card/, 'rad references card token')

    await sleep(500)
    await osMouse.park()
  }),
])
