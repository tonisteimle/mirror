/**
 * Select Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const selectTests: TestCase[] = describe('Select', [
  testWithSetup(
    'Select renders with placeholder',
    'Select placeholder "Choose..."',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Select should render')
      api.assert.ok(!api.zag.isOpen('node-1'), 'Select should be closed by default')
    }
  ),

  testWithSetup(
    'Select with options',
    'Select placeholder "City"\n  Option "Berlin"\n  Option "Hamburg"\n  Option "München"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const selected = api.zag.getSelectedOption('node-1')
      api.assert.ok(selected === null || selected === '', 'No option should be selected initially')

      const options = api.zag.getOptions('node-1')
      api.assert.ok(options.length >= 3, `Expected at least 3 options, got ${options.length}`)
    }
  ),

  testWithSetup(
    'Select option interaction',
    'Select placeholder "City"\n  Option "Berlin"\n  Option "Hamburg"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.zag.open('node-1')
      api.assert.ok(api.zag.isOpen('node-1'), 'Select should be open after open()')

      await api.zag.selectOption('node-1', 'Berlin')
      await api.utils.waitForIdle()

      const selected = api.zag.getSelectedOption('node-1')
      api.assert.ok(
        selected === 'Berlin' || selected?.includes('Berlin'),
        `Should have Berlin selected, got "${selected}"`
      )
    }
  ),

  testWithSetup(
    'Select disabled',
    'Select placeholder "Locked", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available')
    }
  ),
])
