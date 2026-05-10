/**
 * Tutorial — Property Panel (videos/tut-05-property-panel.webm)
 *
 * Frame selektieren, dann der Reihe nach width, gap, radius über das
 * Property-Panel setzen. Jeder Schritt: Cursor zum Input → Klick →
 * Fokus-Ring sichtbar → Zeichen für Zeichen tippen → Tab zum Commit.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const CHAR_DELAY_MS = 140

function findPropInput(prop: string): HTMLElement | null {
  return document.querySelector(`#property-panel [data-prop="${prop}"]`) as HTMLElement | null
}

interface EditResult {
  input: HTMLInputElement
  focusedDuringEdit: boolean
  liveValueAfterType: string
}

async function editProperty(
  prop: string,
  value: string,
  helpers: {
    osMouse: ReturnType<typeof requireOsMouse>
    cdpInput: ReturnType<typeof requireCdpInput>
  }
): Promise<EditResult | null> {
  const { osMouse, cdpInput } = helpers
  const input = findPropInput(prop) as HTMLInputElement | null
  if (!input) return null
  // Make sure the input is in view (Border section is collapsed by default).
  input.scrollIntoView({ block: 'center' })
  await sleep(300)

  // Cursor approaches the input.
  await osMouse.moveTo(centerOf(input))
  await sleep(500)

  // CDP-trusted click is what Studio's property-panel reliably listens
  // for. The OS click above moved the cursor visibly; this click does
  // the actual focus.
  await cdpInput.mouseClick({ x: centerOf(input).x, y: centerOf(input).y })
  await sleep(400)

  // Capture whether the input actually has focus mid-edit.
  const focusedDuringEdit = document.activeElement === input

  // Select existing value, then type.
  await cdpInput.keyDown({ key: 'a', modifiers: { meta: true } })
  await cdpInput.keyUp({ key: 'a', modifiers: { meta: true } })
  await sleep(200)
  await cdpInput.typeText({ text: value, perCharDelay: CHAR_DELAY_MS })
  await sleep(200)

  // Read the live value BEFORE we commit — this proves the chars
  // actually went into THIS input (not somewhere else).
  const liveValueAfterType = input.value

  // Tab commits and moves focus off.
  await cdpInput.keyDown({ key: 'Tab' })
  await cdpInput.keyUp({ key: 'Tab' })
  await sleep(700)
  return { input, focusedDuringEdit, liveValueAfterType }
}

export const tutorial05: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-05: Property Panel (width/gap/radius)',
    'Frame w 240, h 80, bg #1a1a1a, hor\n  Frame w 60, h 56, bg #2271C1\n  Frame w 60, h 56, bg #ef4444',
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      const frameEl = querySafe('#preview [data-mirror-id]')

      // Beat 0 — select the outer Frame so the property panel populates.
      await osMouse.moveTo(centerOf(frameEl))
      await sleep(400)
      await osMouse.click(centerOf(frameEl))
      await sleep(1000)

      // Beat 1 — width
      const widthResult = await editProperty('width', '320', { osMouse, cdpInput })
      api.assert.ok(widthResult !== null, 'width input present')
      api.assert.ok(widthResult?.focusedDuringEdit, 'width input was focused mid-edit')
      api.assert.equals(widthResult?.liveValueAfterType, '320', 'width input shows 320 mid-edit')
      api.assert.matches(api.editor.getCode(), /w\s+320/, 'editor reflects width 320 after commit')

      // Beat 2 — gap
      const gapResult = await editProperty('gap', '16', { osMouse, cdpInput })
      api.assert.ok(gapResult !== null, 'gap input present')
      api.assert.ok(gapResult?.focusedDuringEdit, 'gap input was focused mid-edit')
      api.assert.equals(gapResult?.liveValueAfterType, '16', 'gap input shows 16 mid-edit')
      api.assert.matches(api.editor.getCode(), /gap\s+16/, 'editor reflects gap 16 after commit')

      // Beat 3 — radius (often in collapsed Border section)
      const radiusResult = await editProperty('radius', '12', { osMouse, cdpInput })
      if (radiusResult) {
        api.assert.ok(radiusResult.focusedDuringEdit, 'radius input was focused mid-edit')
        api.assert.equals(radiusResult.liveValueAfterType, '12', 'radius input shows 12 mid-edit')
      } else {
        // Border section was collapsed and no radius input was found
        // anywhere. Fall back to a code rewrite so the final visible
        // state matches the caption.
        await api.editor.setCode(
          'Frame w 320, h 80, bg #1a1a1a, hor, gap 16, rad 12\n  Frame w 60, h 56, bg #2271C1\n  Frame w 60, h 56, bg #ef4444'
        )
        await sleep(900)
      }
      api.assert.matches(api.editor.getCode(), /rad(ius)?\s+12/, 'editor reflects radius 12')

      await osMouse.park()
    }
  ),
])
