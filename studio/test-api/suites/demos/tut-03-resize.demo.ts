/**
 * Tutorial — Resize via Handles (videos/tut-03-resize.webm)
 *
 * Klick auf Frame → Handles erscheinen. SE-Eckhandle ändert w und h
 * gleichzeitig, S-Handle nur h. Editor-Werte für w/h ändern sich live.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

interface MirrorActionsResize {
  dragResize: (
    sel: { byId: string },
    position: string,
    deltaX: number,
    deltaY: number
  ) => Promise<void>
}

export const tutorial03: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-03: Resize via Handles (SE + S)',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const actions = (globalThis as unknown as { __mirrorActions?: MirrorActionsResize })
        .__mirrorActions
      if (!actions) throw new Error('window.__mirrorActions missing')

      const frameEl = querySafe('#preview [data-mirror-id]')
      const frameId = frameEl.getAttribute('data-mirror-id') as string

      // Initial state assertion.
      const startCode = api.editor.getCode()
      api.assert.matches(startCode, /w\s+240/, 'starts with w 240')
      api.assert.matches(startCode, /h\s+160/, 'starts with h 160')

      // Visual: cursor approaches the Frame, then click to select.
      // dragResize internally calls ensureSelected, so the click is
      // optional state-wise but valuable for the recording's narrative.
      await osMouse.moveTo(centerOf(frameEl))
      await sleep(400)
      await osMouse.click(centerOf(frameEl))
      await sleep(700)

      // Assert resize handles are now in the DOM (proves selection
      // engaged and the handles will be there for the OS drag).
      const handlesRoot = document.querySelector('.visual-overlay .resize-handles')
      api.assert.ok(handlesRoot, 'resize handles rendered after selection')

      // SE handle: drag diagonal +80 +60 (wider AND taller).
      // Trigger state-correct resize first (handles need to be in DOM
      // for the OS-mouse drag below to land on them).
      await actions.dragResize({ byId: frameId }, 'se', 0, 0)
      const seHandle = querySafe(
        '.visual-overlay .resize-handles .resize-handle[data-position="se"]'
      )
      const seStart = centerOf(seHandle)
      const seEnd = { x: seStart.x + 80, y: seStart.y + 60 }
      await osMouse.moveTo(seStart)
      await sleep(400)
      await osMouse.drag(seStart, seEnd, { preHoldMs: 200, dwellMs: 250, settleMs: 200 })
      await actions.dragResize({ byId: frameId }, 'se', 80, 60)
      await sleep(500)

      // Assert width AND height grew after SE drag.
      const afterSE = api.editor.getCode()
      const wMatch = afterSE.match(/w\s+(\d+)/)
      const hMatchSE = afterSE.match(/h\s+(\d+)/)
      api.assert.ok(wMatch && parseInt(wMatch[1]) > 240, 'width grew after SE drag')
      api.assert.ok(hMatchSE && parseInt(hMatchSE[1]) > 160, 'height grew after SE drag')

      // S handle: drag down by 40 (taller only).
      const sHandle = querySafe('.visual-overlay .resize-handles .resize-handle[data-position="s"]')
      const sStart = centerOf(sHandle)
      const sEnd = { x: sStart.x, y: sStart.y + 40 }
      await osMouse.moveTo(sStart)
      await sleep(400)
      await osMouse.drag(sStart, sEnd, { preHoldMs: 200, dwellMs: 250, settleMs: 200 })
      await actions.dragResize({ byId: frameId }, 's', 0, 40)
      await sleep(700)

      // Assert height grew further but width is unchanged after S drag.
      const finalCode = api.editor.getCode()
      const wFinal = finalCode.match(/w\s+(\d+)/)
      const hFinal = finalCode.match(/h\s+(\d+)/)
      api.assert.ok(wFinal && wMatch && wFinal[1] === wMatch[1], 'width unchanged after S drag')
      api.assert.ok(
        hFinal && hMatchSE && parseInt(hFinal[1]) > parseInt(hMatchSE[1]),
        'height grew further after S drag'
      )

      await osMouse.park()
    }
  ),
])
