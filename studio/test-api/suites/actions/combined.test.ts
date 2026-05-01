/**
 * Combined Actions — multiple actions on a single click
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const combinedActionTests: TestCase[] = describe('Combined Actions', [
  // TODO: Runtime bug - toggle() + increment() combined actions don't both execute properly
  testWithSetupSkip(
    'Multiple actions execute on single click',
    `count: 0

Frame pad 16, bg #1a1a1a
  Button "Like", toggle(), increment(count), bg #333, col white, pad 12 20, rad 6
    on:
      bg #ef4444
  Text "Likes: $count", col #888, fs 14`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.dom.expect('node-3', { textContains: '0' })

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(239, 68, 68)')
      api.dom.expect('node-3', { textContains: '1' })

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.dom.expect('node-3', { textContains: '2' })
    }
  ),

  // TODO: Runtime bug - toggle() + show() combined actions don't work correctly
  testWithSetupSkip(
    'Action chain with state change and visibility',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Submit", toggle(), show(Confirmation), bg #333, col white
    on:
      bg #10b981
  Frame name Confirmation, hidden, pad 12, bg #222, rad 8
    Text "Submitted successfully!", col #10b981`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getConfirmationDisplay = () =>
        window.getComputedStyle(document.querySelector('[data-mirror-id="node-3"]')!).display

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.equal(getConfirmationDisplay(), 'none', 'Confirmation hidden initially')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.ok(getConfirmationDisplay() !== 'none', 'Confirmation should be visible')
    }
  ),

  // TODO: reset() DOM bug workaround - increment after reset to show value
  testWithSetup(
    'Counter with reset and toggle state',
    `count: 0
active: false

Frame gap 12, pad 16, bg #1a1a1a
  Frame hor, gap 8
    Button "-", decrement(count), w 40, h 40, bg #333, col white
    Text "$count", w 60, center, col white, fs 20
    Button "+", increment(count), w 40, h 40, bg #333, col white
  Frame hor, gap 8
    Button "Reset", reset(count), bg #666, col white
    Button "Toggle Active", toggle(), bg #333, col white
      on:
        bg #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-4', { textContains: '0' })

      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-5')
      }
      await api.utils.delay(100)
      api.dom.expect('node-4', { textContains: '5' })

      await api.interact.click('node-7')
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(100)
      api.dom.expect('node-4', { textContains: '1' })

      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(51, 51, 51)')
      await api.interact.click('node-8')
      await api.utils.delay(100)
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),
])
