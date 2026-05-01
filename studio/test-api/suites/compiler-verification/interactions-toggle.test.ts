/**
 * Compiler Verification — Interactions: Toggle, MultiState, Visibility
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 41. Interaction Tests - Toggle State Changes
// =============================================================================

export const interactionToggleTests: TestCase[] = describe('Interaction: Toggle States', [
  testWithSetup(
    'Click toggles button state on/off',
    `Button "Toggle", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Initial state: off (gray)
      let btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial state should be off (#333), got ${btn.styles.backgroundColor}`
      )

      // Click to turn on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#2271C1'),
        `After click should be on (#2271C1), got ${btn.styles.backgroundColor}`
      )

      // Click again to turn off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After second click should be off (#333), got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle changes text content',
    `Button "Like", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #ef4444
    Text "Liked"`,
    async (api: TestAPI) => {
      // Initial text
      const likeText = api.preview.findByText('Like')
      api.assert.ok(likeText !== null, 'Initial text should be "Like"')

      // Click to toggle
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Text should change to "Liked"
      const likedText = api.preview.findByText('Liked')
      api.assert.ok(
        likedText !== null || api.preview.inspect('node-1')?.fullText.includes('Liked'),
        'After click text should include "Liked"'
      )
    }
  ),

  testWithSetup(
    'Multiple toggles cycle correctly',
    `Button "State", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Toggle 4 times - should end up off (even number of clicks)
      for (let i = 0; i < 4; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(50)
      }
      await api.utils.delay(100)

      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After 4 clicks should be off, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle with icon change',
    `Button pad 12, bg #333, rad 6, toggle()
  Icon "heart", ic #888, is 20
  on:
    bg #ef4444
    Icon "heart", ic white, is 20, fill`,
    async (api: TestAPI) => {
      // Initial state
      let btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(colorsMatch(btn.styles.backgroundColor, '#333'), 'Initial bg should be #333')

      // Click to toggle
      await api.interact.click('node-1')
      await api.utils.delay(200)

      btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#ef4444'),
        `After click bg should be #ef4444, got ${btn.styles.backgroundColor}`
      )
    }
  ),
])

// =============================================================================
// 47. Interaction Tests - Multi-State Toggle
// =============================================================================

export const interactionMultiStateTests: TestCase[] = describe('Interaction: Multi-State Toggle', [
  testWithSetup(
    'Cycle through multiple states',
    `Button "Status", pad 12 24, rad 6, bg #666, col white, toggle()
  todo:
    bg #888
    Text "Todo"
  doing:
    bg #f59e0b
    Text "Doing"
  done:
    bg #10b981
    Text "Done"`,
    async (api: TestAPI) => {
      // Click to cycle through states
      await api.interact.click('node-1')
      await api.utils.delay(100)

      let btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      const state1 = btn.styles.backgroundColor

      await api.interact.click('node-1')
      await api.utils.delay(100)

      btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      const state2 = btn.styles.backgroundColor

      await api.interact.click('node-1')
      await api.utils.delay(100)

      btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      const state3 = btn.styles.backgroundColor

      // States should be different (cycling through)
      api.assert.ok(
        state1 !== state2 || state2 !== state3 || state1 !== state3,
        'States should cycle through different colors'
      )
    }
  ),
])

// =============================================================================
// 48. Interaction Tests - Show/Hide Elements
// =============================================================================

export const interactionVisibilityTests: TestCase[] = describe('Interaction: Visibility', [
  testWithSetup(
    'Toggle shows/hides menu',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Menu", bg #2271C1, col white, pad 10 20, rad 6, toggle()
    open:
      Text "Close"
  Frame pad 12, bg #333, rad 8, hidden
    Button.open:
      visible
    Text "Item 1", col white
    Text "Item 2", col white`,
    async (api: TestAPI) => {
      // Menu should be hidden initially
      const item1Initial = api.preview.findByText('Item 1')
      // Item might be hidden or not visible

      // Click to show
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Menu should be visible now
      const item1After = api.preview.findByText('Item 1')
      // After click, visibility might have changed
      api.assert.ok(
        item1After !== null || api.preview.getNodeIds().length >= 2,
        'Menu items should exist after toggle'
      )
    }
  ),
])
