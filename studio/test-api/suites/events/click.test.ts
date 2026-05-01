/**
 * Click Events — onclick increment/toggle/show/hide, multi-action, rapid clicks
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const clickEventTests: TestCase[] = describe('Click Events', [
  testWithSetup(
    'onclick increment actually changes counter',
    `count: 0

Frame gap 8, pad 16, bg #1a1a1a
  Button "Click", onclick increment(count), bg #2271C1, col white, pad 12 24, rad 6
  Text "$count", col white, fs 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const initialText = api.preview.inspect('node-3')
      api.assert.ok(
        initialText?.textContent === '0' || initialText?.fullText?.includes('0'),
        `Initial count should be 0, got: ${initialText?.textContent}`
      )

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const afterClick = api.preview.inspect('node-3')
      api.assert.ok(
        afterClick?.textContent === '1' || afterClick?.fullText?.includes('1'),
        `Count should be 1 after click, got: ${afterClick?.textContent}`
      )

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const afterSecondClick = api.preview.inspect('node-3')
      api.assert.ok(
        afterSecondClick?.textContent === '2' || afterSecondClick?.fullText?.includes('2'),
        `Count should be 2 after second click, got: ${afterSecondClick?.textContent}`
      )
    }
  ),

  testWithSetup(
    'onclick toggle changes background color',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Toggle", onclick toggle(), bg #333, col white, pad 12 24, rad 6
    on:
      bg #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'onclick show makes hidden element visible',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Show Menu", onclick show(Menu), bg #333, col white, pad 12 24, rad 6
  Frame name Menu, hidden, pad 16, bg #222, rad 8
    Text "Menu Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const menuBefore = api.preview.inspect('node-3')
      api.assert.ok(
        menuBefore?.styles.display === 'none' || !menuBefore?.visible,
        'Menu should be hidden initially'
      )

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const menuAfter = api.preview.inspect('node-3')
      api.assert.ok(
        menuAfter?.styles.display !== 'none' && menuAfter?.visible !== false,
        'Menu should be visible after click'
      )
    }
  ),

  testWithSetup(
    'onclick hide makes visible element hidden',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Hide Panel", onclick hide(Panel), bg #333, col white, pad 12 24, rad 6
  Frame name Panel, pad 16, bg #222, rad 8
    Text "Panel Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const panelBefore = api.preview.inspect('node-3')
      api.assert.ok(panelBefore?.styles.display !== 'none', 'Panel should be visible initially')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const panelAfter = api.preview.inspect('node-3')
      api.assert.ok(
        panelAfter?.styles.display === 'none' || panelAfter?.visible === false,
        'Panel should be hidden after click'
      )
    }
  ),

  testWithSetup(
    'onclick with multiple actions executes all',
    `count: 0
active: false

Frame gap 8, pad 16, bg #1a1a1a
  Button "Multi", onclick increment(count), toggle(), bg #333, col white, pad 12 24, rad 6
    on:
      bg #10b981
  Text "$count", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      const initialCount = api.preview.inspect('node-3')
      api.assert.ok(initialCount?.textContent === '0', 'Initial count should be 0')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(16, 185, 129)')
      const afterCount = api.preview.inspect('node-3')
      api.assert.ok(afterCount?.textContent === '1', 'Count should be 1 after click')
    }
  ),

  testWithSetup(
    'rapid clicks increment correctly',
    `count: 0

Frame gap 8, pad 16, bg #1a1a1a
  Button "Rapid", onclick increment(count), bg #2271C1, col white, pad 12 24, rad 6
  Text "$count", col white, fs 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-2')
        await api.utils.delay(50)
      }
      await api.utils.delay(100)

      const finalCount = api.preview.inspect('node-3')
      api.assert.ok(
        finalCount?.textContent === '5' || finalCount?.fullText?.includes('5'),
        `Count should be 5 after 5 clicks, got: ${finalCount?.textContent}`
      )
    }
  ),
])
