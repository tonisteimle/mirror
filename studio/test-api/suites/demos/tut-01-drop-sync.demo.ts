/**
 * Tutorial — Drop & Sync (videos/tut-01-drop-sync.webm)
 *
 * Empty canvas → drag Frame in → drag Button into the new Frame.
 * Each drop writes one Mirror line with default properties.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { demoDropFromPalette, previewNodeIds, requireOsMouse, sleep } from './_shared/actions'

export const tutorial01: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tut-01: Drop & Sync (Frame + Button)', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    // Beat 1 — Frame from palette into empty canvas.
    await demoDropFromPalette('Frame')
    const after1 = previewNodeIds()
    api.assert.equals(after1.length, 1, 'after Frame drop: 1 node')

    // Beat 2 — Button from palette into the new Frame.
    await demoDropFromPalette('Button', { intoId: after1[0] })
    const after2 = previewNodeIds()
    api.assert.equals(after2.length, 2, 'after Button drop: 2 nodes')

    // Confirm the Button is a child of the Frame (not a sibling).
    const frameEl = document.querySelector(`[data-mirror-id="${after1[0]}"]`) as HTMLElement | null
    const buttonInFrame = frameEl?.querySelector('[data-mirror-id]') !== null
    api.assert.ok(buttonInFrame, 'Button should be a child of the Frame')

    await sleep(400)
    await osMouse.park()
  }),
])
