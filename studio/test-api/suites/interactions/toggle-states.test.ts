/**
 * Toggle State Interaction Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const toggleTests: TestCase[] = describe('Toggle States', [
  testWithSetup(
    'Toggle button renders',
    'Button "Toggle", toggle()\n  on:\n    bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Toggle with initial on state',
    'Button "Active", toggle(), on\n  on:\n    bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Exclusive toggle (radio-like)',
    'Frame hor, gap 8\n  Button "A", exclusive()\n    selected:\n      bg #2271C1\n  Button "B", exclusive()\n    selected:\n      bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
    }
  ),
])
