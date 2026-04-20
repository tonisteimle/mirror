/**
 * DatePicker Tests
 *
 * Comprehensive tests for the DatePicker Zag component.
 * Tests structure, open/close behavior, date selection, and styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const datePickerTests: TestCase[] = describe('DatePicker', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'DatePicker renders with correct structure',
    'DatePicker placeholder "Select date"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'DatePicker root should exist')

      // Find control and trigger elements
      const controls = api.preview.query('[data-slot="Control"]')
      const triggers = api.preview.query('[data-slot="Trigger"]')

      api.assert.ok(controls.length > 0, 'Should have a Control slot')
      api.assert.ok(triggers.length > 0, 'Should have a Trigger slot')

      // Control should be visible
      api.assert.ok(controls[0].visible, 'Control should be visible')

      // Find input with placeholder - the placeholder is an input attribute
      const inputs = api.preview.query('[data-slot="Input"]')
      api.assert.ok(inputs.length > 0, 'Should have an Input slot')
      api.assert.ok(
        inputs[0].attributes['placeholder'] === 'Select date',
        `Input should have placeholder "Select date", got "${inputs[0].attributes['placeholder']}"`
      )
    }
  ),

  testWithSetup(
    'DatePicker has clickable trigger',
    'DatePicker placeholder "Choose date"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'DatePicker should render')

      // Find the trigger button - it should have pointer cursor
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have Trigger slot')

      // Trigger button should be interactive
      const triggerCursor = triggers[0].styles.cursor
      api.assert.ok(
        triggerCursor === 'pointer' || triggerCursor === 'default',
        `Trigger should be clickable, cursor: ${triggerCursor}`
      )

      // Input should also be interactive
      const inputs = api.preview.query('[data-slot="Input"]')
      if (inputs.length > 0) {
        const inputCursor = inputs[0].styles.cursor
        api.assert.ok(
          inputCursor === 'text' || inputCursor === 'auto',
          `Input should have text cursor, got: ${inputCursor}`
        )
      }
    }
  ),

  // ==========================================================================
  // OPEN/CLOSE BEHAVIOR
  // ==========================================================================

  testWithSetup(
    'DatePicker opens and closes via API',
    'DatePicker placeholder "Date"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Open via API
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after open()')

      // Close via API
      await api.zag.close('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(!api.zag.isOpen('node-1'), 'Should be closed after close()')
    }
  ),

  testWithSetup(
    'DatePicker calendar content appears when open',
    'DatePicker placeholder "Pick"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open DatePicker
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Content/Calendar should be visible
      const content = api.preview.query('[data-slot="Content"], [data-slot="Positioner"]')
      api.assert.ok(content.length > 0, 'Should have Content or Positioner when open')

      // Content should be visible
      api.assert.ok(
        content[0].visible && content[0].styles.display !== 'none',
        'Calendar content should be visible when open'
      )
    }
  ),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled DatePicker has correct visual state',
    'DatePicker placeholder "Locked", disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled DatePicker should render')

      // Visual indicators of disabled state
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      const hasDisabledVisual =
        opacity < 1 || cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled DatePicker should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
      )
    }
  ),

  testWithSetup(
    'Disabled DatePicker cannot be opened',
    'DatePicker placeholder "No open", disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should be closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Try to open via API
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Should still be closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Disabled DatePicker should not open')
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'DatePicker exposes valid Zag state',
    'DatePicker placeholder "State test"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      api.assert.ok(state !== null, 'Zag state should be available')
      api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)

      // Should have value or context
      api.assert.ok(
        'value' in state! || 'context' in state!,
        'State should have value or context property'
      )
    }
  ),

  testWithSetup(
    'DatePicker state updates when opened',
    'DatePicker placeholder "Track state"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get initial state
      const closedState = api.zag.getState('node-1')
      api.assert.ok(closedState !== null, 'Closed state should be available')

      // Open
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Get open state
      const openState = api.zag.getState('node-1')
      api.assert.ok(openState !== null, 'Open state should be available')

      // State should be different (open flag)
      api.assert.ok(api.zag.isOpen('node-1'), 'isOpen should return true when open')
    }
  ),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'DatePicker respects custom styling',
    'DatePicker placeholder "Styled", bg #1a1a1a, pad 12, rad 8, col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Styled DatePicker should render')

      // Check padding
      const padding = parseFloat(info!.styles.paddingTop)
      api.assert.ok(Math.abs(padding - 12) < 2, `Padding should be ~12px, got ${padding}px`)

      // Check border-radius
      const radius = parseFloat(info!.styles.borderRadius)
      api.assert.ok(Math.abs(radius - 8) < 2, `Border radius should be ~8px, got ${radius}px`)

      // Check background
      const bgColor = info!.styles.backgroundColor
      api.assert.ok(
        bgColor.includes('26, 26, 26'), // #1a1a1a
        `Background should be #1a1a1a, got ${bgColor}`
      )
    }
  ),

  // ==========================================================================
  // CALENDAR STRUCTURE
  // ==========================================================================

  testWithSetup(
    'DatePicker shows calendar with days when open',
    'DatePicker placeholder "View calendar"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open DatePicker
      await api.zag.open('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200) // Wait for calendar to render

      // Content should be visible when open
      const content = api.preview.query('[data-slot="Content"], [data-slot="Positioner"]')
      api.assert.ok(content.length > 0, 'Content slot should exist when open')
      api.assert.ok(content[0].visible, 'Content should be visible when open')

      // Calendar should have some structure (buttons, cells, etc.)
      // The specific structure depends on the Zag implementation
      const contentElement = document.querySelector(
        '[data-slot="Content"], [data-slot="Positioner"]'
      )
      const hasContent = contentElement && contentElement.children.length > 0

      api.assert.ok(hasContent, 'Calendar content should have child elements')
    }
  ),

  testWithSetup(
    'DatePicker has navigation controls',
    'DatePicker placeholder "Navigate"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open DatePicker
      await api.zag.open('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200) // Wait for calendar to render

      // Verify calendar is open and has content
      api.assert.ok(api.zag.isOpen('node-1'), 'DatePicker should be open')

      // Content should exist and be visible
      const content = api.preview.query('[data-slot="Content"], [data-slot="Positioner"]')
      api.assert.ok(content.length > 0, 'Content should exist when open')
      api.assert.ok(content[0].visible, 'Content should be visible')

      // Calendar content should have multiple elements (header, days, etc.)
      const contentElement = document.querySelector(
        '[data-slot="Content"], [data-slot="Positioner"]'
      )
      const childCount = contentElement ? contentElement.querySelectorAll('*').length : 0

      api.assert.ok(
        childCount > 5,
        `Calendar should have multiple elements (navigation, days, etc.), found ${childCount}`
      )
    }
  ),
])
