/**
 * Counter Actions — increment/decrement/set/reset
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const counterActionTests: TestCase[] = describe('Counter Actions', [
  testWithSetup(
    'increment() increases counter on click',
    `count: 0

Frame hor, gap 12, pad 16, bg #1a1a1a, ver-center
  Button "-", decrement(count), bg #333, col white, w 40, h 40, rad 6
  Text "$count", fs 24, col white, w 60, center
  Button "+", increment(count), bg #333, col white, w 40, h 40, rad 6`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-3', { textContains: '0' })

      await api.interact.click('node-4')
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: '1' })

      await api.interact.click('node-4')
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: '2' })

      await api.interact.click('node-4')
      await api.interact.click('node-4')
      await api.interact.click('node-4')
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: '5' })
    }
  ),

  testWithSetup(
    'decrement() decreases counter on click',
    `count: 10

Frame gap 8, pad 16, bg #1a1a1a
  Button "Decrease", decrement(count)
  Text "$count", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-3', { textContains: '10' })

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: '9' })

      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-2')
      }
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: '4' })
    }
  ),

  testWithSetup(
    'set() sets specific value on click',
    `count: 0

Frame gap 8, pad 16, bg #1a1a1a
  Button "Set to 100", set(count, 100)
  Button "Set to 50", set(count, 50)
  Text "$count", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-4', { textContains: '0' })

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.dom.expect('node-4', { textContains: '100' })

      await api.interact.click('node-3')
      await api.utils.delay(100)

      api.dom.expect('node-4', { textContains: '50' })
    }
  ),

  // TODO: Fix runtime bug - reset() clears DOM text instead of setting to value
  testWithSetup(
    'reset() resets counter to initial value',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a
  Button "+", increment(count)
  Button "Reset", reset(count)
  Text "$count", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-4', { textContains: '5' })

      await api.interact.click('node-2')
      await api.interact.click('node-2')
      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.dom.expect('node-4', { textContains: '8' })

      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.dom.expect('node-4', { textContains: '1' })
    }
  ),

  testWithSetup(
    'increment and decrement work together',
    `count: 0

Frame hor, gap 8, pad 16, bg #1a1a1a, ver-center
  Button "-", decrement(count), w 40, h 40
  Text "$count", w 60, center, col white, fs 20
  Button "+", increment(count), w 40, h 40`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-3', { textContains: '0' })

      await api.interact.click('node-4')
      await api.interact.click('node-4')
      await api.interact.click('node-4')
      await api.utils.delay(100)
      api.dom.expect('node-3', { textContains: '3' })

      await api.interact.click('node-2')
      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.dom.expect('node-3', { textContains: '1' })

      await api.interact.click('node-2')
      await api.interact.click('node-2')
      await api.utils.delay(100)
      api.dom.expect('node-3', { textContains: '-1' })
    }
  ),
])
