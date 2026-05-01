/**
 * Overlay Actions — showModal/dismiss, show with dismiss, showBelow positioning
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const overlayActionTests: TestCase[] = describe('Overlay Actions', [
  testWithSetup(
    'showModal() shows overlay and dismiss() closes it',
    `Frame pad 16, bg #1a1a1a
  Button "Open Modal", showModal(Modal)
  Frame name Modal, hidden, w 300, pad 24, bg #222, rad 12
    Text "Modal Content", col white
    Button "Close", dismiss(Modal)`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getDisplay = () =>
        window.getComputedStyle(document.querySelector('[data-mirror-id="node-3"]')!).display

      api.assert.equal(getDisplay(), 'none', 'Modal should be hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.ok(getDisplay() !== 'none', 'Modal should be visible after showModal')

      await api.interact.click('node-5')
      await api.utils.delay(150)

      api.assert.equal(getDisplay(), 'none', 'Modal should be hidden after dismiss')
    }
  ),

  testWithSetup(
    'show() and dismiss() work together for overlays',
    `Frame pad 16, bg #1a1a1a
  Button "Show", show(Overlay)
  Frame name Overlay, hidden, pad 16, bg #333, rad 8
    Text "Overlay content", col white
    Button "Dismiss", dismiss(Overlay)`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getDisplay = () =>
        window.getComputedStyle(document.querySelector('[data-mirror-id="node-3"]')!).display

      api.assert.equal(getDisplay(), 'none', 'Overlay hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.assert.ok(getDisplay() !== 'none', 'Overlay visible after show')

      await api.interact.click('node-5')
      await api.utils.delay(100)
      api.assert.equal(getDisplay(), 'none', 'Overlay hidden after dismiss')
    }
  ),

  testWithSetup(
    'showBelow() positions dropdown below trigger',
    `Frame pad 16, bg #1a1a1a, h 200
  Button "Menu", showBelow(Dropdown)
  Frame name Dropdown, hidden, pad 8, bg #333, rad 4
    Text "Item 1", col white
    Text "Item 2", col white
    Text "Item 3", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getDisplay = () =>
        window.getComputedStyle(document.querySelector('[data-mirror-id="node-3"]')!).display

      api.assert.equal(getDisplay(), 'none', 'Dropdown hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.ok(getDisplay() !== 'none', 'Dropdown visible after showBelow')

      const button = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const dropdown = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      if (button && dropdown) {
        const buttonRect = button.getBoundingClientRect()
        const dropdownRect = dropdown.getBoundingClientRect()

        api.assert.ok(
          dropdownRect.top >= buttonRect.bottom - 10 || dropdownRect.top > buttonRect.top,
          'Dropdown should be positioned below or after button'
        )
      }
    }
  ),
])
