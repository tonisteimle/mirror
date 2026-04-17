/**
 * DatePicker Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const datePickerTests: TestCase[] = describe('DatePicker', [
  testWithSetup(
    'DatePicker renders',
    'DatePicker placeholder "Select date"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'DatePicker should render')
    }
  ),

  testWithSetup(
    'DatePicker disabled',
    'DatePicker placeholder "Locked", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])
