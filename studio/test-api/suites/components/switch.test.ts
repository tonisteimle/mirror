/**
 * Switch Tests
 *
 * Comprehensive tests for the Switch Zag component.
 * Tests structure, styling, state, interactions, and accessibility.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const switchTests: TestCase[] = describe('Switch', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Switch renders with correct structure',
    'Switch "Dark mode"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Switch root should exist')

      // Should be a clickable container
      api.assert.ok(
        info!.styles.cursor === 'pointer',
        `Switch should have pointer cursor, got ${info!.styles.cursor}`
      )

      // Should have flexbox layout
      api.assert.ok(
        info!.styles.display === 'flex',
        `Switch should be flex container, got ${info!.styles.display}`
      )

      // Should contain label text
      api.assert.ok(
        info!.fullText.includes('Dark mode'),
        `Switch should contain label "Dark mode", got "${info!.fullText}"`
      )
    }
  ),

  testWithSetup('Switch has Track and Thumb slots', 'Switch "Toggle"', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Find track (the outer container)
    const tracks = api.preview.query('[data-slot="Track"]')
    api.assert.ok(tracks.length > 0, 'Should have a Track slot element')

    const track = tracks[0]
    api.assert.ok(track.visible, 'Track should be visible')

    // Track should have reasonable dimensions
    const trackWidth = track.bounds.width
    const trackHeight = track.bounds.height
    api.assert.ok(
      trackWidth >= 30 && trackWidth <= 60,
      `Track width should be 30-60px, got ${trackWidth}px`
    )
    api.assert.ok(
      trackHeight >= 16 && trackHeight <= 32,
      `Track height should be 16-32px, got ${trackHeight}px`
    )

    // Find thumb (the sliding element)
    const thumbs = api.preview.query('[data-slot="Thumb"]')
    api.assert.ok(thumbs.length > 0, 'Should have a Thumb slot element')

    const thumb = thumbs[0]
    api.assert.ok(thumb.visible, 'Thumb should be visible')

    // Thumb should be roughly circular
    const thumbWidth = thumb.bounds.width
    const thumbHeight = thumb.bounds.height
    api.assert.ok(
      Math.abs(thumbWidth - thumbHeight) < 4,
      `Thumb should be roughly square/circular, got ${thumbWidth}x${thumbHeight}`
    )
  }),

  // ==========================================================================
  // DEFAULT STATE
  // ==========================================================================

  testWithSetup('Switch is unchecked by default', 'Switch "Default off"', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // State check
    const isChecked = api.zag.isChecked('node-1')
    api.assert.ok(!isChecked, 'Switch should be unchecked by default')

    // Visual check - track should have inactive styling
    const tracks = api.preview.query('[data-slot="Track"]')
    api.assert.ok(tracks.length > 0, 'Track slot should exist')

    const trackBg = tracks[0].styles.backgroundColor
    // Unchecked typically has neutral/gray background
    api.assert.ok(
      trackBg.includes('51, 51, 51') || // #333
        trackBg.includes('68, 68, 68') || // #444
        trackBg.includes('85, 85, 85') || // #555
        trackBg.includes('128, 128, 128'), // gray
      `Unchecked track should have neutral background, got ${trackBg}`
    )
  }),

  testWithSetup(
    'Switch with checked attribute starts checked',
    'Switch "Notifications", checked',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // State check
      const isChecked = api.zag.isChecked('node-1')
      api.assert.ok(isChecked, 'Switch should be checked when "checked" attribute is set')

      // Visual check - track should have active styling
      const tracks = api.preview.query('[data-slot="Track"]')
      api.assert.ok(tracks.length > 0, 'Track slot should exist')

      const trackBg = tracks[0].styles.backgroundColor
      // Checked typically has accent color (blue/purple)
      api.assert.ok(
        trackBg.includes('34, 113, 193') || // #2271C1
          trackBg.includes('37, 99, 235') || // #2563eb
          trackBg.includes('59, 130, 246') || // #3b82f6
          trackBg.includes('79, 70, 229'), // #4F46E5 (runtime default)
        `Checked track should have accent background, got ${trackBg}`
      )
    }
  ),

  // ==========================================================================
  // INTERACTIONS
  // ==========================================================================

  testWithSetup('Switch toggles on click', 'Switch "Click me"', async (api: TestAPI) => {
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

  testWithSetup('Switch API methods work correctly', 'Switch "API test"', async (api: TestAPI) => {
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
  }),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled switch has correct visual state',
    'Switch "Disabled", disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled switch should render')

      // Visual indicators of disabled state
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      // Should have reduced opacity OR not-allowed cursor OR disabled pointer events
      const hasDisabledVisual =
        opacity < 1 || cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled switch should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
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
    'Disabled switch ignores clicks',
    'Switch "Cannot click", disabled',
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
      api.assert.ok(!afterClickChecked, 'Disabled switch should not change state on click')
    }
  ),

  testWithSetup(
    'Disabled checked switch stays checked',
    'Switch "Locked on", checked, disabled',
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
        'Disabled checked switch should stay checked after click attempt'
      )
    }
  ),

  // ==========================================================================
  // LABEL
  // ==========================================================================

  testWithSetup(
    'Switch label is rendered and clickable area',
    'Switch "Enable feature"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Label text should be visible either in Label slot or root
      const info = api.preview.inspect('node-1')
      api.assert.ok(
        info!.fullText.includes('Enable feature'),
        `Switch should contain label "Enable feature", got "${info!.fullText}"`
      )

      // Label slot should exist and be visible
      const labels = api.preview.query('[data-slot="Label"]')
      api.assert.ok(labels.length > 0, 'Switch should have a Label slot')
      api.assert.ok(labels[0].visible, 'Label slot should be visible')
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup('Switch exposes valid Zag state', 'Switch "State test"', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const state = api.zag.getState('node-1')

    // State should exist
    api.assert.ok(state !== null, 'Zag state should be available')

    // State should have expected structure
    api.assert.ok(typeof state === 'object', `State should be an object, got ${typeof state}`)

    // Should have scope or machine identifier
    const hasScope = 'scope' in state! || 'id' in state! || 'machine' in state!
    api.assert.ok(hasScope, 'State should have scope/id/machine identifier')
  }),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Switch respects custom styling',
    'Switch "Styled", bg #1a1a1a, pad 12, rad 8',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Styled switch should render')

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
])
