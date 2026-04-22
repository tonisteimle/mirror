/**
 * Slider Tests
 *
 * Comprehensive tests for the Slider Zag component.
 * Tests structure, values, interactions, disabled states, and styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sliderTests: TestCase[] = describe('Slider', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Slider renders with correct structure',
    'Slider value 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Slider root should exist')

      // Should have slider role
      const role = info!.attributes['role']
      api.assert.ok(
        role === 'slider' || role === 'group',
        `Slider should have role slider or group, got "${role}"`
      )
    }
  ),

  testWithSetup(
    'Slider has Track, Range, and Thumb slots',
    'Slider value 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find track (the full slider background)
      const tracks = api.preview.query('[data-slot="Track"]')
      api.assert.ok(tracks.length > 0, 'Should have a Track slot element')

      const track = tracks[0]
      api.assert.ok(track.visible, 'Track should be visible')

      // Track should have reasonable width
      const trackWidth = track.bounds.width
      api.assert.ok(trackWidth >= 50, `Track should have reasonable width, got ${trackWidth}px`)

      // Find range (the filled portion)
      const ranges = api.preview.query('[data-slot="Range"]')
      api.assert.ok(ranges.length > 0, 'Should have a Range slot element')

      const range = ranges[0]
      api.assert.ok(range.visible, 'Range should be visible')

      // Find thumb (the draggable handle)
      const thumbs = api.preview.query('[data-slot="Thumb"]')
      api.assert.ok(thumbs.length > 0, 'Should have a Thumb slot element')

      const thumb = thumbs[0]
      api.assert.ok(thumb.visible, 'Thumb should be visible')

      // Thumb should have cursor indicating draggable
      api.assert.ok(
        thumb.styles.cursor === 'pointer' || thumb.styles.cursor === 'grab',
        `Thumb should have pointer/grab cursor, got ${thumb.styles.cursor}`
      )
    }
  ),

  // ==========================================================================
  // VALUES
  // ==========================================================================

  testWithSetup('Slider has correct initial value', 'Slider value 50', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const value = api.zag.getValue('node-1')
    api.assert.ok(
      Number(value) === 50,
      `Slider value should be 50, got ${value} (type: ${typeof value})`
    )
  }),

  testWithSetup(
    'Slider respects min and max',
    'Slider min 0, max 100, value 25',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 25, `Slider value should be 25, got ${value}`)

      // Range should be approximately 25% of track width
      const tracks = api.preview.query('[data-slot="Track"]')
      const ranges = api.preview.query('[data-slot="Range"]')

      api.assert.ok(tracks.length > 0, 'Track slot should exist')
      api.assert.ok(ranges.length > 0, 'Range slot should exist')

      const trackWidth = tracks[0].bounds.width
      const rangeWidth = ranges[0].bounds.width
      const percentage = (rangeWidth / trackWidth) * 100

      // Allow some tolerance for styling differences
      api.assert.ok(
        Math.abs(percentage - 25) < 10,
        `Range should be ~25% of track, got ${percentage.toFixed(1)}%`
      )
    }
  ),

  testWithSetup(
    'Slider with step constrains values',
    'Slider min 0, max 100, step 10, value 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 50, `Slider value should be 50, got ${value}`)

      // Value should be on step boundary
      api.assert.ok(Number(value) % 10 === 0, `Value ${value} should be divisible by step 10`)
    }
  ),

  testWithSetup(
    'Slider value at minimum',
    'Slider min 0, max 100, value 0',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 0, `Slider value should be 0, got ${value}`)

      // Range should be minimal or zero
      const ranges = api.preview.query('[data-slot="Range"]')
      api.assert.ok(ranges.length > 0, 'Range slot should exist')

      const rangeWidth = ranges[0].bounds.width
      api.assert.ok(rangeWidth < 5, `Range at min value should be minimal, got ${rangeWidth}px`)
    }
  ),

  testWithSetup(
    'Slider value at maximum',
    'Slider min 0, max 100, value 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 100, `Slider value should be 100, got ${value}`)

      // Range should fill the track
      const tracks = api.preview.query('[data-slot="Track"]')
      const ranges = api.preview.query('[data-slot="Range"]')

      api.assert.ok(tracks.length > 0, 'Track slot should exist')
      api.assert.ok(ranges.length > 0, 'Range slot should exist')

      const trackWidth = tracks[0].bounds.width
      const rangeWidth = ranges[0].bounds.width
      const percentage = (rangeWidth / trackWidth) * 100

      api.assert.ok(
        percentage > 90,
        `Range at max should fill track (~100%), got ${percentage.toFixed(1)}%`
      )
    }
  ),

  // ==========================================================================
  // INTERACTIONS
  // ==========================================================================

  testWithSetup(
    'Slider setValue API works correctly',
    'Slider min 0, max 100, value 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial value
      api.assert.ok(Number(api.zag.getValue('node-1')) === 50, 'Should start at 50')

      // Set to 75
      await api.zag.setValue('node-1', 75)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 75, 'Should be 75 after setValue')

      // Set to 25
      await api.zag.setValue('node-1', 25)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 25, 'Should be 25 after setValue')

      // Set to min
      await api.zag.setValue('node-1', 0)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 0, 'Should be 0 after setValue')

      // Set to max
      await api.zag.setValue('node-1', 100)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 100, 'Should be 100 after setValue')
    }
  ),

  testWithSetup(
    'Slider visual updates with value change',
    'Slider min 0, max 100, value 20',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get initial thumb position
      const thumbsBefore = api.preview.query('[data-slot="Thumb"]')
      const thumbPositionBefore = thumbsBefore.length > 0 ? thumbsBefore[0].bounds.left : 0

      // Change value to 80
      await api.zag.setValue('node-1', 80)
      await api.utils.waitForIdle()

      // Get new thumb position
      const thumbsAfter = api.preview.query('[data-slot="Thumb"]')
      const thumbPositionAfter = thumbsAfter.length > 0 ? thumbsAfter[0].bounds.left : 0

      // Thumb should have moved right
      api.assert.ok(
        thumbPositionAfter > thumbPositionBefore,
        `Thumb should move right when value increases: before=${thumbPositionBefore}, after=${thumbPositionAfter}`
      )
    }
  ),

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  testWithSetup(
    'Disabled slider has correct visual state',
    'Slider value 30, disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Disabled slider should render')

      // Visual indicators of disabled state
      const opacity = parseFloat(info!.styles.opacity)
      const cursor = info!.styles.cursor
      const pointerEvents = info!.styles.pointerEvents

      const hasDisabledVisual =
        opacity < 1 || cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        hasDisabledVisual,
        `Disabled slider should have visual indication: opacity=${opacity}, cursor=${cursor}, pointerEvents=${pointerEvents}`
      )

      // Value should still be correct
      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 30, `Disabled slider should have value 30, got ${value}`)
    }
  ),

  testWithSetup(
    'Disabled slider thumb has correct cursor',
    'Slider value 50, disabled',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const thumbs = api.preview.query('[data-slot="Thumb"]')
      api.assert.ok(thumbs.length > 0, 'Thumb slot should exist')

      const cursor = thumbs[0].styles.cursor
      const pointerEvents = thumbs[0].styles.pointerEvents

      const isDisabled =
        cursor === 'not-allowed' || cursor === 'default' || pointerEvents === 'none'

      api.assert.ok(
        isDisabled,
        `Disabled thumb should not be draggable: cursor=${cursor}, pointerEvents=${pointerEvents}`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup('Slider exposes valid Zag state', 'Slider value 50', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const state = api.zag.getState('node-1')

    api.assert.ok(state !== null, 'Zag state should be available')
    api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)

    // Should have value or context
    api.assert.ok(
      'value' in state! || 'context' in state!,
      'State should have value or context property'
    )
  }),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Slider track respects styling',
    'Slider value 50, w 300, h 8',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Styled slider should render')

      // Check width
      const width = info!.bounds.width
      api.assert.ok(Math.abs(width - 300) < 10, `Slider width should be ~300px, got ${width}px`)
    }
  ),

  testWithSetup(
    'Slider range has accent color when filled',
    'Slider min 0, max 100, value 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const ranges = api.preview.query('[data-slot="Range"]')
      api.assert.ok(ranges.length > 0, 'Range slot should exist')

      const range = ranges[0]
      const bgColor = range.styles.backgroundColor

      // Range should have some color (accent color)
      api.assert.ok(
        bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)',
        `Range should have a background color, got ${bgColor}`
      )
    }
  ),

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  testWithSetup(
    'Slider with small range works',
    'Slider min 0, max 10, value 5, step 1',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 5, `Slider value should be 5, got ${value}`)

      // Change to 7
      await api.zag.setValue('node-1', 7)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 7, 'Should update to 7')
    }
  ),

  testWithSetup(
    'Slider with large range works',
    'Slider min 0, max 1000, value 500, step 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(Number(value) === 500, `Slider value should be 500, got ${value}`)

      // Change to 750
      await api.zag.setValue('node-1', 750)
      await api.utils.waitForIdle()

      api.assert.ok(Number(api.zag.getValue('node-1')) === 750, 'Should update to 750')
    }
  ),

  testWithSetup(
    'Slider with decimal step works',
    'Slider min 0, max 1, value 0.5, step 0.1',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const value = api.zag.getValue('node-1')
      api.assert.ok(
        Math.abs(Number(value) - 0.5) < 0.01,
        `Slider value should be 0.5, got ${value}`
      )

      // Change to 0.7
      await api.zag.setValue('node-1', 0.7)
      await api.utils.waitForIdle()

      const newValue = api.zag.getValue('node-1')
      api.assert.ok(
        Math.abs(Number(newValue) - 0.7) < 0.01,
        `Should update to 0.7, got ${newValue}`
      )
    }
  ),
])
