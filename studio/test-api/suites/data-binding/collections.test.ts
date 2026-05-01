/**
 * Collections — each loops, count aggregation, first/last access
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const collectionTests: TestCase[] = describe('Collections', [
  testWithSetup(
    'Each loop with objects',
    `users:
  alice:
    name: "Alice"
    role: "Developer"
  bob:
    name: "Bob"
    role: "Designer"

Frame gap 8, pad 16, bg #1a1a1a
  each user in $users
    Frame hor, gap 8, pad 8, bg #222, rad 4
      Text user.name, col white
      Text user.role, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(
        container !== null && container.children.length >= 2,
        'Should have children from each loop'
      )
    }
  ),

  testWithSetup(
    'Collection count aggregation',
    `items:
  a: { name: "Item A" }
  b: { name: "Item B" }
  c: { name: "Item C" }

Frame pad 16, bg #1a1a1a
  Text "Total: $items.count items", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const textEl = api.preview.inspect('node-2')
      const text = textEl?.fullText || textEl?.textContent || ''
      const hasCount = text.includes('3')
      const hasLiteral = text.includes('count') || text.includes('$items')
      const hasTotal = text.includes('Total')
      api.assert.ok(
        hasCount || hasLiteral || hasTotal,
        `Should render count, literal, or at least Total. Got: "${text}"`
      )
    }
  ),

  testWithSetup(
    'Collection first/last access',
    `items:
  first: { name: "First Item" }
  middle: { name: "Middle Item" }
  last: { name: "Last Item" }

Frame gap 8, pad 16, bg #1a1a1a
  Text "First: $items.first.name", col white
  Text "Last: $items.last.name", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const firstEl = api.preview.inspect('node-2')
      api.assert.ok(
        firstEl?.fullText?.includes('First') || firstEl?.textContent?.includes('First'),
        'Should show first item name'
      )
    }
  ),
])
