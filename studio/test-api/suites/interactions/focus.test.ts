/**
 * Focus Interaction Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const focusTests: TestCase[] = describe('Focus States', [
  testWithSetup('Input can be focused', 'Input placeholder "Type here"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    await api.interact.blur('node-1')
  }),

  testWithSetup('Button can be focused', 'Button "Focus me"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    await api.interact.blur('node-1')
  }),
])
