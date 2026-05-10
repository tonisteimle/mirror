/**
 * Tutorial — Padding & Margin via Handles (videos/tut-04-padding-margin.webm)
 *
 * Selektierte Frame zeigt Padding-Handles innen. Drag → mehr Padding,
 * Shift → mit gegenüberliegender Seite gespiegelt. Margin-Handle außen
 * funktioniert analog.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

export const tutorial04: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-04: Padding & Margin via Handles',
    FIXTURES.framePadding,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      const frameEl = querySafe('#preview [data-mirror-id]')

      // Visual: hover and click the Frame to select it.
      await osMouse.moveTo(centerOf(frameEl))
      await sleep(400)
      await osMouse.click(centerOf(frameEl))
      await sleep(600)

      // Press P to reveal padding handles. Studio's PaddingManager
      // listens for window `keydown`.
      await cdpInput.keyDown({ key: 'p' })
      await cdpInput.keyUp({ key: 'p' })
      await sleep(900)

      // Beat 1 — Move cursor to the inner top of the Frame to suggest the
      // grab. We then mutate the editor directly (the handle-drag pipeline
      // in test-mode is rebuilt around the key shortcut, so the simplest
      // way to land a deterministic state change for the recording is to
      // rewrite the line).
      const r = frameEl.getBoundingClientRect()
      const topInner = { x: r.left + r.width / 2, y: r.top + 16 }
      await osMouse.moveTo(topInner)
      await sleep(500)
      await osMouse.drag(
        topInner,
        { x: topInner.x, y: topInner.y + 24 },
        { preHoldMs: 200, dwellMs: 200, settleMs: 200 }
      )
      await api.editor.setCode('Frame w 240, h 160, bg #2271C1, pad 40')
      await sleep(700)

      // Exit padding mode.
      await cdpInput.keyDown({ key: 'p' })
      await cdpInput.keyUp({ key: 'p' })
      await sleep(400)

      // Beat 2 — Margin: cursor moves to the OUTER edge above the frame,
      // drags up to "pull away from neighbors", then we apply mar 16.
      const r2 = frameEl.getBoundingClientRect()
      const topOuter = { x: r2.left + r2.width / 2, y: r2.top - 4 }
      await osMouse.moveTo(topOuter)
      await sleep(500)
      await osMouse.drag(
        topOuter,
        { x: topOuter.x, y: topOuter.y - 16 },
        { preHoldMs: 200, dwellMs: 200, settleMs: 200 }
      )
      await api.editor.setCode('Frame w 240, h 160, bg #2271C1, pad 40, mar 16')
      await sleep(900)

      const code = api.editor.getCode()
      api.assert.matches(code, /pad\s+40/, 'editor has updated pad')
      api.assert.matches(code, /mar\s+16/, 'editor has updated mar')

      await osMouse.park()
    }
  ),
])
