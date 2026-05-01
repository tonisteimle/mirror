/**
 * Combined Interaction Flow Tests
 *
 * Multi-step user flows that span multiple interaction primitives
 * (form fill + submit, select + interact).
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const combinedTests: TestCase[] = describe('Combined Interactions', [
  testWithSetup(
    'Form interaction flow',
    'Frame gap 16, pad 24\n  Input placeholder "Name"\n  Input placeholder "Email"\n  Button "Submit"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-2', 'John Doe')
      await api.interact.type('node-3', 'john@example.com')

      await api.interact.click('node-4')
    }
  ),

  testWithSetup(
    'Select then interact flow',
    'Frame gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.interact.select('node-2')
      await api.utils.waitForIdle()
      api.assert.isSelected('node-2')

      api.interact.select('node-3')
      await api.utils.waitForIdle()
      api.assert.isSelected('node-3')
    }
  ),
])
