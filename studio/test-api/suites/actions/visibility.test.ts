/**
 * Visibility Actions — show/hide/toggle for elements
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const visibilityActionTests: TestCase[] = describe('Visibility Actions', [
  testWithSetup(
    'show() makes hidden element visible on click',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Show", show(Target)
  Frame name Target, hidden, pad 16, bg #333
    Text "Now visible", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const targetBefore = api.preview.inspect('node-3')
      api.assert.ok(targetBefore !== null, 'Target element should exist in DOM')

      const initialDisplay = window.getComputedStyle(
        document.querySelector('[data-mirror-id="node-3"]')!
      ).display
      api.assert.equal(initialDisplay, 'none', 'Target should be hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(100)

      const afterDisplay = window.getComputedStyle(
        document.querySelector('[data-mirror-id="node-3"]')!
      ).display
      api.assert.ok(afterDisplay !== 'none', 'Target should be visible after click')
    }
  ),

  testWithSetup(
    'hide() makes visible element hidden on click',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Hide", hide(Target)
  Frame name Target, pad 16, bg #333
    Text "Will be hidden", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initialDisplay = window.getComputedStyle(
        document.querySelector('[data-mirror-id="node-3"]')!
      ).display
      api.assert.ok(initialDisplay !== 'none', 'Target should be visible initially')

      await api.interact.click('node-2')
      await api.utils.delay(100)

      const afterDisplay = window.getComputedStyle(
        document.querySelector('[data-mirror-id="node-3"]')!
      ).display
      api.assert.equal(afterDisplay, 'none', 'Target should be hidden after click')
    }
  ),

  // TODO: Runtime bug - toggle(ElementName) doesn't work correctly
  testWithSetupSkip(
    'toggle() switches visibility on each click',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Toggle Menu", toggle(Menu)
  Frame name Menu, hidden, pad 16, bg #333
    Text "Menu content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getDisplay = () =>
        window.getComputedStyle(document.querySelector('[data-mirror-id="node-3"]')!).display

      api.assert.equal(getDisplay(), 'none', 'Menu should be hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.assert.ok(getDisplay() !== 'none', 'Menu should be visible after first click')

      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.assert.equal(getDisplay(), 'none', 'Menu should be hidden after second click')

      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.assert.ok(getDisplay() !== 'none', 'Menu should be visible after third click')
    }
  ),

  testWithSetup(
    'toggle() on element itself changes own state',
    `Frame pad 16, bg #1a1a1a
  Button "Toggle Me", toggle(), bg #333, col white
    on:
      bg #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),
])
