/**
 * Tutorial — Custom-State mit toggle() (videos/state-toggle.webm)
 * Embedded in: docs/tutorial/23-states.html § Custom-States mit toggle()
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const CODE = `LikeBtn: bg #333, col #888, pad 12 20, rad 6, hor, gap 8, toggle()
  Icon "heart", ic #888, is 18
  Text "Gefällt mir"
  on:
    bg #ef4444
    col white
    Icon "heart", ic white, is 18, fill
    Text "Gefällt mir!"

LikeBtn`

export const stateToggle: TestCase[] = describe('demos.tutorial', [
  testWithSetup('state: LikeBtn toggle()', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    await api.editor.setCode(CODE)
    await sleep(1000)

    // Find the rendered LikeBtn (root preview node).
    const btn = querySafe('#preview [data-mirror-id]')
    api.assert.ok(btn, 'LikeBtn renders in preview')
    const beforeBg = getComputedStyle(btn).backgroundColor
    api.assert.equals(beforeBg, 'rgb(51, 51, 51)', 'starts with bg #333')

    // Cursor over button, click to toggle "on:" state.
    await osMouse.moveTo(centerOf(btn))
    await sleep(700)
    await osMouse.click(centerOf(btn))
    await sleep(1000)

    // After toggle, bg should be #ef4444.
    const afterBg = getComputedStyle(btn).backgroundColor
    api.assert.equals(afterBg, 'rgb(239, 68, 68)', 'after click: bg #ef4444 (on: state)')

    // Click again — toggles back to default.
    await sleep(700)
    await osMouse.click(centerOf(btn))
    await sleep(900)
    const finalBg = getComputedStyle(btn).backgroundColor
    api.assert.equals(finalBg, 'rgb(51, 51, 51)', 'second click: back to bg #333')

    await sleep(500)
    await osMouse.park()
  }),
])
