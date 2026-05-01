/**
 * Layout Detection — stacked vs absolute children
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const layoutDetectionTests: TestCase[] = describe('Layout Detection', [
  testWithSetup(
    'Detects stacked layout by keyword',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Detects absolute children layout',
    'Frame w 300, h 200, bg #1a1a1a, relative\n  Button "Existing", x 10, y 10',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
    }
  ),
])
