/**
 * Disabled Element Events — verify events do not fire
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const disabledEventTests: TestCase[] = describe('Disabled Element Events', [
  testWithSetup(
    'disabled button does not respond to click',
    `count: 0

Frame gap 8, pad 16, bg #1a1a1a
  Button "Disabled", onclick increment(count), disabled, pad 12 24, bg #333, col #666, rad 6
  Text "$count", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initialCount = api.preview.inspect('node-3')
      api.assert.ok(initialCount?.textContent === '0', 'Initial count should be 0')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const afterClick = api.preview.inspect('node-3')
      api.assert.ok(
        afterClick?.textContent === '0',
        `Count should still be 0 after clicking disabled button, got: ${afterClick?.textContent}`
      )
    }
  ),

  testWithSetup(
    'disabled input does not accept focus',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Disabled", disabled, pad 12, bg #222, col #666, rad 6, bor 1, boc #333
    focus:
      boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement
      api.assert.ok(input.disabled === true, 'Input should be disabled')

      const initialBorderColor = api.preview.inspect('node-2')?.styles.borderColor
      api.assert.ok(
        initialBorderColor?.includes('51') || initialBorderColor?.includes('333'),
        `Initial border should be #333, got: ${initialBorderColor}`
      )

      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.ok(
        !input.hasAttribute('data-focus'),
        'Disabled input should not have data-focus attribute from interaction.focus()'
      )

      api.assert.ok(
        document.activeElement !== input,
        'Disabled input should not be the active element'
      )
    }
  ),
])
