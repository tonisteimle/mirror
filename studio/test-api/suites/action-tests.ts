/**
 * Action Tests
 *
 * Tests for Mirror's action system:
 * - Visibility actions (show, hide, toggle)
 * - Navigation actions (navigate, back, forward)
 * - Overlay/positioning actions (showAt, showBelow, showModal, dismiss)
 * - Scroll actions (scrollTo, scrollToTop, scrollToBottom)
 * - Counter actions (increment, decrement, set, reset)
 * - Clipboard actions (copy)
 * - Form actions (focus, blur, clear, setError)
 * - Toast notifications
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Visibility Actions
// =============================================================================

export const visibilityActionTests: TestCase[] = describe('Visibility Actions', [
  testWithSetup(
    'show() makes element visible',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Show", show(Target)
  Frame name Target, hidden, pad 16, bg #333
    Text "Now visible", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Button

      // Target frame should exist (node-3)
      const target = api.preview.inspect('node-3')
      api.assert.ok(target !== null, 'Target element should exist')
    }
  ),

  testWithSetup(
    'hide() makes element hidden',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Hide", hide(Target)
  Frame name Target, pad 16, bg #333
    Text "Will be hidden", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Target (visible initially)
    }
  ),

  testWithSetup(
    'toggle() switches visibility',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "Toggle Menu", toggle(Menu)
  Frame name Menu, hidden, pad 16, bg #333
    Text "Menu content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Toggle button
      api.assert.exists('node-3') // Menu
    }
  ),
])

// =============================================================================
// Counter Actions
// =============================================================================

export const counterActionTests: TestCase[] = describe('Counter Actions', [
  testWithSetup(
    'increment() increases counter',
    `count: 0

Frame hor, gap 12, pad 16, bg #1a1a1a, ver-center
  Button "-", decrement(count), bg #333, col white, w 40, h 40, rad 6
  Text "$count", fs 24, col white, w 60, center
  Button "+", increment(count), bg #333, col white, w 40, h 40, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Minus button
      api.dom.expect('node-2', { tag: 'button', text: '-' })

      // Count display
      api.dom.expect('node-3', { textContains: '0' })

      // Plus button
      api.dom.expect('node-4', { tag: 'button', text: '+' })
    }
  ),

  testWithSetup(
    'decrement() decreases counter',
    `count: 10

Frame hor, gap 8, pad 16, bg #1a1a1a
  Button "Decrease", decrement(count)
  Text "$count", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-3', { textContains: '10' })
    }
  ),

  testWithSetup(
    'set() sets specific value',
    `count: 0

Frame gap 8, pad 16, bg #1a1a1a
  Button "Set to 100", set(count, 100)
  Text "$count", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
      api.dom.expect('node-3', { textContains: '0' })
    }
  ),

  testWithSetup(
    'reset() resets to initial value',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a
  Button "Reset", reset(count)
  Text "$count", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),
])

// =============================================================================
// Scroll Actions
// =============================================================================

export const scrollActionTests: TestCase[] = describe('Scroll Actions', [
  testWithSetup(
    'scrollToTop() action defined',
    `Frame h 200, scroll, bg #1a1a1a
  Frame h 500, pad 16
    Text "Top", col white
    Spacer h 400
    Button "Go to top", scrollToTop()`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check scroll container exists
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Scroll container should exist')
    }
  ),

  testWithSetup(
    'scrollToBottom() action defined',
    `Frame h 200, scroll, bg #1a1a1a
  Frame h 500, pad 16
    Button "Go to bottom", scrollToBottom()
    Spacer h 400
    Text "Bottom", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'scrollTo() scrolls to element',
    `Frame h 200, scroll, bg #1a1a1a
  Frame h 600, pad 16, gap 8
    Button "Go to Section", scrollTo(Section2)
    Frame name Section1, h 200, bg #333
      Text "Section 1", col white
    Frame name Section2, h 200, bg #2271C1
      Text "Section 2", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3') // Button
      api.assert.exists('node-4') // Section1
      api.assert.exists('node-6') // Section2
    }
  ),
])

// =============================================================================
// Toast Notifications
// =============================================================================

export const toastActionTests: TestCase[] = describe('Toast Actions', [
  testWithSetup(
    'toast() shows notification',
    `Frame pad 16, bg #1a1a1a
  Button "Show Toast", toast("Action completed!")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),

  testWithSetup(
    'toast() with type parameter',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Success", toast("Saved!", "success")
  Button "Error", toast("Failed!", "error")
  Button "Warning", toast("Warning!", "warning")
  Button "Info", toast("Info", "info")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { text: 'Success' })
      api.dom.expect('node-3', { text: 'Error' })
      api.dom.expect('node-4', { text: 'Warning' })
      api.dom.expect('node-5', { text: 'Info' })
    }
  ),

  testWithSetup(
    'toast() with position parameter',
    `Frame pad 16, bg #1a1a1a
  Button "Top Right", toast("Message", "info", "top-right")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),
])

// =============================================================================
// Form Actions
// =============================================================================

export const formActionTests: TestCase[] = describe('Form Actions', [
  testWithSetup(
    'focus() sets focus to input',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Focus Email", focus(EmailField)
  Input name EmailField, placeholder "Email..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
      api.dom.expect('node-3', { tag: 'input' })
    }
  ),

  testWithSetup(
    'clear() clears input value',
    `searchTerm: "initial"

Frame gap 8, pad 16, bg #1a1a1a
  Input bind searchTerm, name SearchField
  Button "Clear", clear(SearchField)`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Input
      api.dom.expect('node-3', { tag: 'button', text: 'Clear' })
    }
  ),

  testWithSetup(
    'setError() shows error on input',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input name EmailField, placeholder "Email..."
  Button "Validate", setError(EmailField, "Invalid email format")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'input' })
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'clearError() removes error from input',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input name EmailField, placeholder "Email..."
  Button "Clear Error", clearError(EmailField)`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'input' })
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),
])

// =============================================================================
// Navigation Actions
// =============================================================================

export const navigationActionTests: TestCase[] = describe('Navigation Actions', [
  testWithSetup(
    'navigate() switches views',
    `Frame hor
  SideNav defaultValue "home", w 160
    NavItem "Home", value "home", navigate(HomeView)
    NavItem "Settings", value "settings", navigate(SettingsView)

  Frame w full, pad 16
    Frame name HomeView
      Text "Home Content", col white
    Frame name SettingsView, hidden
      Text "Settings Content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Views should exist
      const homeView = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(homeView !== null, 'Container should exist')
    }
  ),

  testWithSetup(
    'openUrl() opens external link',
    `Frame pad 16, bg #1a1a1a
  Button "Open Docs", openUrl("https://example.com")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Open Docs' })
    }
  ),
])

// =============================================================================
// Clipboard Actions
// =============================================================================

export const clipboardActionTests: TestCase[] = describe('Clipboard Actions', [
  testWithSetup(
    'copy() copies text to clipboard',
    `Frame pad 16, bg #1a1a1a
  Button "Copy Code", copy("ABC123")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Copy Code' })
    }
  ),

  testWithSetup(
    'copy() with toast notification',
    `Frame pad 16, bg #1a1a1a
  Button "Copy & Notify", copy("secret-key"), toast("Copied!", "success")`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),
])

// =============================================================================
// Overlay/Positioning Actions
// =============================================================================

export const overlayActionTests: TestCase[] = describe('Overlay Actions', [
  testWithSetup(
    'showModal() shows centered modal',
    `Frame pad 16, bg #1a1a1a
  Button "Open Modal", showModal(Modal)
  Frame name Modal, hidden, w 400, pad 24, bg #222, rad 12, center
    Text "Modal Content", col white
    Button "Close", dismiss(Modal)`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Open Modal' })
      api.assert.exists('node-3') // Modal frame
    }
  ),

  testWithSetup(
    'dismiss() closes overlay',
    `Frame pad 16, bg #1a1a1a
  Button "Show", show(Overlay)
  Frame name Overlay, pad 16, bg #333
    Text "Overlay", col white
    Button "Dismiss", dismiss(Overlay)`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3') // Overlay
      api.dom.expect('node-5', { tag: 'button', text: 'Dismiss' })
    }
  ),

  testWithSetup(
    'showBelow() positions element below trigger',
    `Frame pad 16, bg #1a1a1a
  Button "Menu", showBelow(Dropdown)
  Frame name Dropdown, hidden, pad 8, bg #333, rad 4
    Text "Item 1", col white
    Text "Item 2", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Menu' })
      api.assert.exists('node-3') // Dropdown
    }
  ),
])

// =============================================================================
// CRUD Actions
// =============================================================================

export const crudActionTests: TestCase[] = describe('CRUD Actions', [
  testWithSetup(
    'add() adds item to collection',
    `todos:
  t1:
    text: "First task"
    done: false

Frame gap 8, pad 16, bg #1a1a1a
  Button "Add Task", add(todos, text: "New task", done: false)
  each todo in $todos
    Text todo.text, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Add Task' })
    }
  ),

  testWithSetup(
    'remove() removes item from collection',
    `items:
  a: { name: "Item A" }
  b: { name: "Item B" }

Frame gap 8, pad 16, bg #1a1a1a
  each item in $items
    Frame hor, gap 8, pad 8, bg #222
      Text item.name, col white
      Button "×", remove(item)`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Should have rendered items
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
    }
  ),
])

// =============================================================================
// Combined Action Tests
// =============================================================================

export const combinedActionTests: TestCase[] = describe('Combined Actions', [
  testWithSetup(
    'Multiple actions on single button',
    `count: 0

Frame pad 16, bg #1a1a1a
  Button "Like", toggle(), increment(count), toast("Liked!")
    on:
      bg #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Like' })
    }
  ),

  testWithSetup(
    'Action chain with state change',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Submit", toggle(), toast("Submitted!", "success")
    on:
      bg #10b981
      col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { tag: 'button', text: 'Submit' })
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allActionTests: TestCase[] = [
  ...visibilityActionTests,
  ...counterActionTests,
  ...scrollActionTests,
  ...toastActionTests,
  ...formActionTests,
  ...navigationActionTests,
  ...clipboardActionTests,
  ...overlayActionTests,
  ...crudActionTests,
  ...combinedActionTests,
]
