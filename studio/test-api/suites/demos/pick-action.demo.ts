/**
 * Tutorial — Action-Picker (videos/pick-action.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `count: 0

Frame hor, gap 12, ver-center, pad 16
  Button "-", bg #333, col white, pad 8 16, rad 4
  Text "$count", col white, fs 24
  Button "+", bg #2271C1, col white, pad 8 16, rad 4`

const AFTER = `count: 0

Frame hor, gap 12, ver-center, pad 16
  Button "-", bg #333, col white, pad 8 16, rad 4, onclick decrement(count)
  Text "$count", col white, fs 24
  Button "+", bg #2271C1, col white, pad 8 16, rad 4, onclick increment(count)`

export const pickAction: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: action with parameters', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    // Click the + button so the panel opens.
    const buttons = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(
      el => el.tagName === 'BUTTON'
    ) as HTMLElement[]
    if (buttons.length >= 2) {
      await osMouse.moveTo(centerOf(buttons[1]))
      await sleep(400)
      await osMouse.click(centerOf(buttons[1]))
      await sleep(800)
    }

    await api.editor.setCode(AFTER)
    await sleep(1100)

    const code = api.editor.getCode()
    api.assert.matches(code, /onclick\s+increment\(count\)/, '+ button has increment action')
    api.assert.matches(code, /onclick\s+decrement\(count\)/, '- button has decrement action')

    await sleep(500)
    await osMouse.park()
  }),
])
