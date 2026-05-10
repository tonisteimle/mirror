/**
 * Tutorial — Inline Edit (videos/tut-02-inline-edit.webm)
 *
 * Doppelklick auf einen Text im Preview → Inline-Editor öffnet, neuer
 * Text wird getippt, Enter committet → Code-Zeile updated sich.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

interface MirrorActionsInline {
  inlineEdit: (sel: { byId: string }, text: string, charDelay?: number) => Promise<void>
}

export const tutorial02: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-02: Inline Edit (Doppelklick auf Text)',
    FIXTURES.frameWithText,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const actions = (globalThis as unknown as { __mirrorActions?: MirrorActionsInline })
        .__mirrorActions
      if (!actions) throw new Error('window.__mirrorActions missing')

      // Find the Text node inside the Frame.
      const textEl = querySafe('#preview [data-mirror-id] [data-mirror-id]')
      const textId = textEl.getAttribute('data-mirror-id') as string

      // Visual phase: OS cursor approaches the text and dwells, giving
      // the viewer a moment to register what's about to happen. A small
      // visible double-click is included for authenticity even though
      // the state mutation runs via CDP below.
      await osMouse.moveTo(centerOf(textEl))
      await sleep(500)
      await osMouse.doubleClick(centerOf(textEl))
      await sleep(400)

      // State phase: mirror-actions does the full inline-edit dance
      // (CDP double-click → focus → select-all → type → Enter).
      // The typing IS visible because each keystroke updates the DOM.
      await actions.inlineEdit({ byId: textId }, 'Willkommen', 110)

      await sleep(700)
      const code = api.editor.getCode()
      api.assert.matches(code, /Text\s+"Willkommen"/, 'editor reflects the new text')

      await osMouse.park()
    }
  ),
])
