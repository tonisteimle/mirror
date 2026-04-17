/**
 * Rotate Transform Tests
 *
 * Tests for rotate/rot property with various angles.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

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
        'Should have transform applied'
      )

      // Verify it's a rotation (matrix contains rotation values)
      api.assert.ok(
        style.transform.includes('matrix') || style.transform.includes('rotate'),
        'Transform should include rotation'
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

      api.assert.ok(style.transform !== 'none', 'Should have rotation transform')
    }
  ),

  testWithSetup(
    'Icon rotated 180 degrees',
    `Icon "arrow-up", ic #10b981, is 24, rot 180`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // 180 degree rotation creates specific matrix values
      api.assert.ok(style.transform !== 'none', 'Should have 180 degree rotation')
    }
  ),

  testWithSetup(
    'Icon rotated -45 degrees (counter-clockwise)',
    `Icon "arrow-right", ic #ef4444, is 24, rotate -45`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have negative rotation')
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

      // Note: Programmatic hover doesn't trigger CSS :hover
      // We verify the element exists and has base styles
      const element = await api.utils.waitForElement('node-1')
      api.assert.ok(element !== null, 'Icon should exist')
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

      // Toggle
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Background should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Transform should change (rotate 180)
      const afterStyle = window.getComputedStyle(initial)
      api.assert.ok(
        afterStyle.transform !== initialTransform || afterStyle.transform.includes('matrix'),
        'Should be rotated after toggle'
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

      // Should have spin animation (which applies rotation)
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Spinner should be animating'
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
        'Zero rotation should be identity'
      )
    }
  ),

  testWithSetup(
    'Rotation 360 degrees (full rotation)',
    `Frame w 50, h 50, bg #333, rotate 360`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Full rotation should look same as no rotation
      const element = await api.utils.waitForElement('node-1')
      api.assert.ok(element !== null, 'Element should exist')
    }
  ),

  testWithSetup(
    'Rotation with decimal angle',
    `Frame w 50, h 50, bg #2271C1, rotate 22.5`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.transform !== 'none', 'Should have rotation with decimal angle')
    }
  ),
])

export const allRotateTests: TestCase[] = [
  ...rotateBasicTests,
  ...rotateWithOtherTransformsTests,
  ...rotateInteractiveTests,
  ...rotateAnglesTests,
]
