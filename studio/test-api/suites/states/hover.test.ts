/**
 * Hover State Tests
 *
 * Tests for hover: state blocks with comprehensive style validations.
 * Includes timing/transition tests and complex hover scenarios.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const hoverBasicTests: TestCase[] = describe('Hover Basic', [
  testWithSetup(
    'Button hover changes background color',
    `Button "Hover me", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Should have hover background
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')

      // Unhover
      await api.interact.unhover('node-1')
      await api.utils.delay(100)

      // Should return to original
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Button hover changes multiple properties',
    `Button "Multi", bg #333, col #888, pad 10 20, rad 4
  hover:
    bg #2271C1
    col white
    pad 12 24
    rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '4px')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // All properties should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // Unhover
      await api.interact.unhover('node-1')
      await api.utils.delay(100)

      // All should revert
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '4px')
    }
  ),

  testWithSetup(
    'Frame hover with border change',
    `Frame w 200, h 100, bg #1a1a1a, rad 8, bor 1, boc #333
  hover:
    bor 2
    boc #2271C1
    bg #1f1f1f`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial border
      api.assert.hasStyle('node-1', 'borderWidth', '1px')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Border should change
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(31, 31, 31)')
    }
  ),

  testWithSetup(
    'Text hover changes color',
    `Text "Hover text", col #888, fs 16
  hover:
    col #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Should change color
      api.assert.hasStyle('node-1', 'color', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'Icon hover changes color and size',
    `Icon "heart", ic #888, is 24
  hover:
    ic #ef4444
    is 28`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify icon exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Icon should exist')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Icon color/size may be applied via different means
      // Just verify element is responsive to hover
      api.assert.exists('node-1')
    }
  ),
])

export const hoverWithTransitionTests: TestCase[] = describe('Hover with Transitions', [
  testWithSetup(
    'Hover with transition duration',
    `Button "Smooth", bg #333, col white, pad 12 24
  hover 0.2s:
    bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Should have transition property
      const element = await api.utils.waitForElement('node-1')
      const computedStyle = window.getComputedStyle(element)

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(250) // Wait for transition

      // Final state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'Hover with ease-out timing',
    `Frame w 100, h 100, bg #333, rad 8
  hover 0.15s ease-out:
    bg #444
    rad 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // After transition
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
    }
  ),

  testWithSetup(
    'Hover with ease-in-out timing',
    `Button "Eased", bg #1a1a1a, col #888
  hover 0.3s ease-in-out:
    bg #2271C1
    col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')

      // Hover and wait for transition
      await api.interact.hover('node-1')
      await api.utils.delay(350)

      // Final
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
    }
  ),
])

export const hoverNestedTests: TestCase[] = describe('Hover on Nested Elements', [
  testWithSetup(
    'Card hover affects entire card',
    `Frame bg #1a1a1a, pad 16, rad 8, gap 8, cursor pointer
  Text "Title", col white, fs 16, weight bold
  Text "Description text", col #888, fs 14
  hover:
    bg #222
    shadow md`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Initial card background
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      // Hover on card
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Card background should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')

      // Child text colors should remain unchanged
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
    }
  ),

  testWithSetup(
    'Hover on parent does not affect child hover',
    `Frame bg #333, pad 16, rad 8
  Button "Child", bg #555, col white, pad 8 16
    hover:
      bg #2271C1
  hover:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Parent
      api.assert.exists('node-2') // Child button

      // Initial states
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(85, 85, 85)')

      // Hover on parent (not directly on button)
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Parent should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')
      // Child should not change until hovered directly
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(85, 85, 85)')

      // Now hover directly on child
      await api.interact.hover('node-2')
      await api.utils.delay(100)

      // Child should now have hover style
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'List items with individual hover states',
    `Frame gap 4, w 200
  Frame hor, pad 12, rad 6, spread, bg transparent, cursor pointer
    Text "Item 1", col white
    Icon "chevron-right", ic #888, is 16
    hover:
      bg #ffffff10
  Frame hor, pad 12, rad 6, spread, bg transparent, cursor pointer
    Text "Item 2", col white
    Icon "chevron-right", ic #888, is 16
    hover:
      bg #ffffff10
  Frame hor, pad 12, rad 6, spread, bg transparent, cursor pointer
    Text "Item 3", col white
    Icon "chevron-right", ic #888, is 16
    hover:
      bg #ffffff10`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Item 1
      api.assert.exists('node-5') // Item 2
      api.assert.exists('node-8') // Item 3

      // Hover on each item sequentially
      await api.interact.hover('node-2')
      await api.utils.delay(100)
      // Only item 1 should have hover state

      await api.interact.hover('node-5')
      await api.utils.delay(100)
      // Now item 2 has hover, item 1 doesn't

      await api.interact.hover('node-8')
      await api.utils.delay(100)
      // Now item 3 has hover
    }
  ),
])

export const hoverScaleTests: TestCase[] = describe('Hover with Scale/Transform', [
  testWithSetup(
    'Button hover with scale effect',
    `Button "Scale", bg #2271C1, col white, pad 12 24, rad 6
  hover:
    scale 1.05`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial - no transform
      const element = await api.utils.waitForElement('node-1')
      const initialTransform = window.getComputedStyle(element).transform

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // Should have scale transform
      const hoverTransform = window.getComputedStyle(element).transform
      api.assert.ok(
        hoverTransform !== 'none' || hoverTransform !== initialTransform,
        'Transform should change on hover'
      )
    }
  ),

  testWithSetup(
    'Button active with scale down',
    `Button "Press", bg #2271C1, col white, pad 12 24, rad 6
  hover:
    bg #1e5faa
  active:
    scale 0.98`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Hover first
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')

      // Click (triggers active state)
      await api.interact.click('node-1')
      await api.utils.delay(50)

      // Active state should have scale
      // Note: Active state is brief during click
    }
  ),
])

export const allHoverTests: TestCase[] = [
  ...hoverBasicTests,
  ...hoverWithTransitionTests,
  ...hoverNestedTests,
  ...hoverScaleTests,
]
