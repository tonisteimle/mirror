/**
 * RadioGroup Tests
 *
 * Comprehensive tests for the RadioGroup Zag component.
 * Tests structure, selection, interactions, disabled states, and styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const radioGroupTests: TestCase[] = describe('RadioGroup', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'RadioGroup renders with correct structure',
    `RadioGroup value "a"
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"
  RadioItem "Option C", value "c"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'RadioGroup root should exist')

      // Should have proper role
      const role = info!.attributes['role']
      api.assert.ok(
        role === 'radiogroup',
        `RadioGroup should have role="radiogroup", got "${role}"`
      )
    }
  ),

  testWithSetup(
    'RadioGroup has RadioItem children with controls',
    `RadioGroup value "first"
  RadioItem "First option", value "first"
  RadioItem "Second option", value "second"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find all item elements
      const items = api.preview.query('[data-slot="Item"]')
      api.assert.ok(
        items.length >= 2,
        `Should have at least 2 RadioItem elements, got ${items.length}`
      )

      // Each item should be visible and have text
      for (const item of items) {
        api.assert.ok(item.visible, 'RadioItem should be visible')
        api.assert.ok(item.fullText.length > 0, `RadioItem should have text content`)
      }

      // Find item controls (the visual radio circles)
      const controls = api.preview.query('[data-slot="ItemControl"]')
      api.assert.ok(
        controls.length >= 2,
        `Should have at least 2 ItemControl elements, got ${controls.length}`
      )

      // Controls should be visible and have dimensions
      for (const control of controls) {
        api.assert.ok(control.visible, 'ItemControl should be visible')
        const width = control.bounds.width
        const height = control.bounds.height
        api.assert.ok(width >= 14 && width <= 24, `Control width should be 14-24px, got ${width}px`)
        api.assert.ok(
          height >= 14 && height <= 24,
          `Control height should be 14-24px, got ${height}px`
        )
      }
    }
  ),

  // ==========================================================================
  // INITIAL STATE
  // ==========================================================================

  testWithSetup(
    'RadioGroup has correct initial selection',
    `RadioGroup value "monthly"
  RadioItem "Monthly - €9/month", value "monthly"
  RadioItem "Yearly - €99/year", value "yearly"
  RadioItem "Lifetime - €299", value "lifetime"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const selected = api.zag.getSelectedRadio('node-1')

      api.assert.ok(
        selected === 'monthly',
        `Should have "monthly" selected initially, got "${selected}"`
      )
    }
  ),

  testWithSetup(
    'Selected RadioItem has visual indicator',
    `RadioGroup value "b"
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify selection state
      const selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'b', 'Should have "b" selected')

      // Find items
      const items = api.preview.query('[data-slot="Item"]')

      for (const item of items) {
        const itemText = item.fullText
        const dataState = item.dataAttributes['data-state']
        const ariaChecked = item.attributes['aria-checked']

        if (itemText.includes('Option B')) {
          // Selected item should have checked indicator
          const isSelected =
            dataState === 'checked' ||
            ariaChecked === 'true' ||
            item.dataAttributes['data-checked'] === 'true'

          api.assert.ok(
            isSelected,
            `Option B should show as selected, attrs: ${JSON.stringify(item.dataAttributes)}`
          )
        } else if (itemText.includes('Option A')) {
          // Unselected item should not have checked indicator
          const isSelected = dataState === 'checked' || ariaChecked === 'true'

          api.assert.ok(
            !isSelected,
            `Option A should not show as selected, attrs: ${JSON.stringify(item.dataAttributes)}`
          )
        }
      }
    }
  ),

  // ==========================================================================
  // SELECTION INTERACTIONS
  // ==========================================================================

  testWithSetup(
    'Clicking RadioItem changes selection',
    `RadioGroup value "a"
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state
      api.assert.ok(api.zag.getSelectedRadio('node-1') === 'a', 'Should start with "a" selected')

      // Find and click Option B
      const items = api.preview.query('[data-slot="Item"]')
      const optionB = items.find(i => i.fullText.includes('Option B'))

      api.assert.ok(optionB, 'Should find Option B')

      await api.interact.click(optionB!.nodeId)
      await api.utils.waitForIdle()

      // Verify selection changed
      const newSelected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(
        newSelected === 'b',
        `Should have "b" selected after click, got "${newSelected}"`
      )
    }
  ),

  testWithSetup(
    'selectRadio API works correctly',
    `RadioGroup value "x"
  RadioItem "X", value "x"
  RadioItem "Y", value "y"
  RadioItem "Z", value "z"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Start at X
      api.assert.ok(api.zag.getSelectedRadio('node-1') === 'x', 'Should start at X')

      // Select Z
      await api.zag.selectRadio('node-1', 'z')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getSelectedRadio('node-1') === 'z', 'Should be at Z after selectRadio')

      // Select Y
      await api.zag.selectRadio('node-1', 'y')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getSelectedRadio('node-1') === 'y', 'Should be at Y after selectRadio')

      // Back to X
      await api.zag.selectRadio('node-1', 'x')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getSelectedRadio('node-1') === 'x', 'Should be back at X')
    }
  ),

  testWithSetup(
    'Selection is mutually exclusive',
    `RadioGroup value "one"
  RadioItem "One", value "one"
  RadioItem "Two", value "two"
  RadioItem "Three", value "three"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select "two"
      await api.zag.selectRadio('node-1', 'two')
      await api.utils.waitForIdle()

      // Verify only "two" is selected
      const selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'two', `Only "two" should be selected, got "${selected}"`)

      // Find items and verify visual states
      const items = api.preview.query('[data-slot="Item"]')

      let checkedCount = 0
      for (const item of items) {
        const isChecked =
          item.dataAttributes['data-state'] === 'checked' ||
          item.attributes['aria-checked'] === 'true'

        if (isChecked) {
          checkedCount++
          api.assert.ok(
            item.fullText.includes('Two'),
            `Only "Two" should be checked, but "${item.fullText}" is checked`
          )
        }
      }

      api.assert.ok(checkedCount === 1, `Exactly one item should be checked, got ${checkedCount}`)
    }
  ),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled RadioGroup has correct visual state',
    `RadioGroup value "a", disabled
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled RadioGroup should render')

      // Visual indicators of disabled state
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      const hasDisabledVisual =
        opacity < 1 || cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled RadioGroup should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
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
    'Disabled RadioGroup ignores selection changes',
    `RadioGroup value "a", disabled
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state
      const initial = api.zag.getSelectedRadio('node-1')
      api.assert.ok(initial === 'a', 'Should start with "a" selected')

      // Try to click Option B
      const items = api.preview.query('[data-slot="Item"]')
      const optionB = items.find(i => i.fullText.includes('Option B'))

      if (optionB) {
        await api.interact.click(optionB.nodeId)
        await api.utils.waitForIdle()
      }

      // Should still be "a"
      const afterClick = api.zag.getSelectedRadio('node-1')
      api.assert.ok(
        afterClick === 'a',
        `Disabled RadioGroup should not change selection, got "${afterClick}"`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'RadioGroup exposes valid Zag state',
    `RadioGroup value "test"
  RadioItem "Test", value "test"`,
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

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'RadioGroup respects custom styling',
    `RadioGroup value "a", bg #1a1a1a, pad 16, rad 8, gap 12
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Styled RadioGroup should render')

      // Check padding
      const padding = parseFloat(info!.styles.paddingTop)
      api.assert.ok(Math.abs(padding - 16) < 2, `Padding should be ~16px, got ${padding}px`)

      // Check border-radius
      const radius = parseFloat(info!.styles.borderRadius)
      api.assert.ok(Math.abs(radius - 8) < 2, `Border radius should be ~8px, got ${radius}px`)

      // Check gap
      const gap = parseFloat(info!.styles.gap)
      api.assert.ok(Math.abs(gap - 12) < 2, `Gap should be ~12px, got ${gap}px`)

      // Check background
      const bgColor = info!.styles.backgroundColor
      api.assert.ok(bgColor.includes('26, 26, 26'), `Background should be #1a1a1a, got ${bgColor}`)
    }
  ),

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  testWithSetup(
    'RadioGroup with single option works',
    `RadioGroup value "only"
  RadioItem "Only option", value "only"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const selected = api.zag.getSelectedRadio('node-1')
      api.assert.ok(selected === 'only', `Single option should be selectable, got "${selected}"`)
    }
  ),

  testWithSetup(
    'RadioGroup with many options renders all',
    `RadioGroup value "a"
  RadioItem "A", value "a"
  RadioItem "B", value "b"
  RadioItem "C", value "c"
  RadioItem "D", value "d"
  RadioItem "E", value "e"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const items = api.preview.query('[data-slot="Item"]')
      api.assert.ok(items.length === 5, `Should have 5 RadioItems, got ${items.length}`)

      // All should be visible
      for (const item of items) {
        api.assert.ok(item.visible, `RadioItem "${item.fullText}" should be visible`)
      }
    }
  ),
])
