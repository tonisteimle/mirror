/**
 * Tutorial — Slot-Properties editieren (videos/comp-slots.webm)
 * Embedded in: docs/tutorial/20-komponenten-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 260
  Title: col white, fs 14, weight 400
  Desc: col #888, fs 12
  Footer: hor, gap 8, mar-t 8

Card
  Title "Hello"
  Desc "A card description."
  Footer
    Button "OK", bg #2271C1, col white, pad 6 12, rad 4`

const AFTER = `Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 260
  Title: col white, fs 18, weight 600
  Desc: col #888, fs 12
  Footer: hor, gap 8, mar-t 8

Card
  Title "Hello"
  Desc "A card description."
  Footer
    Button "OK", bg #2271C1, col white, pad 6 12, rad 4`

export const compSlots: TestCase[] = describe('demos.tutorial', [
  testWithSetup('comp: edit Title slot default', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(800)

    // Find the Title text in preview to park the cursor on.
    const title = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).find(el =>
      (el.textContent ?? '').includes('Hello')
    ) as HTMLElement | undefined
    if (title) {
      await osMouse.moveTo(centerOf(title))
      await sleep(800)
    }

    api.assert.matches(api.editor.getCode(), /Title:.*fs 14/, 'Title slot starts at fs 14')

    // Change the slot default — affects all instances.
    await api.editor.setCode(AFTER)
    await sleep(900)

    api.assert.matches(api.editor.getCode(), /Title:.*fs 18/, 'Title slot now fs 18')
    api.assert.matches(api.editor.getCode(), /Title:.*weight 600/, 'Title weight changed')

    await sleep(600)
    await osMouse.park()
  }),
])
