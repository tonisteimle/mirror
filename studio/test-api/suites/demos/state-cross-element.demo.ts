/**
 * Tutorial — Cross-Element-State (videos/state-cross-element.webm)
 * Embedded in: docs/tutorial/23-states.html § Cross-Element-State
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const CODE = `Button name MenuBtn, pad 10 20, bg #333, col white, rad 6, toggle()
  Text "Menü"
  open:
    bg #2271C1

Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
  MenuBtn.open:
    visible
  Text "Menü Item 1", col white
  Text "Menü Item 2", col white`

export const stateCrossElement: TestCase[] = describe('demos.tutorial', [
  testWithSetup('state: cross-element MenuBtn.open', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    await api.editor.setCode(CODE)
    await sleep(1000)

    const allNodes = document.querySelectorAll('#preview [data-mirror-id]')
    api.assert.ok(allNodes.length >= 2, 'Button + Frame rendered')

    // MenuBtn is the first; the Frame menu is the second top-level.
    const btn = allNodes[0] as HTMLElement
    const menu = Array.from(allNodes).find(
      el => el !== btn && !btn.contains(el) && (el as HTMLElement).children.length > 0
    ) as HTMLElement | undefined
    api.assert.ok(menu, 'menu frame found')

    // Initially hidden.
    if (menu) {
      const initialDisplay = getComputedStyle(menu).display
      api.assert.equals(initialDisplay, 'none', 'menu starts hidden')
    }

    // Click button.
    await osMouse.moveTo(centerOf(btn))
    await sleep(700)
    await osMouse.click(centerOf(btn))
    await sleep(1000)

    // Menu becomes visible (display != none).
    if (menu) {
      const openDisplay = getComputedStyle(menu).display
      api.assert.ok(openDisplay !== 'none', 'menu visible after click')
    }

    await sleep(800)
    await osMouse.park()
  }),
])
