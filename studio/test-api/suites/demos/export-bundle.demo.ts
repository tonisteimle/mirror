/**
 * Tutorial — Spec-Bundle export (videos/export-bundle.webm)
 * Embedded in: docs/tutorial/27-export.html
 *
 * The actual export hits the AI-bridge server and Claude; the demo
 * narrates the studio surface (toolbar export trigger) without running
 * the external pipeline.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const SOURCE = `primary.bg: #2271C1
card.pad: 16
card.rad: 8

Frame bg #1a1a1a, pad $card, rad $card, w 240, gap 8
  Text "Hallo Mirror", col white, fs 16
  Button "Export", bg $primary, col white, pad 8 16, rad 6`

export const exportBundle: TestCase[] = describe('demos.tutorial', [
  testWithSetup('export: spec bundle from toolbar', SOURCE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(900)

    // Move cursor to the toolbar export area (best-effort selector).
    const exportTrigger =
      (document.querySelector('[data-action="export"]') as HTMLElement | null) ??
      (document.querySelector('[aria-label*="Export"]') as HTMLElement | null) ??
      (document.querySelector('.toolbar-export, .export-btn') as HTMLElement | null)
    if (exportTrigger) {
      await osMouse.moveTo(centerOf(exportTrigger))
      await sleep(800)
      await osMouse.click(centerOf(exportTrigger))
      await sleep(1200)
    } else {
      // Park cursor near the top-right of the toolbar.
      const toolbar = document.querySelector('.toolbar, header, [class*="toolbar"]')
      if (toolbar) {
        const r = (toolbar as HTMLElement).getBoundingClientRect()
        await osMouse.moveTo({ x: r.right - 60, y: r.top + r.height / 2 })
        await sleep(1500)
      }
    }

    api.assert.matches(api.editor.getCode(), /\$primary/, 'tokenized source is exportable')

    await sleep(700)
    await osMouse.park()
  }),
])
