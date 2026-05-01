/**
 * Compiler Verification — Functions (Toggle, Counter, Navigation, Feedback, Form Control, Combined)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 28. Functions - Toggle & Visibility
// =============================================================================

export const functionToggleTests: TestCase[] = describe('Functions: Toggle & Visibility', [
  testWithSetup(
    'Toggle function on button',
    `Button "Toggle State", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1
    Text "Active"`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(btn.tagName === 'button', 'Should be a button')
    }
  ),

  testWithSetup(
    'Show/Hide target element',
    `Frame gap 16, pad 16, bg #1a1a1a
  Button "Toggle Menu", bg #2271C1, col white, pad 10 20, rad 6, toggle()
  Frame name Menu, pad 12, bg #333, rad 8, hidden
    Text "Menu Item 1", col white
    Text "Menu Item 2", col white
    Text "Menu Item 3", col white`,
    async (api: TestAPI) => {
      const button = api.preview.findByText('Toggle Menu')
      api.assert.ok(button !== null, 'Toggle button should exist')

      // Menu should exist (even if hidden)
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 2, 'Should have button and menu')
    }
  ),

  testWithSetup(
    'Exclusive toggle (radio-like)',
    `Frame hor, gap 0, bg #1a1a1a, rad 8, pad 4
  Button "Day", pad 8 16, col #888, rad 6, exclusive(), selected
    selected:
      bg #2271C1
      col white
  Button "Week", pad 8 16, col #888, rad 6, exclusive()
    selected:
      bg #2271C1
      col white
  Button "Month", pad 8 16, col #888, rad 6, exclusive()
    selected:
      bg #2271C1
      col white`,
    async (api: TestAPI) => {
      const day = api.preview.findByText('Day')
      const week = api.preview.findByText('Week')
      const month = api.preview.findByText('Month')

      api.assert.ok(day !== null, 'Day button should exist')
      api.assert.ok(week !== null, 'Week button should exist')
      api.assert.ok(month !== null, 'Month button should exist')
    }
  ),
])

// =============================================================================
// 29. Functions - Counter Operations
// =============================================================================

export const functionCounterTests: TestCase[] = describe('Functions: Counters', [
  testWithSetup(
    'Increment/Decrement counter',
    `count: 0

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      const minus = api.preview.findByText('-')
      const plus = api.preview.findByText('+')

      api.assert.ok(minus !== null, 'Minus button should exist')
      api.assert.ok(plus !== null, 'Plus button should exist')
    }
  ),

  testWithSetup(
    'Counter with set and reset',
    `value: 50

Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Value: $value", col white, fs 18
  Frame hor, gap 8
    Button "Set to 100", bg #2271C1, col white, pad 8 16, rad 6, set(value, 100)
    Button "Reset", bg #ef4444, col white, pad 8 16, rad 6, reset(value)`,
    async (api: TestAPI) => {
      const setBtn = api.preview.findByText('Set to 100')
      const resetBtn = api.preview.findByText('Reset')

      api.assert.ok(setBtn !== null, 'Set button should exist')
      api.assert.ok(resetBtn !== null, 'Reset button should exist')
    }
  ),

  testWithSetup(
    'Multiple counters',
    `likes: 42
comments: 8
shares: 3

Frame hor, gap 24, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 8, ver-center
    Icon "heart", ic #ef4444, is 20
    Text "$likes", col white
    Button "+", bg transparent, col #888, pad 4 8, increment(likes)
  Frame hor, gap 8, ver-center
    Icon "message-circle", ic #2271C1, is 20
    Text "$comments", col white
  Frame hor, gap 8, ver-center
    Icon "share", ic #10b981, is 20
    Text "$shares", col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(container.children.length === 3, 'Should have 3 stat groups')
    }
  ),
])

// =============================================================================
// 30. Functions - Navigation
// =============================================================================

export const functionNavigationTests: TestCase[] = describe('Functions: Navigation', [
  testWithSetup(
    'Navigate to view',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Go to Home", bg #2271C1, col white, pad 12 24, rad 6, navigate(HomeView)
  Button "Go to Settings", bg #333, col white, pad 12 24, rad 6, navigate(SettingsView)
  Button "Go Back", bg #333, col white, pad 12 24, rad 6, back()`,
    async (api: TestAPI) => {
      const home = api.preview.findByText('Go to Home')
      const settings = api.preview.findByText('Go to Settings')
      const back = api.preview.findByText('Go Back')

      api.assert.ok(home !== null, 'Home nav button should exist')
      api.assert.ok(settings !== null, 'Settings nav button should exist')
      api.assert.ok(back !== null, 'Back button should exist')
    }
  ),

  testWithSetup(
    'Open external URL',
    `Frame hor, gap 8, pad 16, bg #1a1a1a
  Button "Visit Website", bg #2271C1, col white, pad 10 20, rad 6, openUrl("https://example.com")
  Button "Documentation", bg #333, col white, pad 10 20, rad 6, openUrl("https://docs.example.com")`,
    async (api: TestAPI) => {
      const visit = api.preview.findByText('Visit Website')
      const docs = api.preview.findByText('Documentation')

      api.assert.ok(visit !== null, 'Visit button should exist')
      api.assert.ok(docs !== null, 'Docs button should exist')
    }
  ),

  testWithSetup(
    'Scroll functions',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Scroll to Top", bg #333, col white, pad 10 20, rad 6, scrollToTop()
  Button "Scroll to Section", bg #333, col white, pad 10 20, rad 6, scrollTo(Section2)
  Button "Scroll to Bottom", bg #333, col white, pad 10 20, rad 6, scrollToBottom()`,
    async (api: TestAPI) => {
      const top = api.preview.findByText('Scroll to Top')
      const section = api.preview.findByText('Scroll to Section')
      const bottom = api.preview.findByText('Scroll to Bottom')

      api.assert.ok(top !== null, 'Scroll top button should exist')
      api.assert.ok(section !== null, 'Scroll section button should exist')
      api.assert.ok(bottom !== null, 'Scroll bottom button should exist')
    }
  ),
])

// =============================================================================
// 31. Functions - Feedback & Toast
// =============================================================================

export const functionFeedbackTests: TestCase[] = describe('Functions: Feedback', [
  testWithSetup(
    'Toast notifications',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Success Toast", bg #10b981, col white, pad 10 20, rad 6, toast("Saved!")
  Button "Error Toast", bg #ef4444, col white, pad 10 20, rad 6, toast("Error!")
  Button "Warning Toast", bg #f59e0b, col white, pad 10 20, rad 6, toast("Warning!")
  Button "Info Toast", bg #2271C1, col white, pad 10 20, rad 6, toast("Info!")`,
    async (api: TestAPI) => {
      const success = api.preview.findByText('Success Toast')
      const error = api.preview.findByText('Error Toast')
      const warning = api.preview.findByText('Warning Toast')
      const info = api.preview.findByText('Info Toast')

      api.assert.ok(success !== null, 'Success toast button should exist')
      api.assert.ok(error !== null, 'Error toast button should exist')
      api.assert.ok(warning !== null, 'Warning toast button should exist')
      api.assert.ok(info !== null, 'Info toast button should exist')
    }
  ),

  testWithSetup(
    'Copy to clipboard',
    `Frame gap 8, pad 16, bg #1a1a1a
  Frame hor, gap 8, ver-center
    Input value "https://example.com/share/abc123", bg #333, col white, pad 12, rad 6, w 300, readonly
    Button "Copy", bg #2271C1, col white, pad 12 16, rad 6, copy("https://example.com/share/abc123"), toast("Copied!", "success")`,
    async (api: TestAPI) => {
      const copyBtn = api.preview.findByText('Copy')
      api.assert.ok(copyBtn !== null, 'Copy button should exist')
    }
  ),
])

// =============================================================================
// 32. Functions - Form Control
// =============================================================================

export const functionFormControlTests: TestCase[] = describe('Functions: Form Control', [
  testWithSetup(
    'Focus and clear input',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Input name SearchInput, placeholder "Search...", bg #333, col white, pad 12, rad 6, w full
  Frame hor, gap 8
    Button "Focus", bg #2271C1, col white, pad 8 16, rad 6, focus(SearchInput)
    Button "Clear", bg #333, col white, pad 8 16, rad 6, clear(SearchInput)`,
    async (api: TestAPI) => {
      const focusBtn = api.preview.findByText('Focus')
      const clearBtn = api.preview.findByText('Clear')

      api.assert.ok(focusBtn !== null, 'Focus button should exist')
      api.assert.ok(clearBtn !== null, 'Clear button should exist')
    }
  ),

  testWithSetup(
    'Form with validation feedback',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Email", col #888, fs 12
    Input name EmailField, placeholder "Enter email...", bg #333, col white, pad 12, rad 6, w full
  Frame hor, gap 8
    Button "Validate", bg #2271C1, col white, pad 10 16, rad 6
    Button "Show Error", bg #ef4444, col white, pad 10 16, rad 6, setError(EmailField, "Invalid email format")
    Button "Clear Error", bg #333, col white, pad 10 16, rad 6, clearError(EmailField)`,
    async (api: TestAPI) => {
      const validate = api.preview.findByText('Validate')
      const showError = api.preview.findByText('Show Error')
      const clearError = api.preview.findByText('Clear Error')

      api.assert.ok(validate !== null, 'Validate button should exist')
      api.assert.ok(showError !== null, 'Show Error button should exist')
      api.assert.ok(clearError !== null, 'Clear Error button should exist')
    }
  ),

  testWithSetup(
    'Form submit and reset',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 350
  Frame gap 8
    Input placeholder "Name", bg #333, col white, pad 12, rad 6, w full
    Input placeholder "Email", bg #333, col white, pad 12, rad 6, w full
    Textarea placeholder "Message", bg #333, col white, pad 12, rad 6, w full, h 80
  Frame hor, gap 8, spread
    Button "Reset", bg #333, col white, pad 10 20, rad 6, reset()
    Button "Submit", bg #10b981, col white, pad 10 20, rad 6, submit()`,
    async (api: TestAPI) => {
      const resetBtn = api.preview.findByText('Reset')
      const submitBtn = api.preview.findByText('Submit')

      api.assert.ok(resetBtn !== null, 'Reset button should exist')
      api.assert.ok(submitBtn !== null, 'Submit button should exist')
    }
  ),
])

// =============================================================================
// 33. Functions - Combined Actions
// =============================================================================

export const functionCombinedTests: TestCase[] = describe('Functions: Combined Actions', [
  testWithSetup(
    'Multiple functions on click',
    `likes: 0

Button "Like", bg #333, col white, pad 12 24, rad 6, hor, gap 8, toggle(), increment(likes), toast("Liked!", "success")
  Icon "heart", ic #888, is 18
  Text "Like"
  on:
    bg #ef4444
    Icon "heart", ic white, is 18, fill
    Text "Liked"`,
    async (api: TestAPI) => {
      const btn = api.preview.findByText('Like')
      api.assert.ok(btn !== null, 'Like button should exist')
    }
  ),

  testWithSetup(
    'Action with state change',
    `isSubscribed: false

Button isSubscribed ? "Unsubscribe" : "Subscribe", bg isSubscribed ? #333 : #2271C1, col white, pad 12 24, rad 6, toggle()`,
    async (api: TestAPI) => {
      // Should render with initial state
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Button should render')
    }
  ),

  testWithSetup(
    'Complete interaction flow',
    `items: 0
total: 0

Frame gap 16, pad 16, bg #1a1a1a, rad 8
  Text "Shopping Cart", col white, fs 18, weight bold
  Frame hor, gap 8, ver-center
    Text "Items: $items", col #888
    Text "Total: $total €", col white, weight 500
  Frame hor, gap 8
    Button "Add Item", bg #10b981, col white, pad 10 16, rad 6, increment(items), increment(total, 10), toast("Item added!")
    Button "Remove Item", bg #ef4444, col white, pad 10 16, rad 6, decrement(items), decrement(total, 10)
    Button "Clear Cart", bg #333, col white, pad 10 16, rad 6, reset(items), reset(total), toast("Cart cleared")`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Shopping Cart')
      const addBtn = api.preview.findByText('Add Item')
      const removeBtn = api.preview.findByText('Remove Item')
      const clearBtn = api.preview.findByText('Clear Cart')

      api.assert.ok(title !== null, 'Title should exist')
      api.assert.ok(addBtn !== null, 'Add button should exist')
      api.assert.ok(removeBtn !== null, 'Remove button should exist')
      api.assert.ok(clearBtn !== null, 'Clear button should exist')
    }
  ),
])
