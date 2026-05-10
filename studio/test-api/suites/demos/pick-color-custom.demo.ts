/**
 * Tutorial — Color-Picker Custom-Tab (videos/pick-color-custom.webm)
 * Embedded in: docs/tutorial/19-pickers.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = 'Btn: bg #333, col white, pad 10 20, rad 6\n\nBtn "OK"'
const AFTER = 'Btn: bg #2271C1, col white, pad 10 20, rad 6\n\nBtn "OK"'

export const pickColorCustom: TestCase[] = describe('demos.tutorial', [
  testWithSetup('pick: color custom (HSV + Hex)', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    // Select the button so the panel populates.
    const btn = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(btn))
    await sleep(400)
    await osMouse.click(centerOf(btn))
    await sleep(800)

    // Find a color trigger in the property panel.
    const colorTrigger =
      (document.querySelector('#property-panel [data-color-trigger]') as HTMLElement | null) ??
      (document.querySelector('#property-panel .color-swatch') as HTMLElement | null) ??
      (document.querySelector('#property-panel [data-prop="background"]') as HTMLElement | null)
    if (colorTrigger) {
      await osMouse.moveTo(centerOf(colorTrigger))
      await sleep(700)
    }

    // Demonstrate the resulting code change.
    await api.editor.setCode(AFTER)
    await sleep(1000)

    api.assert.matches(api.editor.getCode(), /bg\s+#2271C1/, 'bg picked to #2271C1')
    const btnAfter = querySafe('#preview [data-mirror-id]')
    api.assert.equals(
      getComputedStyle(btnAfter).backgroundColor,
      'rgb(34, 113, 193)',
      'preview reflects new bg'
    )

    await sleep(500)
    await osMouse.park()
  }),
])
