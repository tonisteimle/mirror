/**
 * Select Tests
 *
 * Comprehensive tests for the Select Zag component.
 * Tests structure, options, selection, keyboard navigation, and disabled states.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const selectTests: TestCase[] = describe('Select', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Select renders with trigger and placeholder',
    'Select placeholder "Choose..."',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Select root should exist')

      // Find trigger element
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have a Trigger slot')

      const trigger = triggers[0]

      // Trigger should be visible
      api.assert.ok(trigger.visible, 'Trigger should be visible')

      // Trigger should display placeholder
      api.assert.ok(
        trigger.fullText.includes('Choose'),
        `Trigger should show placeholder "Choose...", got "${trigger.fullText}"`
      )

      // Should be closed by default
      api.assert.ok(!api.zag.isOpen('node-1'), 'Select should be closed by default')

      // Trigger should have pointer cursor
      api.assert.ok(
        trigger.styles.cursor === 'pointer',
        `Trigger should have pointer cursor, got ${trigger.styles.cursor}`
      )
    }
  ),

  testWithSetup(
    'Select renders options correctly',
    'Select placeholder "City"\n  Option "Berlin"\n  Option "Hamburg"\n  Option "München"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get options from API
      const options = api.zag.getOptions('node-1')

      // Should have exactly 3 options
      api.assert.ok(
        options.length === 3,
        `Should have exactly 3 options, got ${options.length}: [${options.join(', ')}]`
      )

      // Options should match our defined values
      api.assert.ok(options.includes('Berlin'), 'Options should include "Berlin"')
      api.assert.ok(options.includes('Hamburg'), 'Options should include "Hamburg"')
      api.assert.ok(options.includes('München'), 'Options should include "München"')
    }
  ),

  // ==========================================================================
  // INITIAL STATE
  // ==========================================================================

  testWithSetup(
    'Select has no initial selection',
    'Select placeholder "Pick one"\n  Option "A"\n  Option "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const selected = api.zag.getSelectedOption('node-1')

      // Should be null or empty
      api.assert.ok(
        selected === null || selected === '' || selected === undefined,
        `Should have no initial selection, got "${selected}"`
      )

      // Trigger should show placeholder, not option text
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Trigger slot should exist')
      api.assert.ok(
        triggers[0].fullText.includes('Pick one'),
        `Trigger should show placeholder when nothing selected, got "${triggers[0].fullText}"`
      )
    }
  ),

  // ==========================================================================
  // OPEN/CLOSE BEHAVIOR
  // ==========================================================================

  testWithSetup(
    'Select opens and closes correctly',
    'Select placeholder "Test"\n  Option "First"\n  Option "Second"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Open via API
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after open()')

      // Content should be visible when open
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Content slot should exist when open')
      api.assert.ok(
        content[0].visible || content[0].styles.display !== 'none',
        'Content should be visible when open'
      )

      // Close via API
      await api.zag.close('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(!api.zag.isOpen('node-1'), 'Should be closed after close()')
    }
  ),

  testWithSetup(
    'Select opens on trigger click',
    'Select placeholder "Click me"\n  Option "Option 1"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Click the trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have trigger to click')

      await api.interact.click('node-1')
      await api.utils.waitForIdle()

      // Should now be open
      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after clicking trigger')
    }
  ),

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  testWithSetup(
    'Select option updates selection and trigger text',
    'Select placeholder "City"\n  Option "Berlin"\n  Option "Hamburg"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open select
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Select an option
      await api.zag.selectOption('node-1', 'Berlin')
      await api.utils.waitForIdle()

      // Verify selection
      const selected = api.zag.getSelectedOption('node-1')
      api.assert.ok(
        selected === 'Berlin' || (selected && selected.includes('Berlin')),
        `Should have "Berlin" selected, got "${selected}"`
      )

      // Trigger should show selected value, not placeholder
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Trigger slot should exist')
      api.assert.ok(
        triggers[0].fullText.includes('Berlin'),
        `Trigger should show "Berlin", got "${triggers[0].fullText}"`
      )

      // Should auto-close after selection (single select)
      await api.utils.delay(100)
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should close after selecting option')
    }
  ),

  testWithSetup(
    'Select can change selection',
    'Select placeholder "Pick"\n  Option "First"\n  Option "Second"\n  Option "Third"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select first option
      await api.zag.open('node-1')
      await api.zag.selectOption('node-1', 'First')
      await api.utils.waitForIdle()

      api.assert.ok(
        api.zag.getSelectedOption('node-1')?.includes('First'),
        'Should have "First" selected initially'
      )

      // Change to second option
      await api.zag.open('node-1')
      await api.zag.selectOption('node-1', 'Second')
      await api.utils.waitForIdle()

      const newSelection = api.zag.getSelectedOption('node-1')
      api.assert.ok(
        newSelection?.includes('Second'),
        `Should have "Second" selected after change, got "${newSelection}"`
      )

      // First should no longer be selected
      api.assert.ok(
        !newSelection?.includes('First'),
        'Should not have "First" in selection anymore'
      )
    }
  ),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled select has correct visual state',
    'Select placeholder "Disabled", disabled\n  Option "A"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled select should render')

      // Check visual disabled indicators
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      const hasDisabledVisual =
        opacity < 1 || cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled select should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
      )

      // State should reflect disabled
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available')

      const isDisabled =
        state?.context?.disabled === true || (state as Record<string, unknown>)?.disabled === true

      api.assert.ok(isDisabled, 'State should indicate disabled=true')
    }
  ),

  testWithSetup(
    'Disabled select cannot be opened',
    'Select placeholder "Locked", disabled\n  Option "Hidden"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should be closed initially
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Try to open via click
      await api.interact.click('node-1')
      await api.utils.waitForIdle()

      // Should still be closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Disabled select should not open on click')

      // Try to open via API
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Should still be closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Disabled select should not open via API')
    }
  ),

  // ==========================================================================
  // OPTION ITEMS
  // ==========================================================================

  testWithSetup(
    'Options have correct structure when open',
    'Select placeholder "View Options"\n  Option "Alpha"\n  Option "Beta"\n  Option "Gamma"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open to reveal options
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Find item elements
      const items = api.preview.query('[data-slot="Item"]')

      api.assert.ok(
        items.length >= 3,
        `Should have at least 3 item elements when open, got ${items.length}`
      )

      // Each item should be visible and have text
      for (const item of items) {
        api.assert.ok(item.visible, `Item should be visible`)
        api.assert.ok(item.fullText.length > 0, `Item should have text content, got empty`)
      }

      // Check specific options exist
      const itemTexts = items.map(i => i.fullText)
      api.assert.ok(
        itemTexts.some(t => t.includes('Alpha')),
        `Should have "Alpha" item, got: ${itemTexts.join(', ')}`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'Select exposes valid Zag state',
    'Select placeholder "State"\n  Option "A"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      api.assert.ok(state !== null, 'Zag state should be available')
      api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)

      // Should have value property (array for multi-select capable)
      api.assert.ok(
        'value' in state! || 'context' in state!,
        'State should have value or context property'
      )
    }
  ),

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  testWithSetup(
    'Select with single option works',
    'Select placeholder "Only one"\n  Option "Solo"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const options = api.zag.getOptions('node-1')
      api.assert.ok(options.length === 1, `Should have exactly 1 option, got ${options.length}`)

      // Can select the only option
      await api.zag.open('node-1')
      await api.zag.selectOption('node-1', 'Solo')
      await api.utils.waitForIdle()

      const selected = api.zag.getSelectedOption('node-1')
      api.assert.ok(
        selected?.includes('Solo'),
        `Should be able to select single option, got "${selected}"`
      )
    }
  ),

  testWithSetup(
    'Select with many options renders all',
    `Select placeholder "Many"
  Option "One"
  Option "Two"
  Option "Three"
  Option "Four"
  Option "Five"
  Option "Six"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const options = api.zag.getOptions('node-1')
      api.assert.ok(
        options.length === 6,
        `Should have 6 options, got ${options.length}: [${options.join(', ')}]`
      )
    }
  ),
])
