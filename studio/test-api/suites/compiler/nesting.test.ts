/**
 * Compiler Nesting Tests — multi-level hierarchy, parent-child relations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const nestingTests: TestCase[] = describe('Nesting', [
  testWithSetup(
    '2-level nesting',
    'Frame gap 16\n  Frame gap 8\n    Text "Deep"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const root = api.preview.inspect('node-1')
      const middle = api.preview.inspect('node-2')
      const leaf = api.preview.inspect('node-3')

      api.assert.ok(root !== null, 'Root frame inspect should return info')
      api.assert.ok(middle !== null, 'Middle frame inspect should return info')
      api.assert.ok(leaf !== null, 'Leaf frame inspect should return info')

      api.assert.ok(
        root!.children.includes('node-2'),
        `node-2 should be child of node-1, got children: ${root!.children.join(', ')}`
      )
      api.assert.ok(
        middle!.children.includes('node-3'),
        `node-3 should be child of node-2, got children: ${middle!.children.join(', ')}`
      )
      api.assert.ok(
        leaf!.children.length === 0,
        `node-3 should have no children, got: ${leaf!.children.join(', ')}`
      )
    }
  ),

  testWithSetup(
    '3-level nesting',
    'Frame\n  Frame\n    Frame\n      Text "Deepest"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'Deepest')
    }
  ),

  testWithSetup(
    'siblings at same level',
    'Frame gap 8\n  Text "First"\n  Text "Second"\n  Text "Third"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
      api.assert.hasText('node-2', 'First')
      api.assert.hasText('node-3', 'Second')
      api.assert.hasText('node-4', 'Third')
    }
  ),
])
