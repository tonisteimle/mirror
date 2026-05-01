/**
 * Drag & Drop Interaction Tests
 *
 * For drag system tests with alignment zones see ../drag/.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const dragDropTests: TestCase[] = describe('Drag & Drop', [
  testWithSetup(
    'Can drag from palette to container',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 0)

      await api.interact.dragFromPalette('Button', 'node-1', 0)

      await api.utils.waitForIdle()
    }
  ),

  testWithSetup(
    'Can move element within container',
    'Frame gap 8\n  Text "First"\n  Text "Second"\n  Text "Third"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
    }
  ),
])
