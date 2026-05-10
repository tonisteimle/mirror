/**
 * Tutorial — Icon-Picker (videos/pick-icon.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = 'Icon "circle", is 32, ic #888'
const STEPS = [
  'Icon "arrow-right", is 32, ic #2271C1',
  'Icon "heart", is 32, ic #ef4444, fill',
  'Icon "check-circle", is 32, ic #10b981',
]

export const pickIcon: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: icon search', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const icon = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(icon))
    await sleep(400)
    await osMouse.click(centerOf(icon))
    await sleep(800)

    for (const code of STEPS) {
      await api.editor.setCode(code)
      await sleep(1100)
    }

    api.assert.matches(api.editor.getCode(), /Icon\s+"check-circle"/, 'final icon = check-circle')

    await sleep(500)
    await osMouse.park()
  }),
])
