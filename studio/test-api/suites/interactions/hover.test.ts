/**
 * Hover State Interaction Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const hoverTests: TestCase[] = describe('Hover States', [
  testWithSetup(
    'Element can be hovered',
    'Frame pad 16, bg #333\n  Text "Hover me"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.hover('node-1')
      await api.utils.waitForIdle()

      await api.interact.unhover('node-1')
    }
  ),
])
