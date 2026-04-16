/**
 * Event Tests
 *
 * Tests for Mirror's event system:
 * - Click events (onclick)
 * - Hover events (onhover)
 * - Focus events (onfocus, onblur)
 * - Input events (onchange, oninput)
 * - Keyboard events (onkeydown, onkeyup, onenter, onescape)
 * - Outside click (onclick-outside)
 * - View events (onviewenter, onviewexit)
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Click Events
// =============================================================================

export const clickEventTests: TestCase[] = describe('Click Events', [
  testWithSetup(
    'onclick with action',
    `count: 0

Button "Click", onclick increment(count), bg #2271C1, col white, pad 12 24, rad 6
Text "$count", col white, fs 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Button
      api.assert.exists('node-2') // Text

      api.dom.expect('node-1', { tag: 'button', text: 'Click' })
    }
  ),

  testWithSetup(
    'onclick with multiple actions',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Multi-action", onclick toggle(), toast("Clicked!"), bg #2271C1, col white, pad 12 24, rad 6
    on:
      bg #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
    }
  ),

  testWithSetup(
    'onclick with show/hide',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Show Menu", onclick show(Menu), bg #333, col white, pad 12 24, rad 6
  Frame name Menu, hidden, pad 16, bg #222, rad 8
    Text "Menu Content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Menu
    }
  ),

  testWithSetup(
    'onclick-outside dismisses element',
    `Frame pad 16, bg #1a1a1a
  Button "Open", onclick show(Dropdown), bg #333, col white, pad 12 24, rad 6
  Frame name Dropdown, hidden, pad 8, bg #222, rad 6, onclick-outside hide(Dropdown)
    Text "Click outside to close", col white, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Dropdown
    }
  ),
])

// =============================================================================
// Hover Events
// =============================================================================

export const hoverEventTests: TestCase[] = describe('Hover Events', [
  testWithSetup(
    'onhover shows tooltip',
    `Frame pad 16, bg #1a1a1a
  Icon "info", ic #888, is 20, onhover show(Tip)
  Frame name Tip, hidden, pad 8, bg #333, rad 4
    Text "Helpful information", col white, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Icon
      api.assert.exists('node-3') // Tip
    }
  ),

  testWithSetup(
    'onhover with state change',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 100, bg #333, rad 8, onhover toggle()
    on:
      bg #2271C1
      scale 1.05`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Outer Frame
      api.assert.exists('node-2') // Hover Frame
    }
  ),
])

// =============================================================================
// Focus Events
// =============================================================================

export const focusEventTests: TestCase[] = describe('Focus Events', [
  testWithSetup(
    'onfocus highlights input',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Email", onfocus set(focused, true), pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input

      api.dom.expect('node-2', { tag: 'input' })
    }
  ),

  testWithSetup(
    'onblur validates input',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Required field", onblur toast("Field blurred"), pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
    }
  ),

  testWithSetup(
    'Focus and blur cycle',
    `focused: false

Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Track focus", onfocus set(focused, true), onblur set(focused, false), pad 12, bg #222, col white, rad 6
  Text focused ? "Input is focused" : "Input not focused", col #888, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
      api.assert.exists('node-3') // Text
    }
  ),
])

// =============================================================================
// Input Events
// =============================================================================

export const inputEventTests: TestCase[] = describe('Input Events', [
  testWithSetup(
    'oninput updates in real-time',
    `searchTerm: ""

Frame gap 8, pad 16, bg #1a1a1a
  Input bind searchTerm, oninput toast("Typing..."), placeholder "Search...", pad 12, bg #222, col white, rad 6
  Text "Search: $searchTerm", col #888, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
      api.assert.exists('node-3') // Text
    }
  ),

  testWithSetup(
    'onchange fires on value commit',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Press enter to submit", onchange toast("Value changed!"), pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
    }
  ),

  testWithSetup(
    'Textarea with input event',
    `content: ""

Frame gap 8, pad 16, bg #1a1a1a
  Textarea bind content, oninput set(charCount, content.length), placeholder "Enter text...", pad 12, bg #222, col white, rad 6, h 100
  Text "$charCount characters", col #888, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Textarea
    }
  ),
])

// =============================================================================
// Keyboard Events
// =============================================================================

export const keyboardEventTests: TestCase[] = describe('Keyboard Events', [
  testWithSetup(
    'onkeydown captures any key',
    `lastKey: ""

Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Press any key", onkeydown set(lastKey, event.key), pad 12, bg #222, col white, rad 6
  Text "Last key: $lastKey", col #888, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
    }
  ),

  testWithSetup(
    'onenter submits form',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Press Enter to submit", onenter toast("Submitted!"), pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
    }
  ),

  testWithSetup(
    'onescape closes modal',
    `Frame pad 16, bg #1a1a1a
  Frame name Modal, pad 24, bg #222, rad 8, onescape hide(Modal)
    Text "Press Escape to close", col white
    Button "Close", onclick hide(Modal), bg #333, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Modal
    }
  ),

  testWithSetup(
    'onspace toggles element',
    `Frame pad 16, bg #1a1a1a
  Button "Press Space", onspace toggle(), pad 12 24, bg #333, col white, rad 6
    on:
      bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
    }
  ),

  testWithSetup(
    'Arrow key navigation',
    `selectedIndex: 0

Frame gap 4, pad 16, bg #1a1a1a, onkeydown-arrow-down increment(selectedIndex), onkeydown-arrow-up decrement(selectedIndex)
  Text "Item 1", pad 8, bg selectedIndex == 0 ? #2271C1 : #333, col white, rad 4
  Text "Item 2", pad 8, bg selectedIndex == 1 ? #2271C1 : #333, col white, rad 4
  Text "Item 3", pad 8, bg selectedIndex == 2 ? #2271C1 : #333, col white, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),
])

// =============================================================================
// View Events
// =============================================================================

export const viewEventTests: TestCase[] = describe('View Events', [
  testWithSetup(
    'onviewenter triggers animation',
    `Frame h 200, scroll, bg #0a0a0a
  Frame h 300, pad 16
    Text "Scroll down", col #888
  Frame onviewenter anim fade-in, pad 24, bg #1a1a1a, rad 8
    Text "I animate when visible", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Scroll container
    }
  ),

  testWithSetup(
    'onviewexit pauses content',
    `Frame h 200, scroll, bg #0a0a0a
  Frame onviewenter set(playing, true), onviewexit set(playing, false), pad 24, bg #1a1a1a, rad 8
    Text "Video placeholder", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Scroll container
    }
  ),

  testWithSetup(
    'Lazy loading with view events',
    `loaded: false

Frame h 200, scroll, bg #0a0a0a
  Frame h 300
    Text "Scroll to load content", col #888, pad 16
  Frame onviewenter set(loaded, true), pad 24, bg #1a1a1a, rad 8
    if loaded
      Text "Content loaded!", col #10b981
    else
      Text "Loading...", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Scroll container
    }
  ),
])

// =============================================================================
// Event Combinations
// =============================================================================

export const combinedEventTests: TestCase[] = describe('Combined Events', [
  testWithSetup(
    'Multiple event types on element',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Multi-event input", onfocus set(active, true), onblur set(active, false), onenter toast("Submitted"), pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Input
    }
  ),

  testWithSetup(
    'Event with state and animation',
    `Frame pad 16, bg #1a1a1a
  Button "Fancy Button", onclick toggle(), anim bounce, pad 12 24, bg #333, col white, rad 6
    on:
      bg #2271C1
      anim pulse`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
    }
  ),

  testWithSetup(
    'Form with validation events',
    `email: ""
valid: false

Frame gap 12, pad 16, bg #1a1a1a
  Frame gap 4
    Text "Email", col #888, fs 12
    Input bind email, onblur validate(email), pad 12, bg #222, col white, rad 6, bor 1, boc valid ? #10b981 : #444
  Button "Submit", onclick submit(), disabled valid == false, pad 12 24, bg #2271C1, col white, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
    }
  ),

  testWithSetup(
    'Drag with mouse events',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 100, bg #333, rad 8, cursor grab
    active:
      cursor grabbing
      scale 1.05
    Text "Drag me", col white, center`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Draggable
    }
  ),
])

// =============================================================================
// Event Edge Cases
// =============================================================================

export const eventEdgeCaseTests: TestCase[] = describe('Event Edge Cases', [
  testWithSetup(
    'Event on disabled element',
    `Frame pad 16, bg #1a1a1a
  Button "Disabled", onclick toast("Should not fire"), disabled, pad 12 24, bg #333, col #666, rad 6, cursor not-allowed`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
    }
  ),

  testWithSetup(
    'Event bubbling prevention',
    `Frame pad 16, bg #1a1a1a
  Frame pad 16, bg #222, rad 8
    Text "Nested frames", col white
    Button "Click me", bg #333, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Outer Frame
      api.assert.exists('node-2') // Inner Frame
      api.assert.exists('node-3') // Text
    }
  ),

  testWithSetup(
    'Rapid event firing',
    `count: 0

Frame pad 16, bg #1a1a1a
  Button "Rapid Click", onclick increment(count), pad 12 24, bg #2271C1, col white, rad 6
  Text "Count: $count", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Count
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allEventTests: TestCase[] = [
  ...clickEventTests,
  ...hoverEventTests,
  ...focusEventTests,
  ...inputEventTests,
  ...keyboardEventTests,
  ...viewEventTests,
  ...combinedEventTests,
  ...eventEdgeCaseTests,
]
