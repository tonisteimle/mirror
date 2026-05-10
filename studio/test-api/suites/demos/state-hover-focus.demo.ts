/**
 * Tutorial — System-States (videos/state-hover-focus.webm)
 * Embedded in: docs/tutorial/23-states.html § System-States im Code
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BASE = 'Btn: bg #333, col white, pad 10 20, rad 6\n\nBtn "Click me"'

const WITH_HOVER = `Btn: bg #333, col white, pad 10 20, rad 6
  hover:
    bg #444
  focus:
    bor 2, boc #2271C1

Btn "Click me"`

export const stateHoverFocus: TestCase[] = describe('demos.tutorial', [
  testWithSetup('state: hover + focus blocks', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    await api.editor.setCode(BASE)
    await sleep(800)
    api.assert.ok(
      document.querySelector('#preview [data-mirror-id]'),
      'Btn renders in preview'
    )

    // Add hover/focus blocks via setCode (visible code change).
    await api.editor.setCode(WITH_HOVER)
    await sleep(800)
    api.assert.matches(api.editor.getCode(), /hover:/, 'editor has hover: block')
    api.assert.matches(api.editor.getCode(), /focus:/, 'editor has focus: block')

    // Hover the button in preview — cursor parks ON the button so the
    // browser fires :hover on the styled element.
    const btn = querySafe('#preview [data-mirror-id]')
    await osMouse.moveTo(centerOf(btn))
    await sleep(1500)
    // CSS :hover should now apply background = #444 (rgb(68,68,68)).
    const hoveredBg = getComputedStyle(btn).backgroundColor
    api.assert.equals(
      hoveredBg,
      'rgb(68, 68, 68)',
      'hover block applies bg #444 while cursor on element'
    )

    await sleep(500)
    await osMouse.park()
  }),
])
