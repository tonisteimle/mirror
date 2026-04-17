/**
 * Tooltip Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tooltipTests: TestCase[] = describe('Tooltip', [
  testWithSetup(
    'Tooltip renders with trigger',
    'Tooltip\n  Trigger: Icon "info"\n  Content: Text "Help text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should be closed by default')
    }
  ),

  testWithSetup(
    'Tooltip open on hover',
    'Tooltip\n  Trigger: Button "Hover me"\n  Content: Text "Tooltip content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should start closed')

      await api.zag.open('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.zag.isOpen('node-1'), 'Tooltip should be open after open()')

      await api.zag.close('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should be closed after close()')
    }
  ),

  testWithSetup(
    'Tooltip with positioning',
    'Tooltip positioning "bottom"\n  Trigger: Button "Hover me"\n  Content: Text "Below"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available for Tooltip')
    }
  ),
])
