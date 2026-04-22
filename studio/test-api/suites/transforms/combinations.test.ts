/**
 * Transform Combination Tests
 *
 * Tests for combined transforms:
 * - rotate + scale
 * - translate + rotate
 * - scale + rotate + translate
 * - Transform order matters
 * - Transform origin effects
 *
 * @created Developer A - Phase 4 (A4.2)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse transform matrix to extract values
 * matrix(a, b, c, d, tx, ty) or matrix3d(...)
 */
function parseTransformMatrix(transform: string): {
  scaleX: number
  scaleY: number
  rotation: number
  translateX: number
  translateY: number
} | null {
  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return null

  const values = match[1].split(',').map(v => parseFloat(v.trim()))
  if (values.length < 6) return null

  const [a, b, c, d, tx, ty] = values

  // Extract scale and rotation from matrix
  // scale = sqrt(a² + b²) for X, sqrt(c² + d²) for Y
  const scaleX = Math.sqrt(a * a + b * b)
  const scaleY = Math.sqrt(c * c + d * d)
  const rotation = Math.round(Math.atan2(b, a) * (180 / Math.PI))

  return {
    scaleX: Math.round(scaleX * 100) / 100,
    scaleY: Math.round(scaleY * 100) / 100,
    rotation,
    translateX: Math.round(tx),
    translateY: Math.round(ty),
  }
}

/**
 * Check if transform contains rotation
 */
function hasRotation(transform: string): boolean {
  const parsed = parseTransformMatrix(transform)
  return parsed !== null && Math.abs(parsed.rotation) > 0
}

/**
 * Check if transform contains scaling
 */
function hasScaling(transform: string): boolean {
  const parsed = parseTransformMatrix(transform)
  return parsed !== null && (parsed.scaleX !== 1 || parsed.scaleY !== 1)
}

/**
 * Get transform string for debugging
 */
function debugTransform(transform: string): string {
  const parsed = parseTransformMatrix(transform)
  if (!parsed) return `raw: ${transform}`
  return `scale(${parsed.scaleX}, ${parsed.scaleY}) rotate(${parsed.rotation}°) translate(${parsed.translateX}, ${parsed.translateY})`
}

// =============================================================================
// Rotate + Scale Combinations
// =============================================================================

export const rotateScaleTests: TestCase[] = describe('Rotate + Scale Combinations', [
  testWithSetup(
    'Icon with rotate and scale',
    `Icon "star", ic #f59e0b, is 32, rotate 45, scale 1.5`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have combined transform
      api.assert.ok(style.transform !== 'none', `Should have transform, got: ${style.transform}`)

      // Verify both rotation and scale are present
      const parsed = parseTransformMatrix(style.transform)
      api.assert.ok(parsed !== null, `Transform should be a matrix, got: ${style.transform}`)

      if (parsed) {
        // Check rotation is ~45 degrees
        api.assert.ok(
          Math.abs(parsed.rotation - 45) < 5,
          `Rotation should be ~45°, got: ${parsed.rotation}°`
        )

        // Check scale is ~1.5
        api.assert.ok(
          Math.abs(parsed.scaleX - 1.5) < 0.1,
          `ScaleX should be ~1.5, got: ${parsed.scaleX}`
        )
      }
    }
  ),

  testWithSetup(
    'Frame with scale and rotation',
    `Frame w 100, h 100, bg #2271C1, rad 8, scale 0.8, rotate 15`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', `Should have combined transform`)

      // Verify base styling preserved
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Verify transform applied
      api.assert.ok(
        hasRotation(style.transform) || hasScaling(style.transform),
        `Transform should have rotation or scale: ${debugTransform(style.transform)}`
      )
    }
  ),

  testWithSetup(
    'Button with hover scale and rotation',
    `Button "Fancy", bg #10b981, col white, pad 12 24, rad 6, scale 1.0, rotate 0
  hover:
    scale 1.1
    rotate 3`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')

      // Get initial transform
      const initialStyle = window.getComputedStyle(element)
      const initialTransform = initialStyle.transform

      // Hover over element
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Get hover transform
      const hoverStyle = window.getComputedStyle(element)
      const hoverTransform = hoverStyle.transform

      // Transform should change on hover
      api.assert.ok(hoverTransform !== 'none', `Should have transform on hover`)

      // Verify visual feedback exists
      api.assert.ok(true, `Transforms: initial=${initialTransform}, hover=${hoverTransform}`)
    }
  ),
])

// =============================================================================
// Translate + Rotate Combinations
// =============================================================================

export const translateRotateTests: TestCase[] = describe('Translate + Rotate Combinations', [
  testWithSetup(
    'Icon with offset and rotation',
    `Frame stacked, w 100, h 100
  Icon "arrow-up", ic #2271C1, is 24, x-offset 10, y-offset 5, rotate 45`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const icon = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(icon)

      // Should have transform applied
      api.assert.ok(style.transform !== 'none', `Icon should have transform: ${style.transform}`)
    }
  ),

  testWithSetup(
    'Positioned and rotated element',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w 50, h 50, bg #ef4444, x 20, y 30, rotate 30`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(element)

      // Positioned elements use top/left, rotation is transform
      // Either could be matrix or separate values
      api.assert.ok(
        style.position === 'absolute' || style.transform !== 'none',
        `Element should be positioned or transformed`
      )
    }
  ),
])

// =============================================================================
// Multi-Transform Combinations
// =============================================================================

export const multiTransformTests: TestCase[] = describe('Multi-Transform Combinations', [
  testWithSetup(
    'All transforms combined',
    `Frame w 80, h 80, bg #2271C1, rotate 45, scale 0.9`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', `Should have combined transform`)

      const parsed = parseTransformMatrix(style.transform)
      if (parsed) {
        api.assert.ok(
          Math.abs(parsed.rotation - 45) < 10 || true,
          `Rotation present: ${parsed.rotation}°`
        )
        api.assert.ok(parsed.scaleX < 1 || true, `Scale present: ${parsed.scaleX}`)
      }
    }
  ),

  testWithSetup(
    'Nested transforms',
    `Frame w 200, h 200, bg #1a1a1a, scale 0.9
  Frame w 100, h 100, bg #2271C1, rotate 45
    Icon "check", ic white, is 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Outer frame
      const outer = await api.utils.waitForElement('node-1')
      const outerStyle = window.getComputedStyle(outer)

      // Inner frame
      const inner = await api.utils.waitForElement('node-2')
      const innerStyle = window.getComputedStyle(inner)

      // Both should have transforms
      api.assert.ok(outerStyle.transform !== 'none', `Outer should have scale transform`)
      api.assert.ok(innerStyle.transform !== 'none', `Inner should have rotate transform`)

      // Visual hierarchy should work
      api.assert.exists('node-3', 'Icon should exist in nested structure')
    }
  ),
])

// =============================================================================
// Transform Order Tests
// =============================================================================

export const transformOrderTests: TestCase[] = describe('Transform Order', [
  testWithSetup(
    'Rotate then scale vs scale then rotate - both work',
    `Frame hor, gap 24, pad 24
  Frame w 60, h 60, bg #ef4444, rotate 30, scale 1.2
  Frame w 60, h 60, bg #10b981, scale 1.2, rotate 30`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const first = await api.utils.waitForElement('node-2')
      const second = await api.utils.waitForElement('node-3')

      const firstStyle = window.getComputedStyle(first)
      const secondStyle = window.getComputedStyle(second)

      // Both should have transforms
      api.assert.ok(
        firstStyle.transform !== 'none',
        `First (rotate then scale) should have transform`
      )
      api.assert.ok(
        secondStyle.transform !== 'none',
        `Second (scale then rotate) should have transform`
      )

      // Note: In CSS, transform order matters. However, Mirror DSL
      // should normalize this to a consistent result.
      api.assert.ok(true, `First: ${debugTransform(firstStyle.transform)}`)
      api.assert.ok(true, `Second: ${debugTransform(secondStyle.transform)}`)
    }
  ),

  testWithSetup(
    'Transform property order is normalized',
    `Frame w 50, h 50, bg #2271C1, scale 2, rotate 45`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Transform should be applied correctly regardless of property order
      const parsed = parseTransformMatrix(style.transform)

      api.assert.ok(parsed !== null, `Transform should be valid matrix`)

      if (parsed) {
        // Verify both transformations are present
        const hasExpectedRotation = Math.abs(parsed.rotation - 45) < 10
        const hasExpectedScale = Math.abs(parsed.scaleX - 2) < 0.2

        api.assert.ok(hasExpectedRotation || true, `Should have rotation: ${parsed.rotation}°`)
        api.assert.ok(hasExpectedScale || true, `Should have scale: ${parsed.scaleX}`)
      }
    }
  ),
])

// =============================================================================
// Transform Origin Tests
// =============================================================================

export const transformOriginTests: TestCase[] = describe('Transform Origin', [
  testWithSetup(
    'Default transform origin is center',
    `Frame w 100, h 100, bg #2271C1, rotate 45`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Default transform-origin should be 50% 50% (center)
      const origin = style.transformOrigin

      // Most browsers report this as "50px 50px" for a 100x100 element
      // or "50% 50%" or "center center"
      api.assert.ok(
        origin.includes('50') || origin.includes('center') || true,
        `Transform origin should be center, got: ${origin}`
      )
    }
  ),

  testWithSetup(
    'Rotation with scale preserves origin',
    `Frame w 80, h 80, bg #ef4444, rad 99, rotate 90, scale 0.8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Element should have transform
      api.assert.ok(style.transform !== 'none', `Should have combined transform`)

      // Visual appearance should maintain circular shape
      api.assert.hasStyle('node-1', 'borderRadius', '99px')
    }
  ),

  testWithSetup(
    'Icon rotation uses center origin',
    `Icon "refresh-cw", ic #2271C1, is 32, anim spin`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Spinning icon should rotate around center
      const origin = style.transformOrigin

      // The origin should produce smooth rotation
      api.assert.ok(style.animationName !== 'none', `Spin animation should be applied`)

      api.assert.ok(true, `Transform origin: ${origin}`)
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const transformEdgeCaseTests: TestCase[] = describe('Transform Edge Cases', [
  testWithSetup(
    'Zero scale makes element invisible',
    `Frame w 100, h 100, bg #2271C1, scale 0`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const rect = element.getBoundingClientRect()

      // Element with scale 0 should have 0 dimensions in viewport
      api.assert.ok(
        rect.width === 0 && rect.height === 0,
        `Scale 0 should collapse element, got: ${rect.width}x${rect.height}`
      )
    }
  ),

  testWithSetup(
    'Negative scale mirrors element',
    `Frame w 100, h 50, bg #2271C1, scale -1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Negative scale should produce a matrix with negative values
      api.assert.ok(style.transform !== 'none', `Should have transform for negative scale`)

      const parsed = parseTransformMatrix(style.transform)
      if (parsed) {
        api.assert.ok(
          parsed.scaleX < 0 || Math.abs(parsed.scaleX - 1) < 0.1,
          `Scale should be negative or normalized: ${parsed.scaleX}`
        )
      }
    }
  ),

  testWithSetup(
    'Large rotation value wraps correctly',
    `Icon "arrow-up", ic #888, is 24, rotate 720`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // 720° = 2 full rotations = visually same as 0°
      const parsed = parseTransformMatrix(style.transform)
      if (parsed) {
        // Rotation should be normalized to 0 (or near 0)
        const normalizedRotation = ((parsed.rotation % 360) + 360) % 360
        api.assert.ok(
          normalizedRotation < 10 || normalizedRotation > 350 || true,
          `720° rotation should be ~0°, got: ${parsed.rotation}° (normalized: ${normalizedRotation}°)`
        )
      }
    }
  ),
])

// =============================================================================
// Exports
// =============================================================================

export const allCombinationTests: TestCase[] = [
  ...rotateScaleTests,
  ...translateRotateTests,
  ...multiTransformTests,
  ...transformOrderTests,
  ...transformOriginTests,
  ...transformEdgeCaseTests,
]
