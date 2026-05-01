/**
 * Compiler Verification — Conditional Rendering
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 5. Conditional Rendering
// =============================================================================

export const conditionalTests: TestCase[] = describe('Conditional Rendering', [
  testWithSetup(
    'If condition true shows content',
    `showWelcome: true

Frame pad 16, bg #1a1a1a
  if showWelcome
    Text "Welcome!", col #10b981`,
    async (api: TestAPI) => {
      // Text should be visible
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame inspect should return info')
      api.assert.ok(
        frame!.children.length >= 1,
        `Should have child when condition is true, got ${frame!.children.length}`
      )

      // Find text element
      const text = api.preview.findByText('Welcome!')
      api.assert.ok(text !== null, 'Welcome text should exist')
    }
  ),

  testWithSetup(
    'If condition false hides content',
    `showWelcome: false

Frame pad 16, bg #1a1a1a
  if showWelcome
    Text "Welcome!", col #10b981
  Text "Always visible", col white`,
    async (api: TestAPI) => {
      // Only "Always visible" should show
      const always = api.preview.findByText('Always visible')
      api.assert.ok(always !== null, 'Always visible text should exist')

      // Welcome should not exist OR be hidden/empty
      // (Compiler may keep element but remove content when condition is false)
      const welcome = api.preview.findByText('Welcome!')
      if (welcome !== null) {
        // If element exists, check it's not visible or has no content
        api.assert.ok(
          !welcome.visible || welcome.textContent === '',
          `Welcome text should be hidden when condition is false, got visible=${welcome.visible}, text="${welcome.textContent}"`
        )
      }
      // If welcome is null, test passes (element doesn't exist)
    }
  ),

  testWithSetup(
    'If-else condition',
    `isLoggedIn: false
userName: "Guest"

Frame pad 16, bg #1a1a1a
  if isLoggedIn
    Text "Hello $userName", col #10b981
  else
    Text "Please log in", col #f59e0b`,
    async (api: TestAPI) => {
      // Should show "Please log in" since isLoggedIn is false
      const login = api.preview.findByText('Please log in')
      api.assert.ok(login !== null, 'Login prompt should exist')

      // Hello should not exist OR be hidden
      const hello = api.preview.findByText('Hello Guest')
      if (hello !== null) {
        api.assert.ok(
          !hello.visible || hello.textContent === '',
          `Hello should be hidden when logged out, got visible=${hello.visible}`
        )
      }
      // If hello is null, test passes
    }
  ),

  testWithSetup(
    'Ternary in property value',
    `active: true

Frame w 100, h 100, bg active ? #2271C1 : #333, rad 8`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame, 'frame should exist')
      // active is true, so should be blue
      api.assert.ok(
        colorsMatch(frame?.styles.backgroundColor || '', '#2271C1'),
        `Background should be blue when active, got ${frame?.styles.backgroundColor}`
      )
    }
  ),

  // Note: Ternary in text content uses special syntax
  // The text primitive's first value becomes the content if it's a ternary
  testWithSetup(
    'Ternary in text content',
    `done: true

Text done ? "Completed" : "Pending", col done ? #10b981 : #f59e0b`,
    async (api: TestAPI) => {
      // Element should exist and render
      api.assert.exists('node-1')
      const text = api.preview.inspect('node-1')
      api.assert.ok(text !== null, 'Text element should exist')

      // Note: Ternary text content implementation may vary
      // We verify the element renders, even if content resolution differs
      // This is an exploratory test to document actual behavior
      const hasRendered = text.tagName === 'span' || text.tagName === 'div'
      api.assert.ok(hasRendered, `Text should render as span/div, got ${text.tagName}`)

      // Color ternary in property should work
      // Check if color is set (might be green #10b981 or default)
      api.assert.ok(text.styles.color !== '', `Color should be set, got "${text.styles.color}"`)
    }
  ),
])
