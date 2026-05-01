/**
 * Conditionals — if/else, ternaries, comparison operators
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const conditionalTests: TestCase[] = describe('Conditionals', [
  testWithSetup(
    'If condition shows element',
    `loggedIn: true

Frame pad 16, bg #1a1a1a
  if loggedIn
    Text "Welcome back!", col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(
        (container?.children?.length ?? 0) >= 1 || container?.fullText?.includes('Welcome'),
        'Should show conditional content'
      )
    }
  ),

  testWithSetup(
    'If-else condition',
    `isAdmin: false

Frame pad 16, bg #1a1a1a
  if isAdmin
    Text "Admin Panel", col #ef4444
  else
    Text "User View", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(
        container?.fullText?.includes('User') || container?.textContent?.includes('User'),
        'Should show else branch'
      )
    }
  ),

  testWithSetup(
    'Ternary expression in text',
    `done: true

Frame pad 16, bg #1a1a1a
  Text done ? "Completed" : "Pending", col done ? #10b981 : #f59e0b`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      const hasContent =
        container !== null && (container.children.length > 0 || container.fullText !== '')
      api.assert.ok(hasContent, 'Should render content')
    }
  ),

  testWithSetup(
    'Ternary in property value',
    `active: true

Frame w 100, h 50, bg active ? #2271C1 : #333, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should render')
    }
  ),

  testWithSetup(
    'Comparison operators',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a
  Text count > 0 ? "Has items" : "Empty", col white
  Text count < 10 ? "Under limit" : "Over limit", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should render')
    }
  ),
])
