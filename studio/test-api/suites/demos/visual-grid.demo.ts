/**
 * Tutorial — Grid-Mode + Draw-Tool (videos/visual-grid.webm)
 * Embedded in: docs/tutorial/22-visuelles-editieren.html § Grid-Mode + Draw-Tool
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = 'Frame grid 12, gap 8, w 480, h 200, bg #1a1a1a, pad 12'
const AFTER = `Frame grid 12, gap 8, w 480, h 200, bg #1a1a1a, pad 12
  Frame x 1, y 1, w 6, h 1, bg #2271C1
  Frame x 7, y 1, w 6, h 1, bg #ef4444
  Frame x 1, y 2, w 12, h 1, bg #10b981`

export const visualGrid: TestCase[] = describe('demos.tutorial', [
  testWithSetup('visual: grid 12 with draw-tool', FIXTURE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    // Select the grid container so the overlay shows.
    const grid = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(grid))
    await sleep(500)
    await osMouse.click(centerOf(grid))
    await sleep(900)

    // Park cursor at a starting grid cell to suggest "drawing".
    const r = grid.getBoundingClientRect()
    const startCell = { x: r.left + 60, y: r.top + 40 }
    await osMouse.moveTo(startCell)
    await sleep(500)
    // Show drag motion across cells.
    await osMouse.drag(
      startCell,
      { x: startCell.x + 180, y: startCell.y + 40 },
      { preHoldMs: 300, dwellMs: 300, settleMs: 200 }
    )
    await sleep(500)

    // Land the deterministic state: three cells filled.
    await api.editor.setCode(AFTER)
    await sleep(900)

    api.assert.matches(api.editor.getCode(), /x 1.*w 6/, 'first grid cell at x 1 w 6')
    api.assert.matches(api.editor.getCode(), /x 7.*w 6/, 'second grid cell at x 7')
    api.assert.matches(api.editor.getCode(), /x 1.*y 2.*w 12/, 'third row spans 12 cols')

    await sleep(700)
    await osMouse.park()
  }),
])
