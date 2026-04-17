/**
 * Checkbox Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const checkboxTests: TestCase[] = describe('Checkbox', [
  testWithSetup('Checkbox renders with label', 'Checkbox "Accept terms"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Checkbox should render')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Checkbox should be unchecked by default')
  }),

  testWithSetup(
    'Checkbox with checked state',
    'Checkbox "Enabled", checked',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(api.zag.isChecked('node-1'), 'Checkbox should be checked initially')
    }
  ),

  testWithSetup('Checkbox toggle interaction', 'Checkbox "Toggle me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Should start unchecked')

    await api.zag.check('node-1')
    api.assert.ok(api.zag.isChecked('node-1'), 'Should be checked after check()')

    await api.zag.uncheck('node-1')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Should be unchecked after uncheck()')
  }),

  testWithSetup(
    'Checkbox with disabled',
    'Checkbox "Disabled option", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available')
    }
  ),
])
