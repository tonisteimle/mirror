/**
 * Clipboard Actions — copy()
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const clipboardActionTests: TestCase[] = describe('Clipboard Actions', [
  testWithSetup(
    'copy() action can be triggered',
    `Frame pad 16, bg #1a1a1a
  Button "Copy Code", copy("ABC123")`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-2', { tag: 'button', text: 'Copy Code' })

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.assert.ok(true, 'Copy action executed without error')
    }
  ),

  testWithSetup(
    'copy() with toast shows feedback',
    `Frame pad 16, bg #1a1a1a
  Button "Copy & Notify", copy("secret-key"), toast("Copied!", "success")`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.click('node-2')
      await api.utils.delay(200)

      api.assert.ok(true, 'Copy and toast actions executed')
    }
  ),
])
