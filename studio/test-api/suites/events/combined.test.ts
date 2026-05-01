/**
 * Combined Events — form workflow, like toggle, counter with reset
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const combinedEventTests: TestCase[] = describe('Combined Events', [
  testWithSetup(
    'Form with focus, input, and submit',
    `email: ""
submitted: false

Frame gap 12, pad 16, bg #1a1a1a
  Input bind email, placeholder "Enter email", pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1
  Button "Submit", onclick set(submitted, true), pad 12 24, bg #2271C1, col white, rad 6
  Text submitted ? "Form submitted with: $email" : "Enter email above", col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.focus('node-2')
      await api.utils.delay(100)
      api.assert.hasStyle('node-2', 'borderColor', 'rgb(34, 113, 193)')

      await api.interact.type('node-2', 'test@example.com')
      await api.utils.delay(200)

      await api.interact.click('node-3')
      await api.utils.delay(200)

      const resultText = api.preview.inspect('node-4')
      api.assert.ok(
        resultText?.textContent?.includes('submitted') ||
          resultText?.fullText?.includes('submitted'),
        `Should show submitted message, got: ${resultText?.textContent}`
      )
    }
  ),

  testWithSetup(
    'Toggle with state and animation',
    `Frame pad 16, bg #1a1a1a
  Button "Like", onclick toggle(), pad 12 24, bg #333, col white, rad 6
    on:
      bg #ef4444
      col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(239, 68, 68)')

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Counter with increment, decrement, and reset',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a, hor, ver-center
  Button "-", onclick decrement(count), w 40, h 40, bg #333, col white, rad 6, center
  Text "$count", col white, fs 24, w 60, center
  Button "+", onclick increment(count), w 40, h 40, bg #333, col white, rad 6, center
  Button "Reset", onclick set(count, 0), pad 8 16, bg #ef4444, col white, rad 6`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initial = api.preview.inspect('node-3')
      api.assert.ok(initial?.textContent === '5', 'Initial should be 5')

      await api.interact.click('node-4')
      await api.utils.delay(150)
      const afterInc = api.preview.inspect('node-3')
      api.assert.ok(afterInc?.textContent === '6', 'Should be 6 after increment')

      await api.interact.click('node-2')
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(150)
      const afterDec = api.preview.inspect('node-3')
      api.assert.ok(afterDec?.textContent === '4', 'Should be 4 after 2 decrements')

      await api.interact.click('node-5')
      await api.utils.delay(150)
      const afterReset = api.preview.inspect('node-3')
      api.assert.ok(afterReset?.textContent === '0', 'Should be 0 after reset')
    }
  ),
])
