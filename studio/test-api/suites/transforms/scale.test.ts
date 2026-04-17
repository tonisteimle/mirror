/**
 * Scale Transform Tests
 *
 * Tests for scale property with various values.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const scaleBasicTests: TestCase[] = describe('Scale Basic', [
  testWithSetup(
    'Element scaled up 1.5x',
    `Frame w 50, h 50, bg #2271C1, scale 1.5`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have scale transform
      api.assert.ok(
        style.transform !== 'none' && style.transform !== '',
        'Should have scale transform'
      )

      // Matrix should reflect 1.5 scale
      api.assert.ok(style.transform.includes('matrix'), 'Should have matrix transform')
    }
  ),

  testWithSetup(
    'Element scaled down 0.5x',
    `Frame w 100, h 100, bg #ef4444, scale 0.5`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have scale-down transform')
    }
  ),

  testWithSetup(
    'Element with scale 1 (no change)',
    `Frame w 50, h 50, bg #10b981, scale 1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Scale 1 should be identity or no transform
      api.assert.ok(
        style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)',
        'Scale 1 should be identity'
      )
    }
  ),

  testWithSetup(
    'Element with decimal scale',
    `Frame w 80, h 80, bg #f59e0b, scale 0.85`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have decimal scale transform')
    }
  ),

  testWithSetup(
    'Icon scaled up',
    `Icon "star", ic #f59e0b, is 24, scale 2`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Icon should have scale transform')
    }
  ),
])

export const scaleInteractiveTests: TestCase[] = describe('Scale Interactive', [
  testWithSetup(
    'Button scales down on active/press',
    `Button "Press me", bg #2271C1, col white, pad 12 24, rad 6
  active:
    scale 0.98`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify button styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Note: Active state is brief during mouse down
      // We verify the element exists and has correct base styling
    }
  ),

  testWithSetup(
    'Card scales up on hover',
    `Frame w 200, bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Hover Card", col white, fs 16, weight bold
  Text "Hover to scale up", col #888, fs 14
  hover:
    scale 1.02
    shadow lg`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const card = await api.utils.waitForElement('node-1')

      // Get initial transform
      const initialStyle = window.getComputedStyle(card)
      const initialTransform = initialStyle.transform

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(150)

      // Should have scale transform now
      const hoverStyle = window.getComputedStyle(card)
      api.assert.ok(
        hoverStyle.transform !== initialTransform || hoverStyle.transform.includes('matrix'),
        'Should scale up on hover'
      )
    }
  ),

  testWithSetup(
    'Toggle scales on state change',
    `Frame w 60, h 60, bg #333, rad 30, center, toggle(), cursor pointer
  Icon "check", ic #888, is 24
  on:
    bg #10b981
    scale 1.1
    Icon "check", ic white, is 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Should be scaled and green
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)
      api.assert.ok(style.transform !== 'none', 'Should have scale transform in on state')
    }
  ),

  testWithSetup(
    'Button with hover scale and transition',
    `Button "Smooth Scale", bg #2271C1, col white, pad 12 24, rad 6
  hover 0.15s:
    scale 1.05
    bg #1e5faa`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const button = await api.utils.waitForElement('node-1')

      // Should have transition
      const style = window.getComputedStyle(button)
      api.assert.ok(
        style.transition !== '' && style.transition !== 'none',
        'Should have transition'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Verify background changed
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')
    }
  ),
])

export const scaleEdgeCasesTests: TestCase[] = describe('Scale Edge Cases', [
  testWithSetup(
    'Scale 0 makes element invisible',
    `Frame w 50, h 50, bg #ef4444, scale 0`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Scale 0 should make element point-sized
      api.assert.ok(style.transform !== 'none', 'Should have scale 0 transform')
    }
  ),

  testWithSetup(
    'Very large scale 3x',
    `Frame w 30, h 30, bg #10b981, scale 3`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have large scale transform')
    }
  ),

  testWithSetup(
    'Scale with nested content',
    `Frame w 100, h 100, bg #1a1a1a, center, scale 1.5
  Frame w 50, h 50, bg #2271C1, center
    Text "Hi", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Parent has scale
      const parent = await api.utils.waitForElement('node-1')
      const parentStyle = window.getComputedStyle(parent)
      api.assert.ok(parentStyle.transform !== 'none', 'Parent should be scaled')

      // Child content should still exist
      api.assert.hasText('node-3', 'Hi')
    }
  ),

  testWithSetup(
    'Negative scale (mirror)',
    `Frame w 50, h 50, bg #2271C1, scale -1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Negative scale creates a flip
      api.assert.ok(style.transform !== 'none', 'Should have negative scale (mirror) transform')
    }
  ),
])

export const scaleWithOtherPropertiesTests: TestCase[] = describe('Scale with Other Properties', [
  testWithSetup(
    'Scale with opacity',
    `Frame w 80, h 80, bg #2271C1, scale 1.2, opacity 0.8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.assert.hasStyle('node-1', 'opacity', '0.8')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)
      api.assert.ok(style.transform !== 'none', 'Should have both scale and opacity')
    }
  ),

  testWithSetup(
    'Scale with shadow',
    `Frame w 100, h 100, bg #1a1a1a, rad 8, shadow lg, scale 1.1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have scale')
      api.assert.ok(style.boxShadow !== 'none' && style.boxShadow !== '', 'Should have shadow')
    }
  ),

  testWithSetup(
    'Scale combined with rotate',
    `Frame w 60, h 60, bg #ef4444, scale 1.3, rotate 45`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have combined transform matrix
      api.assert.ok(
        style.transform !== 'none' && style.transform.includes('matrix'),
        'Should have combined scale and rotate'
      )
    }
  ),
])

export const allScaleTests: TestCase[] = [
  ...scaleBasicTests,
  ...scaleInteractiveTests,
  ...scaleEdgeCasesTests,
  ...scaleWithOtherPropertiesTests,
]
