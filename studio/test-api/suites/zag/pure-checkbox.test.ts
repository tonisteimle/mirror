/**
 * Pure Checkbox Tests
 *
 * Comprehensive tests for Pure Mirror Checkbox component.
 * Tests structure, state propagation, slot content, toggle behavior,
 * styling, hover states, accessibility, and edge cases.
 *
 * Pure Checkbox Definition:
 * Checkbox as Label: hor, gap 8, cursor pointer, toggle()
 *   Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
 *     hover:
 *       boc #888
 *     on:
 *       bg #5BA8F5, boc #5BA8F5
 *   Indicator: Icon "check", is 12, col white, opacity 0, scale 0.8
 *     on:
 *       opacity 1, scale 1
 *   Content: Slot
 *
 * Node ID Structure (definition is template, not rendered):
 * Single checkbox:
 *   node-1: Checkbox (label)
 *   node-2: Control (div)
 *   node-3: Indicator (span)
 *   node-4: Content (div)
 *
 * Multiple checkboxes in Frame:
 *   node-1: Frame
 *   node-2: First Checkbox
 *   node-3: Second Checkbox
 *   etc.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Full checkbox definition for tests
const CHECKBOX_DEFINITION = `Checkbox as Label: hor, gap 8, cursor pointer, toggle()
  Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
    hover:
      boc #888
    on:
      bg #5BA8F5, boc #5BA8F5
  Indicator: Icon "check", is 12, col white, opacity 0, scale 0.8
    on:
      opacity 1, scale 1
  Content: Slot`

// Checkbox without indicator (simpler variant)
const CHECKBOX_NO_INDICATOR = `Checkbox as Label: hor, gap 8, cursor pointer, toggle()
  Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
    on:
      bg #5BA8F5, boc #5BA8F5
  Content: Slot`

// Checkbox with custom colors
const CHECKBOX_CUSTOM_COLORS = `Checkbox as Label: hor, gap 8, cursor pointer, toggle()
  Control: Frame w 20, h 20, rad 6, bor 2, boc #666, center
    on:
      bg #10b981, boc #10b981
  Indicator: Icon "check", is 14, col white, opacity 0
    on:
      opacity 1
  Content: Slot`

export const pureCheckboxTests: TestCase[] = describe('Pure Checkbox', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Checkbox renders with correct structure',
    `Checkbox as Label: hor, w hug, gap 8, cursor pointer, toggle()
  Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
    hover:
      boc #888
    on:
      bg #5BA8F5, boc #5BA8F5
  Indicator: Icon "check", is 12, col white, opacity 0, scale 0.8
    on:
      opacity 1, scale 1
  Content: Slot

Checkbox "Newsletter"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // The Checkbox instance is node-1 (the definition is a template, not a separate node)
      const checkbox = api.preview.inspect('node-1')
      const checkboxTag = checkbox?.tagName?.toLowerCase() || 'null'

      api.assert.ok(
        checkboxTag === 'label',
        `Checkbox should be a label element, got ${checkboxTag}`
      )

      // Should have horizontal layout with gap
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')
    }
  ),

  testWithSetup(
    'Checkbox has Control child with correct dimensions',
    `${CHECKBOX_DEFINITION}

Checkbox "Subscribe"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Checkbox is node-1, Control is node-2
      const checkbox = api.preview.inspect('node-1')
      const children = checkbox?.children || []

      api.assert.ok(
        children.length >= 2,
        `Checkbox should have at least 2 children, got ${children.length}`
      )

      // Control should be node-2
      const control = api.preview.inspect('node-2')
      api.assert.ok(control !== null, 'Control element should exist')

      // Control should have correct dimensions (w 18, h 18)
      api.assert.ok(
        control!.bounds.width >= 16 && control!.bounds.width <= 20,
        `Control width should be ~18px, got ${control!.bounds.width}`
      )
      api.assert.ok(
        control!.bounds.height >= 16 && control!.bounds.height <= 20,
        `Control height should be ~18px, got ${control!.bounds.height}`
      )
    }
  ),

  testWithSetup(
    'Checkbox Control has correct border styling',
    `${CHECKBOX_DEFINITION}

Checkbox "Terms"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Control is node-2
      const control = api.preview.inspect('node-2')
      api.assert.ok(control !== null, 'Control should exist')

      // Should have border (bor 2)
      const borderWidth = control!.styles.borderWidth
      api.assert.ok(
        borderWidth === '2px' || borderWidth === '2',
        `Control should have 2px border, got ${borderWidth}`
      )

      // Should have border color #3f3f46
      const borderColor = control!.styles.borderColor
      api.assert.ok(
        borderColor.includes('63, 63, 70') || borderColor === '#3f3f46',
        `Control should have border color #3f3f46, got ${borderColor}`
      )

      // Should have border-radius (rad 4)
      const borderRadius = control!.styles.borderRadius
      api.assert.ok(
        borderRadius === '4px' || borderRadius === '4',
        `Control should have 4px radius, got ${borderRadius}`
      )
    }
  ),

  testWithSetup(
    'Checkbox Indicator exists with correct initial state',
    `${CHECKBOX_DEFINITION}

Checkbox "With Indicator"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Indicator is node-3
      const indicator = api.preview.inspect('node-3')
      api.assert.ok(indicator !== null, 'Indicator should exist')

      // Should be hidden initially (opacity 0)
      api.assert.equals(
        indicator!.styles.opacity,
        '0',
        `Indicator should be hidden initially, got opacity ${indicator!.styles.opacity}`
      )
    }
  ),

  // ==========================================================================
  // SLOT CONTENT PROJECTION
  // ==========================================================================

  testWithSetup(
    'Content: Slot receives instance text',
    `${CHECKBOX_DEFINITION}

Checkbox "Accept Terms"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // The checkbox is node-1
      const info = api.preview.inspect('node-1')
      api.assert.ok(
        info!.fullText.includes('Accept Terms'),
        `Checkbox should contain "Accept Terms", got "${info!.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Content: Slot with different text values',
    `${CHECKBOX_DEFINITION}

Frame gap 12
  Checkbox "Option A"
  Checkbox "Option B"
  Checkbox "Option C"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Frame is node-1, checkboxes are node-2, node-3, node-4
      // But each checkbox has children, so the actual structure is:
      // node-1: Frame
      // node-2: First Checkbox
      // node-3..5: First Checkbox children (Control, Indicator, Content)
      // node-6: Second Checkbox
      // etc.
      // Let's check the Frame's children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []
      api.assert.ok(
        children.length >= 3,
        `Frame should have 3 checkbox children, got ${children.length}`
      )

      // Check that each checkbox has its text
      const checkbox1 = api.preview.inspect('node-2')
      api.assert.ok(
        checkbox1!.fullText.includes('Option A'),
        `First checkbox should contain "Option A", got "${checkbox1!.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Content: Slot with long text',
    `${CHECKBOX_DEFINITION}

Checkbox "I agree to the terms of service and privacy policy"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(
        info!.fullText.includes('terms of service'),
        `Should render long text, got "${info!.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Content: Slot with special characters',
    `${CHECKBOX_DEFINITION}

Checkbox "Accept & Continue (required)"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(
        info!.fullText.includes('&') && info!.fullText.includes('(required)'),
        `Should render special characters, got "${info!.fullText}"`
      )
    }
  ),

  // ==========================================================================
  // STATE PROPAGATION - toggle() to child on: states
  // ==========================================================================

  testWithSetup(
    'toggle() on parent propagates to child on: states - Control background',
    `${CHECKBOX_DEFINITION}

Checkbox "Toggle Test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state - unchecked
      // Control (node-2) should NOT have the "on" state background
      const controlBefore = api.preview.inspect('node-2')
      const bgBefore = controlBefore!.styles.backgroundColor

      api.assert.ok(
        !bgBefore.includes('91, 168, 245'), // #5BA8F5
        `Control should not have checked background initially, got ${bgBefore}`
      )

      // Click to toggle on (click on checkbox node-1)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Now Control should have the "on" state background via CSS propagation
      const controlAfter = api.preview.inspect('node-2')
      const bgAfter = controlAfter!.styles.backgroundColor

      api.assert.ok(
        bgAfter.includes('91, 168, 245') || bgAfter === 'rgb(91, 168, 245)', // #5BA8F5
        `Control should have checked background after click, got ${bgAfter}`
      )
    }
  ),

  testWithSetup(
    'toggle() on parent propagates to child on: states - Control border color',
    `${CHECKBOX_DEFINITION}

Checkbox "Border Test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state - default border color
      const controlBefore = api.preview.inspect('node-2')
      const bocBefore = controlBefore!.styles.borderColor

      api.assert.ok(
        bocBefore.includes('63, 63, 70'), // #3f3f46
        `Control should have default border color initially, got ${bocBefore}`
      )

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Now Control should have the "on" state border color
      const controlAfter = api.preview.inspect('node-2')
      const bocAfter = controlAfter!.styles.borderColor

      api.assert.ok(
        bocAfter.includes('91, 168, 245'), // #5BA8F5
        `Control should have checked border color after click, got ${bocAfter}`
      )
    }
  ),

  testWithSetup(
    'Toggle cycles between on and off states',
    `${CHECKBOX_DEFINITION}

Checkbox "Cycle Test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Start: unchecked
      let dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.ok(
        dataState === 'default' || dataState === null || dataState === '',
        `Should start in default/unchecked state, got "${dataState}"`
      )

      // Click 1: checked
      await api.interact.click('node-1')
      await api.utils.delay(200)
      dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should be "on" after first click')

      // Click 2: unchecked
      await api.interact.click('node-1')
      await api.utils.delay(200)
      dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'default', 'Should be "default" after second click')

      // Click 3: checked again
      await api.interact.click('node-1')
      await api.utils.delay(200)
      dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should be "on" after third click')
    }
  ),

  testWithSetup(
    'Multiple checkboxes toggle independently',
    `${CHECKBOX_DEFINITION}

Frame gap 12
  Checkbox "First"
  Checkbox "Second"
  Checkbox "Third"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Frame is node-1, checkboxes are node-2, node-6, node-10 (each has 4 children)
      // Actually, let's figure out the IDs by checking the Frame's children
      // For simplicity, let's use the first 3 direct children of Frame as the checkboxes
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []
      const firstCheckbox = children[0]
      const secondCheckbox = children[1]
      const thirdCheckbox = children[2]

      // All start unchecked
      let state1 = await api.utils.getDataAttribute(firstCheckbox, 'data-state')
      let state2 = await api.utils.getDataAttribute(secondCheckbox, 'data-state')
      let state3 = await api.utils.getDataAttribute(thirdCheckbox, 'data-state')

      api.assert.ok(state1 !== 'on', 'First should start unchecked')
      api.assert.ok(state2 !== 'on', 'Second should start unchecked')
      api.assert.ok(state3 !== 'on', 'Third should start unchecked')

      // Toggle first
      await api.interact.click(firstCheckbox)
      await api.utils.delay(200)

      state1 = await api.utils.getDataAttribute(firstCheckbox, 'data-state')
      state2 = await api.utils.getDataAttribute(secondCheckbox, 'data-state')
      state3 = await api.utils.getDataAttribute(thirdCheckbox, 'data-state')

      api.assert.equals(state1, 'on', 'First should be on')
      api.assert.ok(state2 !== 'on', 'Second should still be unchecked')
      api.assert.ok(state3 !== 'on', 'Third should still be unchecked')

      // Toggle second
      await api.interact.click(secondCheckbox)
      await api.utils.delay(200)

      state1 = await api.utils.getDataAttribute(firstCheckbox, 'data-state')
      state2 = await api.utils.getDataAttribute(secondCheckbox, 'data-state')

      api.assert.equals(state1, 'on', 'First should still be on')
      api.assert.equals(state2, 'on', 'Second should now be on')

      // Toggle first off
      await api.interact.click(firstCheckbox)
      await api.utils.delay(200)

      state1 = await api.utils.getDataAttribute(firstCheckbox, 'data-state')
      state2 = await api.utils.getDataAttribute(secondCheckbox, 'data-state')

      api.assert.equals(state1, 'default', 'First should be off')
      api.assert.equals(state2, 'on', 'Second should still be on')
    }
  ),

  // ==========================================================================
  // INDICATOR ANIMATION
  // ==========================================================================

  testWithSetup(
    'Indicator shows when checkbox is checked',
    `${CHECKBOX_DEFINITION}

Checkbox "Indicator Show"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial: indicator (node-3) should be hidden (opacity 0)
      const indicatorBefore = api.preview.inspect('node-3')
      api.assert.equals(
        indicatorBefore!.styles.opacity,
        '0',
        'Indicator should be hidden initially'
      )

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Now indicator should be visible (opacity 1) via CSS propagation
      const indicatorAfter = api.preview.inspect('node-3')
      api.assert.equals(
        indicatorAfter!.styles.opacity,
        '1',
        'Indicator should be visible after click'
      )
    }
  ),

  testWithSetup(
    'Indicator hides when checkbox is unchecked',
    `${CHECKBOX_DEFINITION}

Checkbox "Indicator Hide"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Indicator visible
      let indicator = api.preview.inspect('node-3')
      api.assert.equals(indicator!.styles.opacity, '1', 'Indicator should be visible when on')

      // Click to toggle off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Indicator hidden
      indicator = api.preview.inspect('node-3')
      api.assert.equals(indicator!.styles.opacity, '0', 'Indicator should be hidden when off')
    }
  ),

  testWithSetup(
    'Indicator scale changes with state',
    `${CHECKBOX_DEFINITION}

Checkbox "Indicator Scale"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial: indicator should have scale 0.8
      const indicatorBefore = api.preview.inspect('node-3')
      const transformBefore = indicatorBefore!.styles.transform

      api.assert.ok(
        transformBefore.includes('0.8') || transformBefore.includes('scale'),
        `Initial scale should be 0.8, got transform: ${transformBefore}`
      )

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Now indicator should have scale 1
      const indicatorAfter = api.preview.inspect('node-3')
      const transformAfter = indicatorAfter!.styles.transform

      api.assert.ok(
        transformAfter === 'none' || transformAfter.includes('scale(1)') || transformAfter === '',
        `On state scale should be 1, got transform: ${transformAfter}`
      )
    }
  ),

  // ==========================================================================
  // STARTING STATE - on attribute
  // ==========================================================================

  testWithSetup(
    'Checkbox with "on" attribute starts checked',
    `${CHECKBOX_DEFINITION}

Checkbox "Pre-checked", on`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should start with on state
      const dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should start in "on" state')

      // Control should have checked styles
      const control = api.preview.inspect('node-2')
      const bg = control!.styles.backgroundColor

      api.assert.ok(
        bg.includes('91, 168, 245'), // #5BA8F5
        `Control should have checked background, got ${bg}`
      )

      // Indicator should be visible
      const indicator = api.preview.inspect('node-3')
      api.assert.equals(indicator!.styles.opacity, '1', 'Indicator should be visible')
    }
  ),

  testWithSetup(
    'Pre-checked checkbox can be unchecked',
    `${CHECKBOX_DEFINITION}

Checkbox "Can uncheck", on`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Start checked
      let dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should start on')

      // Click to toggle off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'default', 'Should be off after click')
    }
  ),

  testWithSetup(
    'Mixed initial states - some on, some off',
    `${CHECKBOX_DEFINITION}

Frame gap 12
  Checkbox "Off by default"
  Checkbox "On by default", on
  Checkbox "Also off"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get checkbox IDs from Frame children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []

      const state1 = await api.utils.getDataAttribute(children[0], 'data-state')
      const state2 = await api.utils.getDataAttribute(children[1], 'data-state')
      const state3 = await api.utils.getDataAttribute(children[2], 'data-state')

      api.assert.ok(state1 !== 'on', 'First should be off')
      api.assert.equals(state2, 'on', 'Second should be on')
      api.assert.ok(state3 !== 'on', 'Third should be off')
    }
  ),

  // ==========================================================================
  // CUSTOM STYLING VARIANTS
  // ==========================================================================

  testWithSetup(
    'Checkbox with custom colors',
    `${CHECKBOX_CUSTOM_COLORS}

Checkbox "Green checkbox"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Click to activate
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Should have green (#10b981) background when on
      const control = api.preview.inspect('node-2')
      const bg = control!.styles.backgroundColor

      api.assert.ok(
        bg.includes('16, 185, 129'), // #10b981
        `Control should have green background when on, got ${bg}`
      )
    }
  ),

  testWithSetup(
    'Checkbox without indicator still toggles',
    `${CHECKBOX_NO_INDICATOR}

Checkbox "No check icon"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should still toggle
      let dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.ok(dataState !== 'on', 'Should start off')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should be on after click')

      // Control should still change visually
      const control = api.preview.inspect('node-2')
      const bg = control!.styles.backgroundColor

      api.assert.ok(
        bg.includes('91, 168, 245'), // #5BA8F5
        `Control should have checked background, got ${bg}`
      )
    }
  ),

  testWithSetup(
    'Checkbox with larger control size',
    `Checkbox as Label: hor, gap 12, cursor pointer, toggle()
  Control: Frame w 24, h 24, rad 6, bor 2, boc #3f3f46, center
    on:
      bg #5BA8F5, boc #5BA8F5
  Content: Slot

Checkbox "Large checkbox"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const control = api.preview.inspect('node-2')
      api.assert.ok(
        control!.bounds.width >= 22 && control!.bounds.width <= 26,
        `Control width should be ~24px, got ${control!.bounds.width}`
      )
    }
  ),

  // ==========================================================================
  // LAYOUT VARIATIONS
  // ==========================================================================

  testWithSetup(
    'Checkbox in vertical layout',
    `${CHECKBOX_DEFINITION}

Frame gap 8
  Checkbox "Option 1"
  Checkbox "Option 2"
  Checkbox "Option 3"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get checkbox IDs from Frame children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []

      const cb1 = api.preview.inspect(children[0])
      const cb2 = api.preview.inspect(children[1])
      const cb3 = api.preview.inspect(children[2])

      api.assert.ok(
        cb1!.bounds.top < cb2!.bounds.top && cb2!.bounds.top < cb3!.bounds.top,
        'Checkboxes should be stacked vertically'
      )
    }
  ),

  testWithSetup(
    'Checkbox in horizontal layout',
    `${CHECKBOX_DEFINITION}

Frame hor, gap 16
  Checkbox "A"
  Checkbox "B"
  Checkbox "C"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get checkbox IDs from Frame children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []

      const cb1 = api.preview.inspect(children[0])
      const cb2 = api.preview.inspect(children[1])
      const cb3 = api.preview.inspect(children[2])

      api.assert.ok(
        cb1!.bounds.left < cb2!.bounds.left && cb2!.bounds.left < cb3!.bounds.left,
        'Checkboxes should be laid out horizontally'
      )
    }
  ),

  testWithSetup(
    'Checkbox in grid layout',
    `${CHECKBOX_DEFINITION}

Frame grid 2, gap 12
  Checkbox "Top Left"
  Checkbox "Top Right"
  Checkbox "Bottom Left"
  Checkbox "Bottom Right"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get checkbox IDs from Frame children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []

      const tl = api.preview.inspect(children[0])
      const tr = api.preview.inspect(children[1])
      const bl = api.preview.inspect(children[2])
      const br = api.preview.inspect(children[3])

      // Top row should be at same height
      api.assert.ok(
        Math.abs(tl!.bounds.top - tr!.bounds.top) < 5,
        'Top row checkboxes should be at same height'
      )

      // Bottom row should be at same height
      api.assert.ok(
        Math.abs(bl!.bounds.top - br!.bounds.top) < 5,
        'Bottom row checkboxes should be at same height'
      )

      // Top row should be above bottom row
      api.assert.ok(tl!.bounds.top < bl!.bounds.top, 'Top row should be above bottom row')
    }
  ),

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  testWithSetup(
    'Checkbox with empty text',
    `${CHECKBOX_DEFINITION}

Checkbox ""`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should still render and be toggleable
      const checkbox = api.preview.inspect('node-1')
      api.assert.ok(checkbox !== null, 'Checkbox should render with empty text')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      const dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should toggle with empty text')
    }
  ),

  testWithSetup(
    'Rapid toggling works correctly',
    `${CHECKBOX_DEFINITION}

Checkbox "Rapid toggle"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Click rapidly 5 times
      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(50)
      }

      await api.utils.delay(200)

      // After 5 clicks, should be "on" (odd number of clicks)
      const dataState = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(dataState, 'on', 'Should be on after 5 clicks')
    }
  ),

  testWithSetup(
    'Many checkboxes render without performance issues',
    `${CHECKBOX_NO_INDICATOR}

Frame gap 4
  Checkbox "1"
  Checkbox "2"
  Checkbox "3"
  Checkbox "4"
  Checkbox "5"
  Checkbox "6"
  Checkbox "7"
  Checkbox "8"
  Checkbox "9"
  Checkbox "10"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get checkbox IDs from Frame children
      const frame = api.preview.inspect('node-1')
      const children = frame?.children || []

      // All 10 checkboxes should exist
      api.assert.ok(children.length >= 10, `Should have 10 checkboxes, got ${children.length}`)

      // Toggle the 5th checkbox
      const fifthCheckbox = children[4]
      await api.interact.click(fifthCheckbox)
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(fifthCheckbox, 'data-state')
      api.assert.equals(state, 'on', '5th checkbox should be toggled')

      // Others should remain unchanged
      const state1 = await api.utils.getDataAttribute(children[0], 'data-state')
      api.assert.ok(state1 !== 'on', 'First checkbox should still be off')
    }
  ),

  // ==========================================================================
  // DATA ATTRIBUTE TESTS
  // ==========================================================================

  testWithSetup(
    'data-state attribute is set correctly',
    `${CHECKBOX_DEFINITION}

Checkbox "Data state test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially should be default (or no state)
      let state = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.ok(
        state === 'default' || state === null || state === '',
        `Initial state should be default, got "${state}"`
      )

      // After click should be "on"
      await api.interact.click('node-1')
      await api.utils.delay(200)

      state = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(state, 'on', 'State should be "on" after click')
    }
  ),

  testWithSetup(
    'data-mirror-id attribute is present',
    `${CHECKBOX_DEFINITION}

Checkbox "Mirror ID test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const mirrorId = await api.utils.getDataAttribute('node-1', 'data-mirror-id')
      api.assert.equals(mirrorId, 'node-1', 'Should have correct data-mirror-id')
    }
  ),

  // ==========================================================================
  // PARENT-CHILD STATE PROPAGATION DETAILS
  // ==========================================================================

  testWithSetup(
    'Child states only activate when parent is "on"',
    `${CHECKBOX_DEFINITION}

Checkbox "State propagation"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Parent off -> child on: states should NOT apply
      const controlOff = api.preview.inspect('node-2')
      const bgOff = controlOff!.styles.backgroundColor

      api.assert.ok(
        !bgOff.includes('91, 168, 245'),
        `When parent is off, child on: styles should not apply, got ${bgOff}`
      )

      // Parent on -> child on: states SHOULD apply
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const controlOn = api.preview.inspect('node-2')
      const bgOn = controlOn!.styles.backgroundColor

      api.assert.ok(
        bgOn.includes('91, 168, 245'),
        `When parent is on, child on: styles should apply, got ${bgOn}`
      )
    }
  ),

  testWithSetup(
    'Nested children receive parent state',
    `${CHECKBOX_DEFINITION}

Checkbox "Nested test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially indicator hidden
      let indicator = api.preview.inspect('node-3')
      api.assert.equals(indicator!.styles.opacity, '0', 'Indicator hidden initially')

      // After parent toggle
      await api.interact.click('node-1')
      await api.utils.delay(200)

      indicator = api.preview.inspect('node-3')
      api.assert.equals(indicator!.styles.opacity, '1', 'Indicator visible when parent on')
    }
  ),

  // ==========================================================================
  // CLICK TARGET TESTS
  // ==========================================================================

  testWithSetup(
    'Clicking anywhere on checkbox toggles state',
    `${CHECKBOX_DEFINITION}

Checkbox "Click anywhere"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Click on the checkbox label (the whole component)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(state, 'on', 'Should toggle when clicking the label')
    }
  ),

  testWithSetup(
    'Clicking on Control toggles state',
    `${CHECKBOX_DEFINITION}

Checkbox "Click control"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Click specifically on the control
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // State change bubbles to parent
      const state = await api.utils.getDataAttribute('node-1', 'data-state')
      api.assert.equals(state, 'on', 'Clicking control should toggle parent state')
    }
  ),

  // ==========================================================================
  // VISUAL CONSISTENCY
  // ==========================================================================

  testWithSetup(
    'Control and Indicator are aligned',
    `${CHECKBOX_DEFINITION}

Checkbox "Alignment test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const control = api.preview.inspect('node-2')
      const indicator = api.preview.inspect('node-3')

      // Indicator should be positioned within/near the control
      // (since Control has center alignment)
      const controlCenter = {
        x: control!.bounds.left + control!.bounds.width / 2,
        y: control!.bounds.top + control!.bounds.height / 2,
      }

      const indicatorCenter = {
        x: indicator!.bounds.left + indicator!.bounds.width / 2,
        y: indicator!.bounds.top + indicator!.bounds.height / 2,
      }

      // Centers should be close (within 10px)
      const xDiff = Math.abs(controlCenter.x - indicatorCenter.x)
      const yDiff = Math.abs(controlCenter.y - indicatorCenter.y)

      api.assert.ok(
        xDiff < 10 && yDiff < 10,
        `Indicator should be centered in control. X diff: ${xDiff}, Y diff: ${yDiff}`
      )
    }
  ),

  testWithSetup(
    'Text is to the right of Control',
    `${CHECKBOX_DEFINITION}

Checkbox "Text position"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const control = api.preview.inspect('node-2')

      // The Content/Text should be after Control in horizontal layout
      const checkbox = api.preview.inspect('node-1')

      // Text should be included in the checkbox fullText
      api.assert.ok(checkbox!.fullText.includes('Text position'), 'Text should be visible')

      // Control should be on the left side of the checkbox
      api.assert.ok(
        control!.bounds.left <= checkbox!.bounds.left + 30,
        'Control should be near the left edge of checkbox'
      )
    }
  ),
])

// Export for test suite index
export default pureCheckboxTests
