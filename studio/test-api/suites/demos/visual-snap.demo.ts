/**
 * Tutorial — Smart-Guides + Snap (videos/visual-snap.webm)
 * Embedded in: docs/tutorial/22-visuelles-editieren.html § Smart-Guides & Snap
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = `Frame w 320, h 200, bg #1a1a1a, pad 12
  Frame name a, w 80, h 60, bg #2271C1
  Frame name b, w 80, h 60, bg #ef4444`

export const visualSnap: TestCase[] = describe('demos.tutorial', [
  testWithSetup('visual: smart-guides + snap drag', FIXTURE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(600)

    // Select inner blue frame.
    const blue = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).find(
      el => getComputedStyle(el as HTMLElement).backgroundColor === 'rgb(34, 113, 193)'
    ) as HTMLElement | null
    api.assert.ok(blue, 'blue frame present')
    if (!blue) return

    await osMouse.moveTo(centerOf(blue))
    await sleep(500)
    await osMouse.click(centerOf(blue))
    await sleep(600)

    // Drag the blue frame to the right — pacing slow so snap-on-4 is
    // visible while moving.
    const start = centerOf(blue)
    await osMouse.drag(
      start,
      { x: start.x + 120, y: start.y + 20 },
      { preHoldMs: 300, dwellMs: 300, settleMs: 250 }
    )
    await sleep(800)

    api.assert.matches(api.editor.getCode(), /name a/, 'editor still has blue (named a)')

    await osMouse.park()
  }),
])
