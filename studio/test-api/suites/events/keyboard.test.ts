/**
 * Keyboard Events — Enter, Escape, Space, arrow keys
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const keyboardEventTests: TestCase[] = describe('Keyboard Events', [
  testWithSetup(
    'Enter key on input triggers action',
    `submitted: false

Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Press Enter", onenter set(submitted, true), pad 12, bg #222, col white, rad 6
  Text submitted ? "Submitted!" : "Not submitted", col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initialText = api.preview.inspect('node-3')
      api.assert.ok(
        initialText?.textContent?.includes('Not submitted') ||
          initialText?.fullText?.includes('Not submitted'),
        'Should show "Not submitted" initially'
      )

      await api.interact.focus('node-2')
      await api.interact.pressKeyOn('node-2', 'Enter')
      await api.utils.delay(200)

      const afterEnter = api.preview.inspect('node-3')
      api.assert.ok(
        afterEnter?.textContent?.includes('Submitted!') ||
          afterEnter?.fullText?.includes('Submitted!'),
        `Should show "Submitted!" after Enter, got: ${afterEnter?.textContent}`
      )
    }
  ),

  testWithSetup(
    'Escape key hides element',
    `Frame pad 16, bg #1a1a1a
  Frame name Modal, pad 24, bg #222, rad 8, onescape hide(Modal)
    Text "Press Escape to close", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const modalBefore = api.preview.inspect('node-2')
      api.assert.ok(modalBefore?.styles.display !== 'none', 'Modal should be visible initially')

      await api.interact.focus('node-2')
      await api.interact.pressKeyOn('node-2', 'Escape')
      await api.utils.delay(200)

      const modalAfter = api.preview.inspect('node-2')
      api.assert.ok(
        modalAfter?.styles.display === 'none' || modalAfter?.visible === false,
        'Modal should be hidden after Escape'
      )
    }
  ),

  testWithSetup(
    'Space key toggles element',
    `Frame pad 16, bg #1a1a1a
  Button "Press Space", onspace toggle(), pad 12 24, bg #333, col white, rad 6, focusable
    on:
      bg #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.focus('node-2')
      await api.interact.pressKeyOn('node-2', ' ')
      await api.utils.delay(200)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      await api.interact.pressKeyOn('node-2', ' ')
      await api.utils.delay(200)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  // TODO: Runtime bug - onkeydown-arrow-* events don't fire correctly in headless tests
  testWithSetupSkip(
    'Arrow keys change selected index',
    `selectedIndex: 0

Frame gap 4, pad 16, bg #1a1a1a, focusable, onkeydown-arrow-down increment(selectedIndex), onkeydown-arrow-up decrement(selectedIndex)
  Text "Item 1", pad 8, bg selectedIndex == 0 ? #2271C1 : #333, col white, rad 4
  Text "Item 2", pad 8, bg selectedIndex == 1 ? #2271C1 : #333, col white, rad 4
  Text "Item 3", pad 8, bg selectedIndex == 2 ? #2271C1 : #333, col white, rad 4`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.focus('node-1')
      await api.interact.pressKeyOn('node-1', 'ArrowDown')
      await api.utils.delay(200)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')

      await api.interact.pressKeyOn('node-1', 'ArrowUp')
      await api.utils.delay(200)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),
])
