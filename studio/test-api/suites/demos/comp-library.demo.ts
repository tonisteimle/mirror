/**
 * Tutorial — Komponente aus Bibliothek droppen (videos/comp-library.webm)
 * Embedded in: docs/tutorial/20-komponenten-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const FIXTURE = `Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 240
  Title: col white, fs 16
  Desc: col #888, fs 14`

const AFTER = `Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 240
  Title: col white, fs 16
  Desc: col #888, fs 14

Card
  Title "New Card"
  Desc "Dropped from library"`

export const compLibrary: TestCase[] = describe('demos.tutorial', [
  testWithSetup('comp: drop Card from library', FIXTURE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(800)

    // Hover the components panel (custom components show below primitives).
    const panel = querySafe('#components-panel')
    const panelRect = panel.getBoundingClientRect()
    await osMouse.moveTo({ x: panelRect.left + 80, y: panelRect.top + panelRect.height - 80 })
    await sleep(800)

    // Move toward preview to suggest a drag-to-canvas motion.
    const preview = querySafe('#preview')
    const previewRect = preview.getBoundingClientRect()
    await osMouse.moveTo({
      x: previewRect.left + previewRect.width / 2,
      y: previewRect.top + previewRect.height / 2,
    })
    await sleep(500)

    // Land the deterministic state.
    await api.editor.setCode(AFTER)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /\nCard\n\s+Title\s+"New Card"/, 'Card instance dropped with slots')

    await sleep(500)
    await osMouse.park()
  }),
])
