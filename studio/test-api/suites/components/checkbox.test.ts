/**
 * Checkbox Tests
 *
 * Comprehensive tests for the Checkbox Zag component.
 * Tests structure, styling, state, interactions, and accessibility.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const checkboxTests: TestCase[] = describe('Checkbox', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Checkbox renders with correct structure',
    'Checkbox "Accept terms"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Checkbox root should exist')

      // 2. Verify it's a proper container
      api.assert.ok(
        info!.tagName === 'label' || info!.tagName === 'div',
        `Expected label or div container, got ${info!.tagName}`
      )

      // 3. Label text is rendered
      api.assert.ok(
        info!.fullText.includes('Accept terms'),
        `Label should contain "Accept terms", got "${info!.fullText}"`
      )

      // 4. Has clickable cursor
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // 5. Flexbox layout for alignment
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'Checkbox has Control slot with visual indicator',
    'Checkbox "Option"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find the control element (the visual checkbox box)
      const controls = api.preview.query('[data-slot="Control"]')
      api.assert.ok(controls.length > 0, 'Should have a Control slot element')

      const control = controls[0]

      // Control should be a visible box
      api.assert.ok(control.visible, 'Control should be visible')

      // Control should have border (unchecked state)
      const borderWidth = parseFloat(control.styles.borderWidth) || 0
      api.assert.ok(
        borderWidth >= 1,
        `Control should have border, got ${control.styles.borderWidth}`
      )

      // Control should have reasonable size
      const width = control.bounds.width
      const height = control.bounds.height
      api.assert.ok(width >= 14 && width <= 24, `Control width should be 14-24px, got ${width}`)
      api.assert.ok(height >= 14 && height <= 24, `Control height should be 14-24px, got ${height}`)
    }
  ),

  // ==========================================================================
  // DEFAULT STATE
  // ==========================================================================

  testWithSetup(
    'Checkbox is unchecked by default',
    'Checkbox "Default unchecked"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // State check
      const isChecked = api.zag.isChecked('node-1')
      api.assert.ok(!isChecked, 'Checkbox should be unchecked by default')

      // Visual check - control should not have filled background
      const controls = api.preview.query('[data-slot="Control"]')
      api.assert.ok(controls.length > 0, 'Control slot should exist')

      const bgColor = controls[0].styles.backgroundColor

      // Unchecked should NOT have accent/primary color (blue tones)
      // Primary colors would include: #2271C1, #2563eb, #3b82f6
      const hasAccentColor =
        bgColor.includes('34, 113, 193') || // #2271C1
        bgColor.includes('37, 99, 235') || // #2563eb
        bgColor.includes('59, 130, 246') || // #3b82f6
        bgColor.includes('91, 168, 245') // #5BA8F5 (runtime default)

      api.assert.ok(
        !hasAccentColor,
        `Unchecked control should NOT have accent/primary background, got ${bgColor}`
      )

      // Check icon visibility
      const indicators = api.preview.query('[data-slot="Indicator"]')
      // When unchecked: either no indicator exists, or it's hidden
      const indicatorHidden =
        indicators.length === 0 || !indicators[0].visible || indicators[0].styles.opacity === '0'

      api.assert.ok(
        indicatorHidden,
        `Check indicator should be hidden when unchecked. Found ${indicators.length} indicators`
      )
    }
  ),

  testWithSetup(
    'Checkbox with checked attribute starts checked',
    'Checkbox "Pre-checked", checked',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // State check
      const isChecked = api.zag.isChecked('node-1')
      api.assert.ok(isChecked, 'Checkbox should be checked when "checked" attribute is set')

      // Visual check - control should have accent background
      const controls = api.preview.query('[data-slot="Control"]')
      api.assert.ok(controls.length > 0, 'Control slot should exist')

      const bgColor = controls[0].styles.backgroundColor
      // Checked typically has accent color (blue)
      api.assert.ok(
        bgColor.includes('34, 113, 193') || // #2271C1
          bgColor.includes('37, 99, 235') || // #2563eb
          bgColor.includes('59, 130, 246') || // #3b82f6
          bgColor.includes('91, 168, 245'), // #5BA8F5 (runtime default)
        `Checked control should have accent background, got ${bgColor}`
      )
    }
  ),

  // ==========================================================================
  // INTERACTIONS
  // ==========================================================================

  testWithSetup('Checkbox toggles on click', 'Checkbox "Click me"', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Initial state
    api.assert.ok(!api.zag.isChecked('node-1'), 'Should start unchecked')

    // Click to check
    await api.interact.click('node-1')
    await api.utils.waitForIdle()

    api.assert.ok(api.zag.isChecked('node-1'), 'Should be checked after first click')

    // Click to uncheck
    await api.interact.click('node-1')
    await api.utils.waitForIdle()

    api.assert.ok(!api.zag.isChecked('node-1'), 'Should be unchecked after second click')
  }),

  testWithSetup(
    'Checkbox API methods work correctly',
    'Checkbox "API test"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Start unchecked
      api.assert.ok(!api.zag.isChecked('node-1'), 'Should start unchecked')

      // check() method
      await api.zag.check('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.zag.isChecked('node-1'), 'check() should set checked state')

      // check() when already checked (idempotent)
      await api.zag.check('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.zag.isChecked('node-1'), 'check() should remain checked')

      // uncheck() method
      await api.zag.uncheck('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(!api.zag.isChecked('node-1'), 'uncheck() should clear checked state')

      // uncheck() when already unchecked (idempotent)
      await api.zag.uncheck('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(!api.zag.isChecked('node-1'), 'uncheck() should remain unchecked')

      // toggle() method
      await api.zag.toggle('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.zag.isChecked('node-1'), 'toggle() should check when unchecked')

      await api.zag.toggle('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(!api.zag.isChecked('node-1'), 'toggle() should uncheck when checked')
    }
  ),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled checkbox has correct visual state',
    'Checkbox "Disabled", disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled checkbox should render')

      // Visual indicators of disabled state
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      // Should have reduced opacity OR not-allowed cursor OR disabled pointer events
      const hasDisabledVisual = opacity < 1 || cursor === 'not-allowed' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled checkbox should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
      )

      // State should reflect disabled
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available')

      // Check disabled in state or context
      const isDisabled =
        state?.context?.disabled === true || (state as Record<string, unknown>)?.disabled === true

      api.assert.ok(isDisabled, 'State should indicate disabled=true')
    }
  ),

  testWithSetup(
    'Disabled checkbox ignores clicks',
    'Checkbox "Cannot click", disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state - unchecked
      const initialChecked = api.zag.isChecked('node-1')
      api.assert.ok(!initialChecked, 'Should start unchecked')

      // Try to click
      await api.interact.click('node-1')
      await api.utils.waitForIdle()

      // Should still be unchecked
      const afterClickChecked = api.zag.isChecked('node-1')
      api.assert.ok(!afterClickChecked, 'Disabled checkbox should not change state on click')
    }
  ),

  testWithSetup(
    'Disabled checked checkbox stays checked',
    'Checkbox "Locked checked", checked, disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Should be checked
      api.assert.ok(api.zag.isChecked('node-1'), 'Should be checked initially')

      // Try to click
      await api.interact.click('node-1')
      await api.utils.waitForIdle()

      // Should still be checked
      api.assert.ok(
        api.zag.isChecked('node-1'),
        'Disabled checked checkbox should stay checked after click attempt'
      )
    }
  ),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Checkbox respects custom styling',
    'Checkbox "Styled", bg #1a1a1a, pad 12, rad 8',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Styled checkbox should render')

      // Check padding is applied
      const paddingTop = parseFloat(info!.styles.paddingTop)
      api.assert.ok(Math.abs(paddingTop - 12) < 2, `Padding should be ~12px, got ${paddingTop}px`)

      // Check border-radius is applied
      const borderRadius = parseFloat(info!.styles.borderRadius)
      api.assert.ok(
        Math.abs(borderRadius - 8) < 2,
        `Border radius should be ~8px, got ${borderRadius}px`
      )

      // Check background color
      const bgColor = info!.styles.backgroundColor
      api.assert.ok(
        bgColor.includes('26, 26, 26'), // #1a1a1a
        `Background should be #1a1a1a, got ${bgColor}`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'Checkbox exposes valid Zag state',
    'Checkbox "State test"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      // State should exist
      api.assert.ok(state !== null, 'Zag state should be available')

      // State should have expected structure
      api.assert.ok(typeof state === 'object', `State should be an object, got ${typeof state}`)

      // Should have scope or machine identifier
      const hasScope = 'scope' in state! || 'id' in state! || 'machine' in state!
      api.assert.ok(hasScope, 'State should have scope/id/machine identifier')
    }
  ),
])
