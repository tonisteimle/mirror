/**
 * Dialog Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const dialogTests: TestCase[] = describe('Dialog', [
  testWithSetup(
    'Dialog renders with trigger',
    'Dialog\n  Trigger: Button "Open"\n  Content: Frame pad 24\n    Text "Dialog content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed by default')
    }
  ),

  testWithSetup(
    'Dialog open/close interaction',
    'Dialog\n  Trigger: Button "Open"\n  Content: Frame pad 24, bg white\n    Text "Modal"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should start closed')

      await api.zag.open('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.zag.isOpen('node-1'), 'Dialog should be open after open()')

      await api.zag.close('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed after close()')
    }
  ),

  testWithSetup(
    'Dialog with backdrop',
    'Dialog\n  Trigger: Button "Open"\n  Backdrop: bg rgba(0,0,0,0.5)\n  Content: Frame pad 24, bg white\n    Text "Modal"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available for Dialog')
    }
  ),
])
