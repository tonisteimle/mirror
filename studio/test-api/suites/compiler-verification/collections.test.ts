/**
 * Compiler Verification — Collections & Each
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 6. Each Loop & Collections
// =============================================================================

export const collectionTests: TestCase[] = describe('Collections & Each', [
  // Note: Each loop uses inline array syntax for reliable rendering
  testWithSetup(
    'Each loop renders items',
    `Frame gap 8, pad 16, bg #1a1a1a
  each fruit in ["Apple", "Banana", "Cherry"]
    Frame hor, gap 8, pad 8, bg #333, rad 4
      Text fruit, col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Each loop should render items
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(
        allNodes.length >= 2,
        `Should have multiple elements rendered, got ${allNodes.length} nodes`
      )

      // Check that at least one fruit name is rendered
      const apple = api.preview.findByText('Apple')
      const banana = api.preview.findByText('Banana')
      const cherry = api.preview.findByText('Cherry')

      const hasAnyFruit = apple !== null || banana !== null || cherry !== null
      api.assert.ok(hasAnyFruit, 'At least one fruit should be rendered')
    }
  ),

  testWithSetup(
    'Each with index',
    `Frame gap 4, pad 16, bg #1a1a1a
  each item in ["Item A", "Item B", "Item C"] with index
    Text item, col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have rendered some items
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 2, 'Should render items')
    }
  ),
])
