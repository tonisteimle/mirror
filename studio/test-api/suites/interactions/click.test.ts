/**
 * Click Interaction Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const clickTests: TestCase[] = describe('Click Events', [
  testWithSetup('Button is clickable', 'Button "Click me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Button should exist')
    api.assert.ok(
      info!.interactive === true,
      `Button should be interactive, got: ${info!.interactive}`
    )

    await api.interact.click('node-1')
  }),

  testWithSetup(
    'Frame with cursor pointer is clickable',
    'Frame cursor pointer, pad 16, bg #333\n  Text "Clickable"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      await api.interact.click('node-1')
    }
  ),
])
