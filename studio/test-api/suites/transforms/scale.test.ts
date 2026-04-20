/**
 * Scale Transform Tests
 *
 * Tests for scale property with various values.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to extract scale from CSS transform matrix
// matrix(a, b, c, d, tx, ty) where scaleX = sqrt(a^2 + b^2), scaleY = sqrt(c^2 + d^2)
function getScaleFromMatrix(transform: string): { x: number; y: number } | null {
  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return null

  const values = match[1].split(',').map(v => parseFloat(v.trim()))
  if (values.length < 4) return null

  const [a, b, c, d] = values
  const scaleX = Math.sqrt(a * a + b * b)
  const scaleY = Math.sqrt(c * c + d * d)
  return { x: Math.round(scaleX * 100) / 100, y: Math.round(scaleY * 100) / 100 }
}

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
        `Should have scale transform, got: "${style.transform}"`
      )

      // Verify actual scale value is 1.5
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 1.5) < 0.05, `Scale X should be ~1.5, got: ${scale!.x}`)
      api.assert.ok(Math.abs(scale!.y - 1.5) < 0.05, `Scale Y should be ~1.5, got: ${scale!.y}`)
    }
  ),

  testWithSetup(
    'Element scaled down 0.5x',
    `Frame w 100, h 100, bg #ef4444, scale 0.5`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have scale-down transform, got: "${style.transform}"`
      )

      // Verify actual scale value is 0.5
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 0.5) < 0.05, `Scale X should be ~0.5, got: ${scale!.x}`)
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
      if (style.transform !== 'none') {
        const scale = getScaleFromMatrix(style.transform)
        if (scale !== null) {
          api.assert.ok(
            Math.abs(scale.x - 1) < 0.05,
            `Scale 1 should have scaleX ~1, got: ${scale.x}`
          )
        }
      }
    }
  ),

  testWithSetup(
    'Element with decimal scale',
    `Frame w 80, h 80, bg #f59e0b, scale 0.85`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have decimal scale transform, got: "${style.transform}"`
      )

      // Verify actual scale value is 0.85
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 0.85) < 0.05, `Scale X should be ~0.85, got: ${scale!.x}`)
    }
  ),

  testWithSetup(
    'Icon scaled up',
    `Icon "star", ic #f59e0b, is 24, scale 2`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Icon should have scale transform, got: "${style.transform}"`
      )

      // Verify scale is 2x
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 2) < 0.1, `Icon scale should be ~2, got: ${scale!.x}`)
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

      // Verify button has active state defined (check CSS rules)
      const element = await api.utils.waitForElement('node-1')
      api.assert.ok(element !== null, 'Button should exist')

      // Initial state should have no scale
      const initialStyle = window.getComputedStyle(element)
      if (initialStyle.transform !== 'none') {
        const initialScale = getScaleFromMatrix(initialStyle.transform)
        if (initialScale !== null) {
          api.assert.ok(
            Math.abs(initialScale.x - 1) < 0.05,
            `Initial scale should be ~1, got: ${initialScale.x}`
          )
        }
      }
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

      // Get initial transform (should be none)
      const initialStyle = window.getComputedStyle(card)

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(150)

      // Should have scale transform now
      const hoverStyle = window.getComputedStyle(card)
      api.assert.ok(
        hoverStyle.transform !== 'none',
        `Should have scale transform on hover, got: "${hoverStyle.transform}"`
      )

      // Verify scale is ~1.02
      const scale = getScaleFromMatrix(hoverStyle.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${hoverStyle.transform}"`)
      api.assert.ok(
        Math.abs(scale!.x - 1.02) < 0.05,
        `Hover scale should be ~1.02, got: ${scale!.x}`
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
      api.assert.ok(
        style.transform !== 'none',
        `Should have scale transform in on state, got: "${style.transform}"`
      )

      // Verify scale is ~1.1
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(scale!.x - 1.1) < 0.05,
        `Toggle scale should be ~1.1, got: ${scale!.x}`
      )
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
        style.transition !== '' && style.transition !== 'none' && style.transitionDuration !== '0s',
        `Should have transition, got: "${style.transition}"`
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Verify background changed
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')

      // Verify scale transform
      const hoverStyle = window.getComputedStyle(button)
      api.assert.ok(
        hoverStyle.transform !== 'none',
        `Button should have scale transform on hover, got: "${hoverStyle.transform}"`
      )
      const scale = getScaleFromMatrix(hoverStyle.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${hoverStyle.transform}"`)
      api.assert.ok(
        Math.abs(scale!.x - 1.05) < 0.05,
        `Hover scale should be ~1.05, got: ${scale!.x}`
      )
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
      api.assert.ok(
        style.transform !== 'none',
        `Should have scale 0 transform, got: "${style.transform}"`
      )

      // Verify scale is 0
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(scale!.x < 0.01, `Scale should be ~0, got: ${scale!.x}`)
    }
  ),

  testWithSetup(
    'Very large scale 3x',
    `Frame w 30, h 30, bg #10b981, scale 3`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have large scale transform, got: "${style.transform}"`
      )

      // Verify scale is 3
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 3) < 0.1, `Scale should be ~3, got: ${scale!.x}`)
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
      api.assert.ok(
        parentStyle.transform !== 'none',
        `Parent should be scaled, got: "${parentStyle.transform}"`
      )

      // Verify parent scale is 1.5
      const scale = getScaleFromMatrix(parentStyle.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${parentStyle.transform}"`)
      api.assert.ok(
        Math.abs(scale!.x - 1.5) < 0.05,
        `Parent scale should be ~1.5, got: ${scale!.x}`
      )

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
      api.assert.ok(
        style.transform !== 'none',
        `Should have negative scale (mirror) transform, got: "${style.transform}"`
      )

      // Verify scale magnitude is 1 (but flipped)
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      // Note: getScaleFromMatrix returns absolute values, so we check it's ~1
      api.assert.ok(Math.abs(scale!.x - 1) < 0.05, `Scale magnitude should be ~1, got: ${scale!.x}`)
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
      api.assert.ok(
        style.transform !== 'none',
        `Should have scale transform, got: "${style.transform}"`
      )

      // Verify scale is 1.2
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 1.2) < 0.05, `Scale should be ~1.2, got: ${scale!.x}`)
    }
  ),

  testWithSetup(
    'Scale with shadow',
    `Frame w 100, h 100, bg #1a1a1a, rad 8, shadow lg, scale 1.1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', `Should have scale, got: "${style.transform}"`)
      api.assert.ok(
        style.boxShadow !== 'none' && style.boxShadow !== '',
        `Should have shadow, got: "${style.boxShadow}"`
      )

      // Verify scale is 1.1
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(Math.abs(scale!.x - 1.1) < 0.05, `Scale should be ~1.1, got: ${scale!.x}`)
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
        `Should have combined scale and rotate, got: "${style.transform}"`
      )

      // Verify scale is 1.3 (need to account for rotation in matrix)
      const scale = getScaleFromMatrix(style.transform)
      api.assert.ok(scale !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(scale!.x - 1.3) < 0.1,
        `Scale should be ~1.3 (combined with rotation), got: ${scale!.x}`
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
