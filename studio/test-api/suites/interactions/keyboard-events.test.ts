/**
 * Keyboard Event Tests (DOM-level: Enter / Escape / Tab)
 *
 * For Studio editor keyboard shortcuts (insert element, padding arrows, etc.)
 * see keyboard-editing.test.ts
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const keyboardTests: TestCase[] = describe('Keyboard Events', [
  testWithSetup('Can press Enter key', 'Input placeholder "Press Enter"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    await api.interact.pressKey('Enter')
  }),

  testWithSetup(
    'Can press Escape key',
    'Frame pad 16\n  Text "Press Escape"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.pressKey('Escape')
    }
  ),

  testWithSetup(
    'Can press Tab key',
    'Frame gap 8\n  Input placeholder "First"\n  Input placeholder "Second"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.focus('node-2')
      await api.interact.pressKey('Tab')
    }
  ),
])
