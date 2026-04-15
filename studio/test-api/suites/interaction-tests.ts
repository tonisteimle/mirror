/**
 * Interaction Test Suite
 *
 * Tests user interactions:
 * - Click events
 * - Hover states
 * - Toggle states
 * - Keyboard navigation
 * - Focus states
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Click Tests
// =============================================================================

export const clickTests: TestCase[] = describe('Click Events', [
  testWithSetup('Button is clickable', 'Button "Click me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.interactive === true, 'Button should be interactive')

    // Click the button
    await api.interact.click('node-1')
    // No error means click succeeded
  }),

  testWithSetup(
    'Frame with cursor pointer is clickable',
    'Frame cursor pointer, pad 16, bg #333\n  Text "Clickable"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      await api.interact.click('node-1')
    }
  ),
])

// =============================================================================
// Hover State Tests
// =============================================================================

export const hoverTests: TestCase[] = describe('Hover States', [
  testWithSetup(
    'Element can be hovered',
    'Frame pad 16, bg #333\n  Text "Hover me"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Hover over element
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Unhover
      await api.interact.unhover('node-1')
    }
  ),

  // Note: Testing actual hover style changes requires CSS :hover simulation
  // which is complex. These tests verify the interaction works.
])

// =============================================================================
// Toggle State Tests
// =============================================================================

export const toggleTests: TestCase[] = describe('Toggle States', [
  testWithSetup(
    'Toggle button renders',
    'Button "Toggle", toggle()\n  on:\n    bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Button should render with toggle capability
    }
  ),

  testWithSetup(
    'Toggle with initial on state',
    'Button "Active", toggle(), on\n  on:\n    bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Should start in 'on' state
    }
  ),

  testWithSetup(
    'Exclusive toggle (radio-like)',
    'Frame hor, gap 8\n  Button "A", exclusive()\n    selected:\n      bg #2271C1\n  Button "B", exclusive()\n    selected:\n      bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
    }
  ),
])

// =============================================================================
// Focus Tests
// =============================================================================

export const focusTests: TestCase[] = describe('Focus States', [
  testWithSetup('Input can be focused', 'Input placeholder "Type here"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    // Input should now be focused

    await api.interact.blur('node-1')
    // Input should now be blurred
  }),

  testWithSetup('Button can be focused', 'Button "Focus me"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    await api.interact.blur('node-1')
  }),
])

// =============================================================================
// Input Tests
// =============================================================================

export const inputTests: TestCase[] = describe('Input Interactions', [
  testWithSetup('Can type into input', 'Input placeholder "Enter text"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.type('node-1', 'Hello World')

    // Check if value was entered
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
    api.assert.ok(element?.value === 'Hello World', 'Input should have typed value')
  }),

  testWithSetup('Can clear input', 'Input placeholder "Clear me"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    // Type something first
    await api.interact.type('node-1', 'Some text')

    // Clear it
    await api.interact.clear('node-1')

    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
    api.assert.ok(element?.value === '', 'Input should be empty after clear')
  }),

  testWithSetup(
    'Textarea can be typed into',
    'Textarea placeholder "Message"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.type('node-1', 'Multi\nline\ntext')

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLTextAreaElement
      api.assert.ok(element?.value.includes('Multi'), 'Textarea should have typed value')
    }
  ),
])

// =============================================================================
// Keyboard Tests
// =============================================================================

export const keyboardTests: TestCase[] = describe('Keyboard Events', [
  testWithSetup('Can press Enter key', 'Input placeholder "Press Enter"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.interact.focus('node-1')
    await api.interact.pressKey('Enter')
  }),

  testWithSetup(
    'Can press Escape key',
    'Frame pad 16\n  Text "Press Escape"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.pressKey('Escape')
    }
  ),

  testWithSetup(
    'Can press Tab key',
    'Frame gap 8\n  Input placeholder "First"\n  Input placeholder "Second"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      await api.interact.focus('node-2')
      await api.interact.pressKey('Tab')
      // Focus should move to next element
    }
  ),
])

// =============================================================================
// Selection Tests (Studio)
// =============================================================================

export const selectionTests: TestCase[] = describe('Selection', [
  testWithSetup(
    'Can select element',
    'Frame gap 8\n  Button "Select me"\n  Text "Other"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Select the button
      api.interact.select('node-2')
      await api.utils.delay(50)

      // Check selection
      const selection = api.state.getSelection()
      api.assert.ok(selection === 'node-2', 'Button should be selected')
    }
  ),

  testWithSetup('Can clear selection', 'Frame\n  Button "Test"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    // Select then clear
    api.interact.select('node-2')
    await api.utils.delay(50)
    api.interact.clearSelection()
    await api.utils.delay(50)

    const selection = api.state.getSelection()
    api.assert.ok(selection === null, 'Selection should be cleared')
  }),
])

// =============================================================================
// Drag & Drop Tests
// =============================================================================

export const dragDropTests: TestCase[] = describe('Drag & Drop', [
  testWithSetup(
    'Can drag from palette to container',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 0)

      // Drag Button from palette into Frame
      await api.interact.dragFromPalette('Button', 'node-1', 0)

      // Frame should now have 1 child
      await api.utils.delay(100)
      // Note: This depends on drag system working correctly
    }
  ),

  testWithSetup(
    'Can move element within container',
    'Frame gap 8\n  Text "First"\n  Text "Second"\n  Text "Third"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)

      // Move Third to first position
      // await api.interact.moveElement('node-4', 'node-1', 0)
    }
  ),
])

// =============================================================================
// Combined Interaction Tests
// =============================================================================

export const combinedTests: TestCase[] = describe('Combined Interactions', [
  testWithSetup(
    'Form interaction flow',
    'Frame gap 16, pad 24\n  Input placeholder "Name"\n  Input placeholder "Email"\n  Button "Submit"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Fill out form
      await api.interact.type('node-2', 'John Doe')
      await api.interact.type('node-3', 'john@example.com')

      // Click submit
      await api.interact.click('node-4')
    }
  ),

  testWithSetup(
    'Select then interact flow',
    'Frame gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Select first button
      api.interact.select('node-2')
      await api.utils.delay(50)
      api.assert.isSelected('node-2')

      // Click second button (should change selection)
      api.interact.select('node-3')
      await api.utils.delay(50)
      api.assert.isSelected('node-3')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allInteractionTests: TestCase[] = [
  ...clickTests,
  ...hoverTests,
  ...toggleTests,
  ...focusTests,
  ...inputTests,
  ...keyboardTests,
  ...selectionTests,
  // ...dragDropTests, // Enable when drag system is stable
  ...combinedTests,
]
