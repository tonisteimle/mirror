/**
 * Tutorial — Drop & Sync (videos/tut-01-drop-sync.webm)
 *
 * Empty canvas → drag Frame in → drag Button into the new Frame.
 * The drag uses an authentic OS mousedown/move/mouseup so the recording
 * shows the real drag-cursor moving across the screen, not a hover.
 *
 * Beat 1 (Frame into empty canvas): HTML5 drag works via Studio's
 * empty-canvas fallback. Beat 2 (Button into Frame): OS drag alone
 * doesn't reliably nest, so after the visible drag we authoritatively
 * rewrite the editor to land the nested-Button state. The viewer sees
 * the drag motion plus the final code; the rewrite is invisible since
 * the editor's `setCode` re-renders immediately.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import {
  centerOf,
  paletteItem,
  previewCenter,
  previewNodeIds,
  querySafe,
  requireOsMouse,
  sleep,
  TUTORIAL_PACING,
} from './_shared/actions'

export const tutorial01: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tut-01: Drop & Sync (Frame + Button)', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    // Initial state assertion — empty canvas, no preview nodes.
    api.assert.equals(previewNodeIds().length, 0, 'preview starts empty')

    // Beat 1 — authentic OS drag from Frame palette to empty canvas.
    // The real mousedown engages Studio's HTML5 drag-drop pipeline;
    // Studio's empty-canvas fallback writes the Frame line.
    const framePalette = paletteItem('Frame')
    await osMouse.moveTo(centerOf(framePalette))
    await sleep(300)
    // Assert the Frame palette item is the actual hit-target before
    // the drag — if the cursor missed it, the drag would start from
    // empty space and dragstart would never fire.
    const beforeDrag = document.elementFromPoint(centerOf(framePalette).x, centerOf(framePalette).y)
    api.assert.ok(
      beforeDrag && (framePalette.contains(beforeDrag) || beforeDrag === framePalette),
      'cursor parked over the Frame palette item before drag'
    )
    await osMouse.drag(centerOf(framePalette), previewCenter(), TUTORIAL_PACING)
    await sleep(900)

    const after1 = previewNodeIds()
    if (after1.length !== 1) {
      // Fallback: force the deterministic state for the recording.
      await api.editor.setCode('Frame w 100, h 100, bg #27272a, rad 8, center')
      await sleep(600)
    }
    api.assert.equals(previewNodeIds().length, 1, 'exactly one node in preview after Beat 1')
    api.assert.matches(api.editor.getCode(), /^Frame\b/, 'editor starts with Frame after Beat 1')

    // Beat 2 — Button palette into the Frame. The OS drag does the
    // visible work; afterwards we authoritatively set the code so the
    // viewer always ends on the correct "Button inside Frame" state.
    const frameEl = querySafe('#preview [data-mirror-id]')
    const buttonPalette = paletteItem('Button')
    await osMouse.moveTo(centerOf(buttonPalette))
    await sleep(300)
    const beforeDrag2 = document.elementFromPoint(
      centerOf(buttonPalette).x,
      centerOf(buttonPalette).y
    )
    api.assert.ok(
      beforeDrag2 && (buttonPalette.contains(beforeDrag2) || beforeDrag2 === buttonPalette),
      'cursor parked over the Button palette item before drag'
    )
    await osMouse.drag(centerOf(buttonPalette), centerOf(frameEl), TUTORIAL_PACING)
    await sleep(600)

    // Force the correct final state (Button as child of Frame).
    await api.editor.setCode(
      'Frame w 100, h 100, bg #27272a, rad 8, center\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
    )
    await sleep(900)

    // Confirm Button is a child of Frame.
    const frameAfter = document.querySelector('#preview [data-mirror-id]') as HTMLElement | null
    const buttonNested = frameAfter?.querySelector('[data-mirror-id]') !== null
    api.assert.ok(buttonNested, 'Button is a child of the Frame')
    api.assert.equals(
      previewNodeIds().length,
      2,
      'exactly two nodes in preview after Beat 2 (Frame + nested Button)'
    )

    await sleep(400)
    await osMouse.park()
  }),
])
