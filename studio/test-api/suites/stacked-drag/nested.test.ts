/**
 * Nested Stacked Containers — drop into a stacked Frame inside a stacked Frame
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const nestedStackedTests: TestCase[] = describe('Nested Stacked Containers', [
  testWithSetup(
    'Drop into nested stacked Frame',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Frame stacked, w 200, h 150, bg #333, x 100, y 75`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-2', 50, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'Drop Icon into nested stacked',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Frame stacked, w 180, h 120, bg #333, x 110, y 90`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-2', 80, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
    }
  ),
])
