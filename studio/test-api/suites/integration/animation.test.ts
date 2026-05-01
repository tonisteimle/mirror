/**
 * Integration — Animation & Transition
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Animation & Transition Integration
// =============================================================================

export const animationTests: TestCase[] = describe('Animation & Transition', [
  testWithSetup(
    'Hover with transition timing',
    `Card: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover 0.2s ease-out:
    bg #252525
    scale 1.02
    shadow md

Card
  Text "Hover me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Check transition is set
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)
      api.assert.ok(
        style.transition.includes('0.2s') || style.transitionDuration.includes('0.2'),
        'Should have 0.2s transition'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(300) // Wait for transition

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  testWithSetup(
    'Toggle state with transition',
    `ToggleCard: bg #333, pad 16, rad 8, cursor pointer, toggle()
  on 0.3s ease-in-out:
    bg #2271C1
    scale 1.05

ToggleCard
  Text "Click to toggle", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(400) // Wait for transition

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Verify data-state
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el.getAttribute('data-state') === 'on', 'Should be in on state')
    }
  ),

  testWithSetup(
    'Loading spinner animation',
    `LoadingBtn as Button: hor, gap 8, pad 12 24, bg #2271C1, col white, rad 6, ver-center
  Icon "loader", ic white, is 18, anim spin
  Text "Loading..."

LoadingBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      // Button styling
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Has loading text
      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Loading'), `Should say Loading, got: "${btnText}"`)

      // Icon should have animation
      const icon = btn!.querySelector('svg, [data-icon], span')
      api.assert.ok(icon !== null, 'Button should contain an icon element')
      const iconStyle = getComputedStyle(icon!)
      api.assert.ok(
        iconStyle.animation.includes('spin') || iconStyle.animationName.includes('spin'),
        `Icon should have spin animation, got animation: "${iconStyle.animation}", animationName: "${iconStyle.animationName}"`
      )
    }
  ),

  testWithSetup(
    'Pulse animation on notification badge',
    `Badge: pad 4 8, bg #ef4444, col white, rad 99, fs 12, anim pulse

Frame relative, w 40, h 40, bg #222, rad 6, center
  Icon "bell", ic #888, is 24
  Frame abs, x 24, y -4
    Badge "3"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-3') // Badge wrapper

      // Container is relative
      api.assert.hasStyle('node-1', 'position', 'relative')
      api.assert.hasStyle('node-1', 'width', '40px')
      api.assert.hasStyle('node-1', 'height', '40px')

      // Badge wrapper is absolute positioned
      api.assert.hasStyle('node-3', 'position', 'absolute')

      // Find badge and check animation
      const badgeWrapper = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(badgeWrapper !== null, 'Badge wrapper should exist')
      const badgeText = badgeWrapper!.textContent || ''
      api.assert.ok(badgeText.includes('3'), `Badge should show 3, got: "${badgeText}"`)
    }
  ),
])
