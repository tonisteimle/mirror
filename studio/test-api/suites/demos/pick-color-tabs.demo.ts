/**
 * Tutorial — Color-Picker Palette-Tabs (videos/pick-color-tabs.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = 'Btn: bg #333, col white, pad 10 20, rad 6\n\nBtn "OK"'
const STEPS = [
  // Tailwind blue-500
  'Btn: bg #3b82f6, col white, pad 10 20, rad 6\n\nBtn "OK"',
  // Open Color violet-6
  'Btn: bg #845ef7, col white, pad 10 20, rad 6\n\nBtn "OK"',
  // Material Pink 500
  'Btn: bg #e91e63, col white, pad 10 20, rad 6\n\nBtn "OK"',
]

export const pickColorTabs: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: color palette tabs (Tailwind/Open/Material)', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const btn = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(btn))
    await sleep(400)
    await osMouse.click(centerOf(btn))
    await sleep(800)

    for (const code of STEPS) {
      await api.editor.setCode(code)
      await sleep(1200)
    }

    api.assert.matches(api.editor.getCode(), /#e91e63/, 'final material pink applied')
    const btnAfter = querySafe('#preview [data-mirror-id]')
    api.assert.equals(
      getComputedStyle(btnAfter).backgroundColor,
      'rgb(233, 30, 99)',
      'preview shows last palette pick'
    )

    await sleep(500)
    await osMouse.park()
  }),
])
