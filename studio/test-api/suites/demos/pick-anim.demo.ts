/**
 * Tutorial — Animation-Picker (videos/pick-anim.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = 'Frame w 80, h 80, bg #2271C1, rad 8'
const STEPS = [
  'Frame w 80, h 80, bg #2271C1, rad 8, anim pulse',
  'Frame w 80, h 80, bg #2271C1, rad 8, anim bounce',
  'Frame w 80, h 80, bg #2271C1, rad 8, anim slide-up 0.3s',
]

export const pickAnim: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: animation preset picker', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const frame = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(frame))
    await sleep(400)
    await osMouse.click(centerOf(frame))
    await sleep(800)

    for (const code of STEPS) {
      await api.editor.setCode(code)
      await sleep(1200)
    }

    api.assert.matches(api.editor.getCode(), /anim\s+slide-up\s+0\.3s/, 'duration syntax accepted')

    await sleep(500)
    await osMouse.park()
  }),
])
