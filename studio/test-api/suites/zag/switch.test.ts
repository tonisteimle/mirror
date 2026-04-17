/**
 * Switch Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const switchTests: TestCase[] = describe('Switch', [
  testWithSetup('Switch renders', 'Switch "Dark mode"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Switch should render')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Switch should be unchecked by default')
  }),

  testWithSetup(
    'Switch with checked state',
    'Switch "Notifications", checked',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.ok(api.zag.isChecked('node-1'), 'Switch should be checked initially')
    }
  ),

  testWithSetup('Switch toggle interaction', 'Switch "Toggle mode"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Should start unchecked')

    await api.zag.toggle('node-1')
    api.assert.ok(api.zag.isChecked('node-1'), 'Should be checked after toggle()')

    await api.zag.toggle('node-1')
    api.assert.ok(!api.zag.isChecked('node-1'), 'Should be unchecked after second toggle()')
  }),

  testWithSetup('Switch disabled', 'Switch "Locked", disabled', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const state = api.zag.getState('node-1')
    api.assert.ok(state !== null, 'Zag state should be available')
  }),
])
