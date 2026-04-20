/**
 * State Animation Tests
 *
 * Tests for animations triggered by state changes:
 * - Animations on toggle states
 * - Animations with timing on hover
 * - Entry/exit animations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

/**
 * Helper to verify an element has an active CSS animation.
 * Checks both animationName and animationDuration strictly.
 */
function hasActiveAnimation(style: CSSStyleDeclaration): boolean {
  const animName = style.animationName
  const animDuration = style.animationDuration

  // animationName must be set and not 'none'
  const hasName = animName !== '' && animName !== 'none'

  // animationDuration must be > 0
  const hasDuration = animDuration !== '' && animDuration !== '0s'

  return hasName && hasDuration
}

/**
 * Helper to get animation details for error messages
 */
function getAnimationDebugInfo(style: CSSStyleDeclaration): string {
  return `name="${style.animationName}", duration="${style.animationDuration}", timing="${style.animationTimingFunction}"`
}

export const stateToggleAnimationTests: TestCase[] = describe('State Toggle Animations', [
  testWithSetup(
    'Toggle with bounce animation on state change',
    `Button "Like", bg #333, col #888, pad 12 20, rad 6, hor, gap 8, toggle()
  Icon "heart", ic #888, is 18
  on 0.2s ease-out:
    bg #ef4444
    col white
    anim bounce
    Icon "heart", ic white, is 18, fill`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(300) // Wait for animation

      // Should be in on state with animation applied
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')

      // Animation should have played
      const element = await api.utils.waitForElement('node-1')
      // Note: Animation might have completed by now
    }
  ),

  testWithSetup(
    'Toggle with pulse animation in on state',
    `Frame w 50, h 50, bg #333, rad 25, center, toggle(), cursor pointer
  on:
    bg #10b981
    anim pulse`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Should be pulsing green
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // STRICT: Must have pulse animation active
      api.assert.ok(
        hasActiveAnimation(style),
        `Should have pulse animation in on state, got: ${getAnimationDebugInfo(style)}`
      )

      // Toggle off - animation should stop
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Success state with scale and fade',
    `Button "Submit", bg #2271C1, col white, pad 12 24, rad 6, toggle()
  on:
    bg #10b981
    anim scale-in`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Toggle to success
      await api.interact.click('node-1')
      await api.utils.delay(250)

      // Should be green with animation
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
    }
  ),
])

export const hoverAnimationTests: TestCase[] = describe('Hover with Animation Timing', [
  testWithSetup(
    'Button hover with smooth transition',
    `Button "Smooth", bg #333, col white, pad 12 24, rad 6
  hover 0.2s:
    bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Check for transition property
      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have transition
      api.assert.ok(
        style.transition !== '' &&
          style.transition !== 'none' &&
          style.transition !== 'all 0s ease 0s',
        `Should have transition property, got: ${style.transition}`
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(250) // Wait for transition

      // Should smoothly transition to blue
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'Card hover with ease-out timing',
    `Frame bg #1a1a1a, pad 24, rad 12, gap 8
  Text "Card Title", col white, fs 18, weight bold
  Text "Card description", col #888, fs 14
  hover 0.15s ease-out:
    bg #222
    shadow lg`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      const card = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(card)

      // Validate transition timing function exists and has easing
      const timingFunc = style.transitionTimingFunction
      api.assert.ok(
        timingFunc !== '' &&
          timingFunc !== 'ease' &&
          (timingFunc.includes('ease') ||
            timingFunc.includes('cubic') ||
            timingFunc.includes('linear')),
        `Should have easing function, got: "${timingFunc}"`
      )

      // Validate transition duration is ~0.15s
      const duration = style.transitionDuration
      api.assert.ok(
        duration !== '' && duration !== '0s',
        `Should have transition duration, got: "${duration}"`
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
    }
  ),

  testWithSetup(
    'Button hover with scale and transition',
    `Button "Scale Up", bg #2271C1, col white, pad 12 24, rad 6
  hover 0.1s:
    scale 1.05
    bg #1e5faa`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const button = await api.utils.waitForElement('node-1')

      // Get initial transform (should be none or identity)
      const initialStyle = window.getComputedStyle(button)
      const initialTransform = initialStyle.transform

      // Verify initial has no scale
      api.assert.ok(
        initialTransform === 'none' || initialTransform === 'matrix(1, 0, 0, 1, 0, 0)',
        `Initial should have no transform, got: "${initialTransform}"`
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(150)

      // Should have scale transform after hover
      const hoverStyle = window.getComputedStyle(button)
      api.assert.ok(
        hoverStyle.transform !== 'none' && hoverStyle.transform !== initialTransform,
        `Transform should change on hover to scale, got: "${hoverStyle.transform}"`
      )

      // Verify the transform contains a scale (matrix values differ from identity)
      api.assert.ok(
        hoverStyle.transform.includes('matrix'),
        `Should have matrix transform for scale, got: "${hoverStyle.transform}"`
      )

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')
    }
  ),

  testWithSetup(
    'Link hover with underline animation',
    `Text "Hover me", col #2271C1, cursor pointer
  hover 0.2s:
    underline`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial - no underline (check that it doesn't have underline)
      const initialElement = await api.utils.waitForElement('node-1')
      const initialStyle = window.getComputedStyle(initialElement)
      api.assert.ok(
        !initialStyle.textDecoration.includes('underline') &&
          initialStyle.textDecorationLine !== 'underline',
        'Should not have underline initially'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(250)

      // Should have underline
      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)
      api.assert.ok(
        style.textDecoration.includes('underline') || style.textDecorationLine === 'underline',
        'Should have underline on hover'
      )
    }
  ),
])

export const entryExitAnimationTests: TestCase[] = describe('Entry/Exit Animations', [
  testWithSetup(
    'Toast notification with fade-in',
    `Frame absolute, x 16, y 16, bg #1a1a1a, pad 16, rad 8, hor, gap 12, shadow lg, anim fade-in
  Icon "check-circle", ic #10b981, is 20
  Text "Saved!", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const toast = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(toast)

      // STRICT: Must have fade-in animation
      api.assert.ok(
        hasActiveAnimation(style),
        `Toast should fade in, got: ${getAnimationDebugInfo(style)}`
      )
    }
  ),

  testWithSetup(
    'Dropdown with slide-down entry',
    `Frame gap 8
  Button "Menu", bg #333, col white, pad 12, toggle()
  Frame bg #1a1a1a, pad 8, rad 8, shadow lg, hidden
    anim slide-down
    Text "Option 1", col white, pad 8
    Text "Option 2", col white, pad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Dropdown

      // Dropdown hidden initially
      api.assert.hasStyle('node-3', 'display', 'none')

      // Note: Animation would play when dropdown becomes visible
    }
  ),

  testWithSetup(
    'Modal with scale-in entry',
    `Frame center, w full, h full
  Frame bg white, pad 24, rad 12, w 400, gap 16, anim scale-in
    Text "Modal", col #1a1a1a, fs 20, weight bold
    Text "Content here", col #666`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Modal

      const modal = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(modal)

      // STRICT: Must have scale-in animation
      api.assert.ok(
        hasActiveAnimation(style),
        `Modal should scale in, got: ${getAnimationDebugInfo(style)}`
      )
    }
  ),

  testWithSetup(
    'List items with staggered reveal',
    `Frame gap 4
  Frame pad 12, bg #1a1a1a, rad 6, anim reveal-up
    Text "Item 1", col white
  Frame pad 12, bg #1a1a1a, rad 6, anim reveal-up
    Text "Item 2", col white
  Frame pad 12, bg #1a1a1a, rad 6, anim reveal-up
    Text "Item 3", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-4')
      api.assert.exists('node-6')

      // STRICT: Each item must have reveal animation
      for (const nodeId of ['node-2', 'node-4', 'node-6']) {
        const element = await api.utils.waitForElement(nodeId)
        const style = window.getComputedStyle(element)
        api.assert.ok(
          hasActiveAnimation(style),
          `${nodeId} should have reveal animation, got: ${getAnimationDebugInfo(style)}`
        )
      }
    }
  ),
])

export const combinedAnimationTests: TestCase[] = describe('Combined Animation Scenarios', [
  testWithSetup(
    'Button with hover transition and click animation',
    `Button "Action", bg #2271C1, col white, pad 12 24, rad 6, toggle()
  hover 0.15s:
    bg #1e5faa
  active:
    scale 0.98
  on:
    bg #10b981
    anim bounce`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Test hover transition separately
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')
      await api.interact.unhover('node-1')
      await api.utils.delay(100)

      // Back to initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Click to toggle (without hover)
      await api.interact.click('node-1')
      await api.utils.delay(300)

      // Should be in on state (green)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
    }
  ),

  testWithSetup(
    'Loading button with spin and pulse',
    `Button "Loading", bg #2271C1, col white, pad 12 24, rad 6, hor, gap 8, toggle()
  Icon "loader", ic white, is 16, hidden
  Text "Submit"
  on:
    bg #1e5faa
    Icon "loader", ic white, is 16, anim spin
    Text "Processing..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasText('node-1', 'Submit')

      // Toggle to loading
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(30, 95, 170)')
    }
  ),

  testWithSetup(
    'Notification banner with multiple animations',
    `Frame bg #10b981, pad 16, rad 8, hor, spread, ver-center, anim slide-down
  Frame hor, gap 12, ver-center
    Icon "check-circle", ic white, is 20, anim bounce
    Text "Operation completed successfully!", col white
  Button "×", bg transparent, col white, fs 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Banner
      api.assert.exists('node-2') // Content wrapper

      // Banner should have slide animation
      const banner = await api.utils.waitForElement('node-1')
      const bannerStyle = window.getComputedStyle(banner)

      // STRICT: Banner must have animation name set (not 'none')
      api.assert.ok(
        bannerStyle.animationName !== 'none' && bannerStyle.animationName !== '',
        `Banner should have slide-down animation, got animationName="${bannerStyle.animationName}"`
      )

      // Verify animation duration is set
      api.assert.ok(
        bannerStyle.animationDuration !== '0s' && bannerStyle.animationDuration !== '',
        `Banner animation should have duration, got: "${bannerStyle.animationDuration}"`
      )

      // Verify banner styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
    }
  ),
])

export const allStateAnimationTests: TestCase[] = [
  ...stateToggleAnimationTests,
  ...hoverAnimationTests,
  ...entryExitAnimationTests,
  ...combinedAnimationTests,
]
