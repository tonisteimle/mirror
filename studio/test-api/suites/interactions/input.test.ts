/**
 * Input Interaction Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const inputTests: TestCase[] = describe('Input Interactions', [
  testWithSetup('Can type into input', 'Input placeholder "Enter text"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.type('node-1', 'Hello World')

    const value = api.zag.getValue('node-1')
    api.assert.ok(value === 'Hello World', `Input should have typed value, got "${value}"`)
  }),

  testWithSetup('Can clear input', 'Input placeholder "Clear me"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.type('node-1', 'Some text')

    let value = api.zag.getValue('node-1')
    api.assert.ok(value === 'Some text', 'Input should have text before clear')

    await api.interact.clear('node-1')

    value = api.zag.getValue('node-1')
    api.assert.ok(value === '', `Input should be empty after clear, got "${value}"`)
  }),

  testWithSetup(
    'Textarea can be typed into',
    'Textarea placeholder "Message"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', 'Multi\nline\ntext')

      const value = api.zag.getValue('node-1') as string
      api.assert.ok(value !== null && value !== undefined, 'Textarea value should exist')
      api.assert.ok(value.includes('Multi'), `Textarea should have typed value, got "${value}"`)
    }
  ),
])
