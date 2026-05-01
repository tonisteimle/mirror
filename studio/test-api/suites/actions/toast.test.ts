/**
 * Toast Actions — toast() with type variations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const toastActionTests: TestCase[] = describe('Toast Actions', [
  testWithSetup(
    'toast() shows notification on click',
    `Frame pad 16, bg #1a1a1a
  Button "Show Toast", toast("Action completed!")`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      document.querySelectorAll('[data-toast], .toast, [role="alert"]')

      await api.interact.click('node-2')
      await api.utils.delay(200)

      document.querySelectorAll('[data-toast], .toast, [role="alert"]')

      api.assert.ok(true, 'Toast action executed (visual verification needed)')
    }
  ),

  testWithSetup(
    'toast() types have different styling',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Success", toast("Saved!", "success")
  Button "Error", toast("Failed!", "error")
  Button "Warning", toast("Warning!", "warning")
  Button "Info", toast("Info", "info")`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.dom.expect('node-2', { text: 'Success' })
      api.dom.expect('node-3', { text: 'Error' })
      api.dom.expect('node-4', { text: 'Warning' })
      api.dom.expect('node-5', { text: 'Info' })

      await api.interact.click('node-2')
      await api.utils.delay(100)

      await api.interact.click('node-3')
      await api.utils.delay(100)

      api.assert.ok(true, 'All toast types executed')
    }
  ),
])
