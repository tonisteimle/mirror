/**
 * RadioGroup Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const radioGroupTests: TestCase[] = describe('RadioGroup', [
  testWithSetup(
    'RadioGroup renders',
    'RadioGroup value "a"\n  RadioItem "Option A", value "a"\n  RadioItem "Option B", value "b"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'RadioGroup should render')

      const selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'a', `Expected "a" selected, got "${selected}"`)
    }
  ),

  testWithSetup(
    'RadioGroup with default value',
    'RadioGroup value "monthly"\n  RadioItem "Monthly", value "monthly"\n  RadioItem "Yearly", value "yearly"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'monthly', `Expected "monthly" selected, got "${selected}"`)
    }
  ),

  testWithSetup(
    'RadioGroup selection interaction',
    'RadioGroup value "a"\n  RadioItem "Option A", value "a"\n  RadioItem "Option B", value "b"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      let selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'a', `Initially should have "a" selected, got "${selected}"`)

      await api.zag.selectRadio('node-1', 'b')
      await api.utils.waitForIdle()

      selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'b', `After selection should have "b", got "${selected}"`)
    }
  ),
])
