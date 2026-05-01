/**
 * SourceMap Tests (node-id assignment, parent-child mapping, prelude offset)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sourceMapTests: TestCase[] = describe('SourceMap', [
  testWithSetup(
    'Node IDs are assigned sequentially',
    'Frame\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Nested elements get correct IDs',
    'Frame\n  Frame\n    Text "Deep"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const inner = api.preview.inspect('node-2')
      api.assert.ok(inner !== null, 'Inner frame should exist')
      api.assert.ok(
        inner!.parent === 'node-1',
        `Inner frame parent should be node-1, got: ${inner!.parent}`
      )

      const text = api.preview.inspect('node-3')
      api.assert.ok(text !== null, 'Text element should exist')
      api.assert.ok(text!.parent === 'node-2', `Text parent should be node-2, got: ${text!.parent}`)
    }
  ),

  testWithSetup('SourceMap available in state', 'Frame\n  Text "Test"', async (api: TestAPI) => {
    const sourceMap = api.state.getSourceMap()
    api.assert.ok(sourceMap !== null, 'SourceMap should be available')
  }),

  testWithSetup('Prelude offset is tracked', 'Frame\n  Text "Test"', async (api: TestAPI) => {
    const offset = api.state.getPreludeOffset()
    api.assert.ok(typeof offset === 'number', 'Prelude offset should be a number')
  }),
])
