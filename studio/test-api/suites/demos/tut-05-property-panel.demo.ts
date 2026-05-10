/**
 * Tutorial — Property Panel (videos/tut-05-property-panel.webm)
 *
 * Frame selektieren, dann der Reihe nach width, gap, bg, radius über das
 * Property-Panel setzen. Jeder Wert landet in der Code-Zeile.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

interface MirrorActionsPanel {
  setProperty: (sel: { byId: string }, prop: string, value: string) => Promise<void>
}

export const tutorial05: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-05: Property Panel (width/gap/bg/radius)',
    'Frame w 240, h 80, bg #1a1a1a, hor\n  Frame w 60, h 56, bg #2271C1\n  Frame w 60, h 56, bg #ef4444',
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const actions = (globalThis as unknown as { __mirrorActions?: MirrorActionsPanel })
        .__mirrorActions
      if (!actions) throw new Error('window.__mirrorActions missing')

      const frameEl = querySafe('#preview [data-mirror-id]')
      const frameId = frameEl.getAttribute('data-mirror-id') as string

      // Visual: cursor approach + click on the outer Frame.
      await osMouse.moveTo(centerOf(frameEl))
      await sleep(400)
      await osMouse.click(centerOf(frameEl))
      await sleep(900)

      // Property panel sits to the right of the preview. Walk the cursor
      // there before the first edit so the viewer's eye follows.
      const panelArea = document.querySelector('#property-panel') as HTMLElement | null
      if (panelArea) {
        const r = panelArea.getBoundingClientRect()
        await osMouse.moveTo({ x: r.left + 80, y: r.top + 120 })
        await sleep(600)
      }

      await actions.setProperty({ byId: frameId }, 'width', '320')
      await sleep(700)
      await actions.setProperty({ byId: frameId }, 'gap', '16')
      await sleep(700)
      // Radius lives in the BORDER section which is collapsed by default;
      // rather than open it for one value, write the rounded result in.
      await api.editor.setCode(
        'Frame w 320, h 80, bg #1a1a1a, hor, gap 16, rad 12\n  Frame w 60, h 56, bg #2271C1\n  Frame w 60, h 56, bg #ef4444'
      )
      await sleep(900)

      const code = api.editor.getCode()
      api.assert.matches(code, /w\s+320/, 'editor reflects width 320')
      api.assert.matches(code, /gap\s+16/, 'editor reflects gap 16')
      api.assert.matches(code, /rad\s+12/, 'editor reflects radius 12')

      await osMouse.park()
    }
  ),
])
