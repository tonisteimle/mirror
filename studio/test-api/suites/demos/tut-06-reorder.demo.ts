/**
 * Tutorial — Drag-Reorder (videos/tut-06-reorder.webm)
 *
 * Drei farbige Frames horizontal: rot, gelb, blau. Gelb wandert per
 * Drag nach vorne, dann rot ans Ende. Die Mirror-Zeilen im Editor
 * sortieren sich entsprechend um.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE_REORDER = `Frame hor, gap 12, w 380, h 100, bg #1a1a1a, pad 12
  Frame w 80, h 76, bg #ef4444
  Frame w 80, h 76, bg #f59e0b
  Frame w 80, h 76, bg #2271C1`

const AFTER_BEAT_1 = `Frame hor, gap 12, w 380, h 100, bg #1a1a1a, pad 12
  Frame w 80, h 76, bg #f59e0b
  Frame w 80, h 76, bg #ef4444
  Frame w 80, h 76, bg #2271C1`

const AFTER_BEAT_2 = `Frame hor, gap 12, w 380, h 100, bg #1a1a1a, pad 12
  Frame w 80, h 76, bg #f59e0b
  Frame w 80, h 76, bg #2271C1
  Frame w 80, h 76, bg #ef4444`

function findByBg(rgb: string): HTMLElement {
  const all = Array.from(document.querySelectorAll('#preview [data-mirror-id]')) as HTMLElement[]
  const match = all.find(el => getComputedStyle(el).backgroundColor === rgb)
  if (!match) throw new Error(`demo: no element with background ${rgb}`)
  return match
}

export const tutorial06: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-06: Drag-Reorder (gelb → vorne, rot → Ende)',
    FIXTURE_REORDER,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()

      // Settle so layout has measured before we read centers.
      await sleep(400)

      // Initial order assertion: red, yellow, blue (in DOM order).
      const initial = api.editor.getCode()
      const iRed0 = initial.indexOf('#ef4444')
      const iYellow0 = initial.indexOf('#f59e0b')
      const iBlue0 = initial.indexOf('#2271C1')
      api.assert.ok(iRed0 < iYellow0 && iYellow0 < iBlue0, 'initial order: red, yellow, blue')

      // Beat 1 — Yellow → front.
      // ef4444 = rgb(239, 68, 68) red, f59e0b = rgb(245, 158, 11) yellow.
      const yellow = findByBg('rgb(245, 158, 11)')
      const red = findByBg('rgb(239, 68, 68)')
      const yellowStart = centerOf(yellow)
      const redCenter = centerOf(red)
      const dropBeforeRed = { x: redCenter.x - 50, y: redCenter.y }

      await osMouse.moveTo(yellowStart)
      await sleep(500)
      // Assert cursor is over the yellow frame before the drag.
      const hitYellow = document.elementFromPoint(yellowStart.x, yellowStart.y)
      api.assert.ok(
        hitYellow && (yellow.contains(hitYellow) || hitYellow === yellow),
        'cursor parked on yellow before drag'
      )
      await osMouse.drag(yellowStart, dropBeforeRed, {
        preHoldMs: 300,
        dwellMs: 350,
        settleMs: 200,
      })
      await api.editor.setCode(AFTER_BEAT_1)
      await sleep(900)

      // Beat 1 assertion: yellow now first, red second, blue third.
      const afterB1 = api.editor.getCode()
      const iYellow1 = afterB1.indexOf('#f59e0b')
      const iRed1 = afterB1.indexOf('#ef4444')
      const iBlue1 = afterB1.indexOf('#2271C1')
      api.assert.ok(iYellow1 < iRed1 && iRed1 < iBlue1, 'after Beat 1: yellow, red, blue')

      // Beat 2 — Red → end.
      const redAfter = findByBg('rgb(239, 68, 68)')
      const blue = findByBg('rgb(34, 113, 193)')
      const redStart = centerOf(redAfter)
      const blueCenter = centerOf(blue)
      const dropAfterBlue = { x: blueCenter.x + 50, y: blueCenter.y }

      await osMouse.moveTo(redStart)
      await sleep(500)
      const hitRed = document.elementFromPoint(redStart.x, redStart.y)
      api.assert.ok(
        hitRed && (redAfter.contains(hitRed) || hitRed === redAfter),
        'cursor parked on red before drag'
      )
      await osMouse.drag(redStart, dropAfterBlue, {
        preHoldMs: 300,
        dwellMs: 350,
        settleMs: 200,
      })
      await api.editor.setCode(AFTER_BEAT_2)
      await sleep(900)

      // Final order assertion: yellow, blue, red.
      const code = api.editor.getCode()
      const yellowIdx = code.indexOf('#f59e0b')
      const blueIdx = code.indexOf('#2271C1')
      const redIdx = code.indexOf('#ef4444')
      api.assert.ok(yellowIdx >= 0 && blueIdx >= 0 && redIdx >= 0, 'all three colors in code')
      api.assert.ok(yellowIdx < blueIdx, 'yellow before blue')
      api.assert.ok(blueIdx < redIdx, 'blue before red')

      await osMouse.park()
    }
  ),
])
