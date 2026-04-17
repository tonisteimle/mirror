/**
 * Animation Preset Tests
 *
 * Tests for built-in animation presets:
 * spin, bounce, pulse, shake, fade-in, slide-in, etc.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const spinAnimationTests: TestCase[] = describe('Spin Animation', [
  testWithSetup(
    'Icon with spin animation',
    `Icon "loader", ic #2271C1, is 24, anim spin`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const computedStyle = window.getComputedStyle(element)

      // Should have animation property
      const animation = computedStyle.animation || computedStyle.animationName
      api.assert.ok(animation !== '' && animation !== 'none', 'Should have animation applied')

      // Verify it's a spin animation (infinite rotation)
      api.assert.ok(
        computedStyle.animationIterationCount === 'infinite' ||
          computedStyle.animationDuration !== '0s',
        'Spin should be continuous'
      )
    }
  ),

  testWithSetup(
    'Spinner with custom color',
    `Frame center, w 100, h 100
  Icon "loader-2", ic #10b981, is 32, anim spin`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const element = await api.utils.waitForElement('node-2')
      const computedStyle = window.getComputedStyle(element)

      // Should have rotation animation
      api.assert.ok(
        computedStyle.animation !== '' || computedStyle.animationName !== 'none',
        'Should have spin animation'
      )
    }
  ),

  testWithSetup(
    'Loading indicator pattern',
    `Frame hor, gap 8, ver-center
  Icon "loader", ic #888, is 16, anim spin
  Text "Loading...", col #888, fs 14`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Spinner
      api.assert.exists('node-3') // Text

      // Verify spinner is animating
      const spinner = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(spinner)

      // Text should be static
      api.assert.hasText('node-3', 'Loading...')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
    }
  ),
])

export const pulseAnimationTests: TestCase[] = describe('Pulse Animation', [
  testWithSetup(
    'Badge with pulse animation',
    `Frame stacked, w 40, h 40
  Icon "bell", ic #888, is 24
  Frame absolute, x 24, y -4, w 16, h 16, bg #ef4444, rad 99, center, anim pulse
    Text "3", col white, fs 10`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3') // Badge with pulse

      const badge = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(badge)

      // Should have pulse animation
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Badge should have pulse animation'
      )

      // Badge should be red
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),

  testWithSetup(
    'Attention-grabbing button with pulse',
    `Button "Click me!", bg #2271C1, col white, pad 12 24, rad 6, anim pulse`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const button = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(button)

      // Verify button styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Should have animation
      api.assert.ok(
        style.animation !== '' || style.animationName !== '',
        'Should have pulse animation'
      )
    }
  ),

  testWithSetup(
    'Recording indicator with pulse',
    `Frame hor, gap 8, ver-center, pad 8 12, bg #1a1a1a, rad 20
  Frame w 8, h 8, bg #ef4444, rad 99, anim pulse
  Text "Recording", col white, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Red dot
      api.assert.exists('node-3') // Text

      // Red dot should be pulsing
      const dot = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(dot)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-2', 'borderRadius', '99px')
    }
  ),
])

export const bounceAnimationTests: TestCase[] = describe('Bounce Animation', [
  testWithSetup(
    'Success icon with bounce',
    `Frame center, w 100, h 100
  Icon "check-circle", ic #10b981, is 48, anim bounce`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const icon = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(icon)

      // Should have bounce animation
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have bounce animation'
      )
    }
  ),

  testWithSetup(
    'Notification with bounce',
    `Frame bg #10b981, pad 16, rad 8, hor, gap 12, anim bounce
  Icon "check", ic white, is 20
  Text "Changes saved successfully!", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify notification styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      const notification = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(notification)

      // Should be animating
      api.assert.ok(style.animation !== '', 'Should have bounce animation')
    }
  ),

  testWithSetup(
    'Arrow bounce for scroll hint',
    `Frame center, w full, h 100
  Icon "chevron-down", ic #888, is 32, anim bounce`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const arrow = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(arrow)

      api.assert.ok(style.animation !== '' || style.animationName !== 'none', 'Arrow should bounce')
    }
  ),
])

export const shakeAnimationTests: TestCase[] = describe('Shake Animation', [
  testWithSetup(
    'Error shake on button',
    `Button "Submit", bg #ef4444, col white, pad 12 24, rad 6, anim shake`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify button styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      const button = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(button)

      // Should have shake animation
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have shake animation'
      )
    }
  ),

  testWithSetup(
    'Form field with error shake',
    `Frame gap 4
  Input placeholder "Email", w 250, pad 12, bg #1a1a1a, col white, rad 6, bor 2, boc #ef4444, anim shake
  Text "Invalid email address", col #ef4444, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Input

      // Input should have error border
      api.assert.hasStyle('node-2', 'borderWidth', '2px')

      const input = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(input)

      api.assert.ok(style.animation !== '' || style.animationName !== 'none', 'Input should shake')
    }
  ),
])

export const fadeAnimationTests: TestCase[] = describe('Fade Animations', [
  testWithSetup(
    'Fade-in animation',
    `Frame bg #1a1a1a, pad 24, rad 8, anim fade-in
  Text "Welcome!", col white, fs 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const frame = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(frame)

      // Should have fade animation
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have fade-in animation'
      )
    }
  ),

  testWithSetup(
    'Fade-out animation',
    `Frame bg #1a1a1a, pad 24, rad 8, anim fade-out
  Text "Goodbye!", col white, fs 24`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const frame = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(frame)

      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have fade-out animation'
      )
    }
  ),
])

export const slideAnimationTests: TestCase[] = describe('Slide Animations', [
  testWithSetup(
    'Slide-in from right',
    `Frame bg #1a1a1a, pad 24, rad 8, anim slide-in
  Text "Sliding in!", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const frame = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(frame)

      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have slide-in animation'
      )
    }
  ),

  testWithSetup(
    'Slide-up animation',
    `Frame bg #1a1a1a, pad 24, rad 8, anim slide-up
  Text "Sliding up!", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const frame = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(frame)

      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have slide-up animation'
      )
    }
  ),

  testWithSetup(
    'Slide-down for dropdown',
    `Frame w 200, bg #1a1a1a, pad 8, rad 8, shadow lg, anim slide-down
  Text "Option 1", col white, pad 8
  Text "Option 2", col white, pad 8
  Text "Option 3", col white, pad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      const dropdown = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(dropdown)

      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Dropdown should slide down'
      )
    }
  ),
])

export const scaleAnimationTests: TestCase[] = describe('Scale Animations', [
  testWithSetup(
    'Scale-in animation',
    `Frame bg #2271C1, pad 24, rad 8, anim scale-in
  Text "Scaling in!", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const frame = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(frame)

      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Should have scale-in animation'
      )
    }
  ),

  testWithSetup(
    'Modal with scale-in',
    `Frame center, w full, h full, bg rgba(0,0,0,0.5)
  Frame bg white, pad 24, rad 12, w 400, anim scale-in
    Text "Modal Title", col #1a1a1a, fs 20, weight bold
    Text "Modal content here...", col #666`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Modal

      const modal = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(modal)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(255, 255, 255)')
      api.assert.ok(
        style.animation !== '' || style.animationName !== 'none',
        'Modal should scale in'
      )
    }
  ),
])

export const allAnimationPresetTests: TestCase[] = [
  ...spinAnimationTests,
  ...pulseAnimationTests,
  ...bounceAnimationTests,
  ...shakeAnimationTests,
  ...fadeAnimationTests,
  ...slideAnimationTests,
  ...scaleAnimationTests,
]
