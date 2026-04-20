/**
 * Rotate Transform Tests
 *
 * Tests for rotate/rot property with various angles.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to extract rotation angle from CSS transform matrix
// matrix(a, b, c, d, tx, ty) where rotation = atan2(b, a) in radians
function getRotationFromMatrix(transform: string): number | null {
  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return null

  const values = match[1].split(',').map(v => parseFloat(v.trim()))
  if (values.length < 2) return null

  const [a, b] = values
  const radians = Math.atan2(b, a)
  const degrees = radians * (180 / Math.PI)
  return Math.round(degrees)
}

export const rotateBasicTests: TestCase[] = describe('Rotate Basic', [
  testWithSetup(
    'Icon rotated 45 degrees',
    `Icon "arrow-right", ic #2271C1, is 24, rotate 45`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have transform with rotation
      api.assert.ok(
        style.transform !== 'none' && style.transform !== '',
        `Should have transform applied, got: "${style.transform}"`
      )

      // Verify actual rotation angle is ~45 degrees
      const rotation = getRotationFromMatrix(style.transform)
      api.assert.ok(rotation !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(rotation! - 45) < 2,
        `Rotation should be ~45 degrees, got: ${rotation} degrees`
      )
    }
  ),

  testWithSetup(
    'Icon rotated 90 degrees',
    `Icon "chevron-down", ic #888, is 20, rotate 90`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have rotation transform, got: "${style.transform}"`
      )

      // Verify actual rotation angle is ~90 degrees
      const rotation = getRotationFromMatrix(style.transform)
      api.assert.ok(rotation !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(rotation! - 90) < 2,
        `Rotation should be ~90 degrees, got: ${rotation} degrees`
      )
    }
  ),

  testWithSetup(
    'Icon rotated 180 degrees',
    `Icon "arrow-up", ic #10b981, is 24, rot 180`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have 180 degree rotation, got: "${style.transform}"`
      )

      // 180 degree rotation: matrix(-1, 0, 0, -1, 0, 0) gives atan2(0, -1) = 180 or -180
      const rotation = getRotationFromMatrix(style.transform)
      api.assert.ok(rotation !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(Math.abs(rotation!) - 180) < 2,
        `Rotation should be ~180 degrees, got: ${rotation} degrees`
      )
    }
  ),

  testWithSetup(
    'Icon rotated -45 degrees (counter-clockwise)',
    `Icon "arrow-right", ic #ef4444, is 24, rotate -45`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have negative rotation, got: "${style.transform}"`
      )

      // Verify actual rotation angle is ~-45 degrees
      const rotation = getRotationFromMatrix(style.transform)
      api.assert.ok(rotation !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(rotation! - -45) < 2,
        `Rotation should be ~-45 degrees, got: ${rotation} degrees`
      )
    }
  ),

  testWithSetup(
    'Frame rotated with content',
    `Frame w 100, h 100, bg #2271C1, center, rotate 15
  Text "Tilted", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Parent frame should be rotated
      const frame = await api.utils.waitForElement('node-1')
      const frameStyle = window.getComputedStyle(frame)

      api.assert.ok(frameStyle.transform !== 'none', 'Frame should be rotated')

      // Child text should still be readable (inherits rotation)
      api.assert.hasText('node-2', 'Tilted')
    }
  ),
])

export const rotateWithOtherTransformsTests: TestCase[] = describe('Rotate with Other Transforms', [
  testWithSetup(
    'Rotate combined with scale',
    `Frame w 100, h 100, bg #10b981, center, rotate 45, scale 1.2
  Icon "star", ic white, is 32`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have combined transform
      api.assert.ok(
        style.transform !== 'none' && style.transform !== '',
        'Should have combined transform'
      )

      // Matrix should reflect both rotation and scale
      api.assert.ok(style.transform.includes('matrix'), 'Should have matrix transform')
    }
  ),

  testWithSetup(
    'Rotate with position offset',
    `Frame relative, w 200, h 200
  Frame absolute, x 50, y 50, w 60, h 60, bg #ef4444, rotate 30`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const child = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(child)

      // Should be positioned and rotated
      api.assert.ok(style.position === 'absolute', 'Should be absolutely positioned')
      api.assert.ok(style.transform !== 'none', 'Should be rotated')
    }
  ),
])

export const rotateInteractiveTests: TestCase[] = describe('Rotate Interactive', [
  testWithSetup(
    'Icon with hover rotation defined',
    `Icon "settings", ic #888, is 24
  hover:
    rotate 90
    ic #2271C1`,
    async (api: TestAPI) => {
      // Verify element renders correctly
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      api.assert.ok(element !== null, 'Icon should exist')

      // Get initial transform (should be none or identity)
      const initialStyle = window.getComputedStyle(element)
      const initialTransform = initialStyle.transform

      // Hover over element
      await api.interact.hover('node-1')
      await api.utils.delay(100)

      // After hover, should have rotation transform
      const hoverStyle = window.getComputedStyle(element)
      api.assert.ok(
        hoverStyle.transform !== 'none',
        `Should have rotation on hover, got: "${hoverStyle.transform}"`
      )

      // Verify rotation is ~90 degrees
      const rotation = getRotationFromMatrix(hoverStyle.transform)
      api.assert.ok(
        rotation !== null,
        `Transform should be a matrix, got: "${hoverStyle.transform}"`
      )
      api.assert.ok(
        Math.abs(rotation! - 90) < 5,
        `Hover rotation should be ~90 degrees, got: ${rotation!} degrees`
      )
    }
  ),

  testWithSetup(
    'Frame with rotation on toggle',
    `Frame w 60, h 60, bg #333, rad 8, center, toggle(), cursor pointer
  Icon "arrow-up", ic #888, is 24
  on:
    bg #2271C1
    rotate 180`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial - no rotation
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      const initial = await api.utils.waitForElement('node-1')
      const initialTransform = window.getComputedStyle(initial).transform

      // Initial should have no rotation (identity or none)
      api.assert.ok(
        initialTransform === 'none' || initialTransform === 'matrix(1, 0, 0, 1, 0, 0)',
        `Initial should have no rotation, got: "${initialTransform}"`
      )

      // Toggle
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Background should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Transform should now be 180 degrees
      const afterStyle = window.getComputedStyle(initial)
      api.assert.ok(
        afterStyle.transform !== 'none',
        `Should have rotation after toggle, got: "${afterStyle.transform}"`
      )

      // Verify rotation is ~180 degrees
      const rotation = getRotationFromMatrix(afterStyle.transform)
      api.assert.ok(
        rotation !== null,
        `Transform should be a matrix, got: "${afterStyle.transform}"`
      )
      api.assert.ok(
        Math.abs(Math.abs(rotation!) - 180) < 5,
        `Toggle rotation should be ~180 degrees, got: ${rotation} degrees`
      )
    }
  ),

  testWithSetup(
    'Rotating loader',
    `Frame hor, gap 8, ver-center
  Frame w 20, h 20, bor 2, boc #2271C1, rad 99, anim spin
  Text "Loading", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Spinner

      const spinner = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(spinner)

      // Should have spin animation
      api.assert.ok(
        style.animationName !== 'none' && style.animationName !== '',
        `Spinner should have animation name, got: "${style.animationName}"`
      )

      // Animation should be running
      api.assert.ok(
        style.animationPlayState === 'running',
        `Animation should be running, got: "${style.animationPlayState}"`
      )
    }
  ),
])

export const rotateAnglesTests: TestCase[] = describe('Rotate Various Angles', [
  testWithSetup(
    'Rotation 0 degrees (no rotation)',
    `Frame w 50, h 50, bg #333, rotate 0`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have identity matrix or no transform
      api.assert.ok(
        style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)',
        `Zero rotation should be identity, got: "${style.transform}"`
      )

      // If there is a transform, verify rotation is 0
      if (style.transform !== 'none') {
        const rotation = getRotationFromMatrix(style.transform)
        if (rotation !== null) {
          api.assert.ok(Math.abs(rotation) < 2, `Rotation should be ~0 degrees, got: ${rotation}`)
        }
      }
    }
  ),

  testWithSetup(
    'Rotation 360 degrees (full rotation)',
    `Frame w 50, h 50, bg #333, rotate 360`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // 360 degree rotation should be equivalent to 0 degrees (identity)
      // The rotation value wraps around, so we check if it's close to 0 or 360
      if (style.transform !== 'none') {
        const rotation = getRotationFromMatrix(style.transform)
        if (rotation !== null) {
          const normalizedRotation = Math.abs(rotation) % 360
          api.assert.ok(
            normalizedRotation < 5 || normalizedRotation > 355,
            `Full rotation (360) should be equivalent to 0, got: ${rotation} degrees`
          )
        }
      }
    }
  ),

  testWithSetup(
    'Rotation with decimal angle',
    `Frame w 50, h 50, bg #2271C1, rotate 22.5`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.transform !== 'none',
        `Should have rotation with decimal angle, got: "${style.transform}"`
      )

      // Verify rotation is ~22.5 degrees
      const rotation = getRotationFromMatrix(style.transform)
      api.assert.ok(rotation !== null, `Transform should be a matrix, got: "${style.transform}"`)
      api.assert.ok(
        Math.abs(rotation! - 22.5) < 2,
        `Rotation should be ~22.5 degrees, got: ${rotation} degrees`
      )
    }
  ),
])

export const allRotateTests: TestCase[] = [
  ...rotateBasicTests,
  ...rotateWithOtherTransformsTests,
  ...rotateInteractiveTests,
  ...rotateAnglesTests,
]
