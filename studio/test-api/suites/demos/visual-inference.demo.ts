/**
 * Tutorial — Layout-Inferenz (videos/visual-inference.webm)
 * Embedded in: docs/tutorial/22-visuelles-editieren.html § Layout-Inferenz
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE_BEFORE = `Toolbar as Frame: pad 16, bg #1a1a1a

Toolbar
  Button "Speichern", bg #2271C1, col white, pad 8 16, rad 6
  Button "Abbrechen", bg #333, col white, pad 8 16, rad 6
  Button "Hilfe", bg #333, col white, pad 8 16, rad 6`

const FIXTURE_AFTER = `Toolbar as Frame: hor, gap 8, pad 16, bg #1a1a1a

Toolbar
  Button "Speichern", bg #2271C1, col white, pad 8 16, rad 6
  Button "Abbrechen", bg #333, col white, pad 8 16, rad 6
  Button "Hilfe", bg #333, col white, pad 8 16, rad 6`

export const visualInference: TestCase[] = describe('demos.tutorial', [
  testWithSetup('visual: layout-inference toolbar → hor', FIXTURE_BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(800)

    // Verify three stacked buttons (vertical default).
    const initial = api.editor.getCode()
    api.assert.matches(initial, /Toolbar/, 'Toolbar component exists')
    api.assert.ok(!initial.includes('hor'), 'toolbar is vertical before')

    // Park cursor over the Toolbar so the viewer's eye lands there.
    const toolbar = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(toolbar))
    await sleep(1200)

    // Trigger the inferred transformation via setCode (the actual
    // Studio "→ HStack" suggestion button is gated on heuristics that
    // depend on drop history we don't reproduce here).
    await api.editor.setCode(FIXTURE_AFTER)
    await sleep(900)

    api.assert.matches(api.editor.getCode(), /Toolbar.*hor/, 'toolbar now horizontal')

    await sleep(600)
    await osMouse.park()
  }),
])
