/**
 * Demo — Drop Text into Frame (OS-mouse + tutorial pacing).
 *
 * Unlike the preview-cdp suite tests (which use trusted CDP events with
 * an *invisible* cursor), demo tests drive the **real macOS cursor** via
 * the `__osMouse` bridge. Result: the avfoundation screen recording
 * captures actual cursor motion, suitable for tutorial videos.
 *
 * Pacing is intentionally slow:
 *   - preHoldMs 400ms — "I've grabbed this"
 *   - dwellMs 600ms — "I'm about to drop here"
 *   - settleMs 300ms — "released"
 *
 * Requires `--os-mouse` (otherwise the bridge isn't installed and the
 * test fails loud).
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'

interface OsMouseAPI {
  drag: (
    from: { x: number; y: number },
    to: { x: number; y: number },
    opts?: { preHoldMs?: number; dwellMs?: number; settleMs?: number }
  ) => Promise<void>
  moveTo: (p: { x: number; y: number }) => Promise<void>
  park: () => Promise<void>
}

function requireOsMouse(): OsMouseAPI {
  const win = globalThis as unknown as { __osMouse?: OsMouseAPI }
  if (!win.__osMouse) {
    throw new Error(
      'window.__osMouse missing — demo tests require --os-mouse on the test runner CLI.'
    )
  }
  return win.__osMouse
}

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function querySafe(sel: string): HTMLElement {
  const el = document.querySelector(sel) as HTMLElement | null
  if (!el) throw new Error(`demo: selector "${sel}" not found`)
  return el
}

export const demoTextIntoFrame: TestCase[] = describe('demos.palette-drop', [
  testWithSetup(
    'demo: Drop Text from palette into Frame',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()

      const paletteEl = querySafe('#components-panel [data-id="comp-text"]')
      const frameEl = querySafe('#preview [data-mirror-id]')

      const idsBefore = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
        el => el.getAttribute('data-mirror-id') as string
      )

      // Drive the actual OS cursor. Tutorial pacing.
      await osMouse.drag(centerOf(paletteEl), centerOf(frameEl), {
        preHoldMs: 400,
        dwellMs: 600,
        settleMs: 300,
      })

      // Wait for the compile pipeline to settle. The compile gate is
      // already drained by mirror-actions.dropFromPalette in suite tests;
      // here we do it inline since we bypass mirror-actions entirely.
      await new Promise(r => setTimeout(r, 400))

      const idsAfter = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
        el => el.getAttribute('data-mirror-id') as string
      )

      api.assert.equals(idsAfter.length, 2, 'preview should now have 2 nodes')
      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id should appear')

      // Park the cursor so it doesn't sit on a hover target between
      // takes; clean tail-frames for the video.
      await osMouse.park()
    }
  ),
])
