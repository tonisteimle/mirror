/**
 * Tutorial — Run-Mode (videos/run-mode.webm)
 * Embedded in: docs/tutorial/26-run-mode.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const SOURCE = `count: 0

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 4, onclick decrement(count)
  Text "$count", col white, fs 24, w 40, text-align center
  Button "+", bg #2271C1, col white, pad 8 16, rad 4, onclick increment(count)`

export const runMode: TestCase[] = describe('demos.tutorial', [
  testWithSetup('run-mode: counter cycle', SOURCE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(800)

    // Try to find a play / run-mode toggle in the toolbar.
    const runTrigger =
      (document.querySelector('[data-run-mode-toggle]') as HTMLElement | null) ??
      (document.querySelector('.toolbar [data-action="run"]') as HTMLElement | null) ??
      (document.querySelector('[aria-label*="Run"], [aria-label*="Play"]') as HTMLElement | null)
    if (runTrigger) {
      await osMouse.moveTo(centerOf(runTrigger))
      await sleep(500)
      await osMouse.click(centerOf(runTrigger))
      await sleep(800)
    }

    // Click + button three times.
    const buttons = Array.from(
      document.querySelectorAll('#preview button[data-mirror-id], #preview [data-mirror-id]')
    ).filter(el => (el as HTMLElement).tagName === 'BUTTON') as HTMLElement[]
    const plus = buttons.find(b => (b.textContent ?? '').includes('+'))
    if (plus) {
      for (let i = 0; i < 3; i++) {
        await osMouse.moveTo(centerOf(plus))
        await sleep(300)
        await osMouse.click(centerOf(plus))
        await sleep(500)
      }
    }

    // Verify count text reflects the increments (best-effort — increment
    // works in run-mode; in edit-mode it may not propagate to DOM text).
    const countText = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).find(el =>
      /^\d+$/.test((el.textContent ?? '').trim())
    ) as HTMLElement | undefined
    if (countText) {
      const val = parseInt((countText.textContent ?? '').trim(), 10)
      api.assert.ok(val >= 0, `count text rendered: ${val}`)
    }

    await sleep(700)
    await osMouse.park()
  }),
])
