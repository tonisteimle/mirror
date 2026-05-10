/**
 * Tutorial — Position-Controls + stacked-Layout (videos/visual-position.webm)
 * Embedded in: docs/tutorial/22-visuelles-editieren.html § Position-Controls
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = `Frame stacked, w 240, h 160, bg #1a1a1a, rad 8
  Frame w 240, h 160, bg #2271C1, rad 8`

const AFTER_BADGE = `Frame stacked, w 240, h 160, bg #1a1a1a, rad 8
  Frame w 240, h 160, bg #2271C1, rad 8
  Frame x 200, y 8, w 24, h 24, bg #ef4444, rad 99`

export const visualPosition: TestCase[] = describe('demos.tutorial', [
  testWithSetup('visual: position + stacked badge', FIXTURE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const container = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(container))
    await sleep(500)
    await osMouse.click(centerOf(container))
    await sleep(800)

    await api.editor.setCode(AFTER_BADGE)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /stacked/, 'stacked container')
    api.assert.matches(code, /x 200, y 8/, 'badge positioned absolutely')
    api.assert.matches(code, /rad 99/, 'badge is round')

    await sleep(600)
    await osMouse.park()
  }),
])
