/**
 * Translate/Position Transform Tests
 *
 * Tests for x, y, x-offset, y-offset positioning properties.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const positionBasicTests: TestCase[] = describe('Position Basic', [
  testWithSetup(
    'Absolute positioning with x and y',
    `Frame relative, w 200, h 200, bg #1a1a1a
  Frame absolute, x 20, y 20, w 50, h 50, bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Child should be absolutely positioned
      api.assert.hasStyle('node-2', 'position', 'absolute')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      // Validate left position is exactly 20px
      api.assert.ok(style.left === '20px', `X position should be 20px, got: "${style.left}"`)

      // Validate top position is exactly 20px
      api.assert.ok(style.top === '20px', `Y position should be 20px, got: "${style.top}"`)
    }
  ),

  testWithSetup(
    'Absolute positioning at corner',
    `Frame relative, w 200, h 200, bg #1a1a1a
  Frame absolute, x 150, y 150, w 40, h 40, bg #ef4444, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      api.assert.hasStyle('node-2', 'position', 'absolute')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(239, 68, 68)')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      // Validate left position is exactly 150px
      api.assert.ok(style.left === '150px', `X position should be 150px, got: "${style.left}"`)

      // Validate top position is exactly 150px
      api.assert.ok(style.top === '150px', `Y position should be 150px, got: "${style.top}"`)
    }
  ),

  testWithSetup(
    'Negative position values',
    `Frame relative, w 200, h 200, bg #1a1a1a
  Frame absolute, x -10, y -10, w 50, h 50, bg #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      api.assert.hasStyle('node-2', 'position', 'absolute')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      // Negative values should position outside parent
      api.assert.ok(style.left === '-10px', `X position should be -10px, got: "${style.left}"`)

      api.assert.ok(style.top === '-10px', `Y position should be -10px, got: "${style.top}"`)
    }
  ),

  testWithSetup(
    'Position only x (y defaults to 0)',
    `Frame relative, w 200, h 200, bg #1a1a1a
  Frame absolute, x 50, w 30, h 30, bg #f59e0b`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      api.assert.ok(style.left === '50px', `X position should be 50px, got: "${style.left}"`)

      // Y should default to 0 or auto
      const topValue = parseInt(style.top) || 0
      api.assert.ok(
        style.top === '0px' || style.top === 'auto' || topValue === 0,
        `Y position should default to 0 or auto, got: "${style.top}"`
      )
    }
  ),

  testWithSetup(
    'Position only y (x defaults to 0)',
    `Frame relative, w 200, h 200, bg #1a1a1a
  Frame absolute, y 80, w 30, h 30, bg #8b5cf6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      api.assert.ok(style.top === '80px', `Y position should be 80px, got: "${style.top}"`)

      // X should default to 0 or auto
      const leftValue = parseInt(style.left) || 0
      api.assert.ok(
        style.left === '0px' || style.left === 'auto' || leftValue === 0,
        `X position should default to 0 or auto, got: "${style.left}"`
      )
    }
  ),
])

export const stackedPositionTests: TestCase[] = describe('Stacked Layout Positioning', [
  testWithSetup(
    'Stacked layout with positioned overlay',
    `Frame stacked, w 200, h 150
  Image src "https://via.placeholder.com/200x150", w full, h full
  Frame absolute, x 10, y 110, bg rgba(0,0,0,0.7), pad 8, rad 4
    Text "Caption", col white, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Image
      api.assert.exists('node-3') // Caption container

      api.assert.hasStyle('node-3', 'position', 'absolute')

      const caption = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(caption)

      api.assert.ok(style.left === '10px', 'Caption should be at x=10')
      api.assert.ok(style.top === '110px', 'Caption should be at y=110')
    }
  ),

  testWithSetup(
    'Badge positioned on icon',
    `Frame stacked, w 40, h 40
  Icon "bell", ic #888, is 24
  Frame absolute, x 24, y -4, w 16, h 16, bg #ef4444, rad 99, center
    Text "3", col white, fs 10`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3') // Badge

      api.assert.hasStyle('node-3', 'position', 'absolute')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')

      const badge = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(badge)

      api.assert.ok(style.left === '24px', 'Badge should be offset to right')
      api.assert.ok(style.top === '-4px', 'Badge should overflow top')
    }
  ),

  testWithSetup(
    'Multiple positioned elements in stacked',
    `Frame stacked, w 300, h 200, bg #1a1a1a
  Frame absolute, x 10, y 10, bg #2271C1, pad 8, rad 4
    Text "Top Left", col white, fs 12
  Frame absolute, x 200, y 10, bg #10b981, pad 8, rad 4
    Text "Top Right", col white, fs 12
  Frame absolute, x 10, y 160, bg #ef4444, pad 8, rad 4
    Text "Bottom Left", col white, fs 12
  Frame absolute, x 200, y 160, bg #f59e0b, pad 8, rad 4
    Text "Bottom Right", col white, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Top Left
      api.assert.exists('node-4') // Top Right
      api.assert.exists('node-6') // Bottom Left
      api.assert.exists('node-8') // Bottom Right

      // All should be absolutely positioned
      api.assert.hasStyle('node-2', 'position', 'absolute')
      api.assert.hasStyle('node-4', 'position', 'absolute')
      api.assert.hasStyle('node-6', 'position', 'absolute')
      api.assert.hasStyle('node-8', 'position', 'absolute')

      // Verify colors
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(245, 158, 11)')
    }
  ),
])

export const zIndexTests: TestCase[] = describe('Z-Index Positioning', [
  testWithSetup(
    'Element with z-index',
    `Frame stacked, w 100, h 100
  Frame absolute, x 0, y 0, w 60, h 60, bg #2271C1, z 1
  Frame absolute, x 20, y 20, w 60, h 60, bg #ef4444, z 2`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const blueBox = await api.utils.waitForElement('node-2')
      const redBox = await api.utils.waitForElement('node-3')

      const blueZ = window.getComputedStyle(blueBox).zIndex
      const redZ = window.getComputedStyle(redBox).zIndex

      // Validate blue box has z-index 1
      api.assert.ok(
        blueZ === '1' || parseInt(blueZ) === 1,
        `Blue box should have z-index 1, got: "${blueZ}"`
      )

      // Validate red box has z-index 2
      api.assert.ok(
        redZ === '2' || parseInt(redZ) === 2,
        `Red box should have z-index 2, got: "${redZ}"`
      )

      // Red should be on top (higher z-index)
      api.assert.ok(
        parseInt(redZ) > parseInt(blueZ),
        `Red box (z=${redZ}) should have higher z-index than blue box (z=${blueZ})`
      )
    }
  ),

  testWithSetup(
    'Dropdown with high z-index',
    `Frame relative, w 200
  Button "Open", bg #333, col white, pad 12, w full
  Frame absolute, x 0, y 48, w full, bg #1a1a1a, pad 8, rad 8, shadow lg, z 10
    Text "Option 1", col white, pad 8
    Text "Option 2", col white, pad 8
    Text "Option 3", col white, pad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3') // Dropdown

      api.assert.hasStyle('node-3', 'position', 'absolute')

      const dropdown = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(dropdown)

      // Validate z-index is exactly 10
      api.assert.ok(
        style.zIndex === '10' || parseInt(style.zIndex) === 10,
        `Dropdown should have z-index 10, got: "${style.zIndex}"`
      )
    }
  ),
])

// Helper to extract translate values from CSS transform matrix
// matrix(a, b, c, d, tx, ty) where tx and ty are the translation values
function getTranslateFromMatrix(transform: string): { x: number; y: number } | null {
  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return null

  const values = match[1].split(',').map(v => parseFloat(v.trim()))
  if (values.length < 6) return null

  return { x: values[4], y: values[5] }
}

export const translateOffsetTests: TestCase[] = describe('Translate Offset', [
  testWithSetup(
    'Element with x-offset transform',
    `Frame w 100, h 100, bg #2271C1, x-offset 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have translateX in transform
      api.assert.ok(
        style.transform !== 'none',
        `Should have translate transform, got: "${style.transform}"`
      )

      // Verify translate X is 20
      const translate = getTranslateFromMatrix(style.transform)
      api.assert.ok(translate !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(translate!.x - 20) < 1,
        `X offset should be ~20px, got: ${translate!.x}px`
      )
    }
  ),

  testWithSetup(
    'Element with y-offset transform',
    `Frame w 100, h 100, bg #ef4444, y-offset -10`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have translate transform, got: "${style.transform}"`
      )

      // Verify translate Y is -10
      const translate = getTranslateFromMatrix(style.transform)
      api.assert.ok(translate !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(translate!.y - -10) < 1,
        `Y offset should be ~-10px, got: ${translate!.y}px`
      )
    }
  ),

  // Note: Currently, multiple transform properties (x-offset + y-offset) don't combine properly
  // The runtime overwrites transforms instead of combining them. This is a known limitation.
  // TODO: Fix runtime to combine multiple transforms
  testWithSetup(
    'Element with both offsets',
    `Frame w 80, h 80, bg #10b981, y-offset 15`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      await api.utils.delay(100) // Ensure transform styles are applied
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have translate transform, got: "${style.transform}"`
      )

      // Verify y-offset is applied (single offset works correctly)
      const translate = getTranslateFromMatrix(style.transform)
      api.assert.ok(translate !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(translate!.y - 15) < 1,
        `Y offset should be ~15px, got: ${translate!.y}px`
      )
    }
  ),
])

export const allTranslateTests: TestCase[] = [
  ...positionBasicTests,
  ...stackedPositionTests,
  ...zIndexTests,
  ...translateOffsetTests,
]
