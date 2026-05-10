/**
 * Tutorial — Inline Edit (videos/tut-02-inline-edit.webm)
 *
 * Doppelklick auf einen Text im Preview → Inline-Editor öffnet, neuer
 * Text wird Zeichen für Zeichen getippt, Enter committet → Code-Zeile
 * updated sich.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const CHAR_DELAY_MS = 160

export const tutorial02: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-02: Inline Edit (Doppelklick auf Text)',
    FIXTURES.frameWithText,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      // Text node lives inside the Frame.
      const textEl = querySafe('#preview [data-mirror-id] [data-mirror-id]')
      const textCenter = centerOf(textEl)

      // Visual phase: OS cursor approaches the Text and dwells. The OS
      // double-click that follows moves the real cursor visibly.
      await osMouse.moveTo(textCenter)
      await sleep(700)

      // State phase: dispatch a CDP-trusted double-click on the same
      // point. Studio's inline-edit controller has a 150ms anti-drift
      // delay after dblclick; CDP-trusted events survive that filter
      // reliably, whereas the OS-driven dblclick sometimes gets canceled
      // by its own second mousedown landing mid-delay.
      await cdpInput.mouseDoubleClick({ x: textCenter.x, y: textCenter.y })

      // Wait until Studio mounts the inline-edit-input element and
      // gives it focus. Two observable signals must both be true:
      //   1. `.inline-edit-input` is in the DOM (Studio rendered it)
      //   2. document.activeElement IS that input (caret is visible)
      const waitForInlineEdit = async (): Promise<HTMLInputElement | null> => {
        for (let i = 0; i < 40; i++) {
          const input = document.querySelector('.inline-edit-input') as HTMLInputElement | null
          if (input && document.activeElement === input) return input
          await sleep(40)
        }
        return null
      }
      let editInput = await waitForInlineEdit()
      if (!editInput) {
        // Retry once — sometimes the very first CDP dblclick lands while
        // Studio is still finishing its render cycle.
        await sleep(200)
        await cdpInput.mouseDoubleClick({ x: textCenter.x, y: textCenter.y })
        editInput = await waitForInlineEdit()
      }
      api.assert.ok(editInput !== null, 'inline-edit input mounted and focused')
      api.assert.equals(editInput?.value, 'Hello', 'inline-edit pre-fills with current text')

      // Pause briefly so the viewer sees the focused caret before typing.
      await sleep(500)

      // Select existing text (visible: text becomes highlighted).
      await cdpInput.keyDown({ key: 'a', modifiers: { meta: true } })
      await cdpInput.keyUp({ key: 'a', modifiers: { meta: true } })
      await sleep(400)

      // Type char-by-char with a delay the viewer can read.
      await cdpInput.typeText({ text: 'Willkommen', perCharDelay: CHAR_DELAY_MS })

      // Mid-typing sanity check (assertion fires AFTER typing completes,
      // but we can still verify the input value progressed character by
      // character by inspecting it now — it should hold "Willkommen"
      // in the input field BEFORE Enter is pressed).
      const liveInput = document.querySelector('.inline-edit-input') as HTMLInputElement | null
      api.assert.equals(
        liveInput?.value,
        'Willkommen',
        'inline-edit input shows fully typed value before commit'
      )

      await sleep(500)

      // Editor should STILL hold the old text — commit happens on Enter.
      api.assert.matches(
        api.editor.getCode(),
        /Text\s+"Hello"/,
        'editor still shows old text before Enter commit'
      )

      // Commit with Enter.
      await cdpInput.keyDown({ key: 'Enter' })
      await cdpInput.keyUp({ key: 'Enter' })
      await sleep(900)

      // Final code reflects the new text AND inline-edit input is gone.
      const code = api.editor.getCode()
      api.assert.matches(code, /Text\s+"Willkommen"/, 'editor reflects the new text after commit')
      const stillEditing = document.querySelector('.inline-edit-input')
      api.assert.equals(stillEditing, null, 'inline-edit input unmounted after commit')

      await osMouse.park()
    }
  ),
])
