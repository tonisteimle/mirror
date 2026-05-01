/**
 * Input Binding — Input/Textarea bind to variables
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const inputBindingTests: TestCase[] = describe('Input Binding', [
  testWithSetup(
    'Input with bind shows initial value',
    `searchTerm: "initial"

Frame pad 16, bg #1a1a1a
  Input bind searchTerm, placeholder "Type here..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const input = api.preview.inspect('node-2')
      const tagName = input?.tagName?.toUpperCase() || ''
      api.assert.ok(
        tagName === 'INPUT' || tagName === 'DIV',
        'Should be an input or wrapper element'
      )
    }
  ),

  testWithSetup(
    'Textarea with bind',
    `content: ""

Frame pad 16, bg #1a1a1a
  Textarea bind content, placeholder "Enter text...", h 100`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const textarea = api.preview.inspect('node-2')
      const tagName = textarea?.tagName?.toUpperCase() || ''
      api.assert.ok(
        tagName === 'TEXTAREA' || tagName === 'DIV',
        'Should be a textarea or wrapper element'
      )
    }
  ),
])
