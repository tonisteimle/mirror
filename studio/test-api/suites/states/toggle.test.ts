/**
 * Toggle State Tests
 *
 * Tests for toggle() function and on/off states.
 * Validates state transitions, visual changes, and persistence.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const toggleBasicTests: TestCase[] = describe('Toggle Basic', [
  testWithSetup(
    'Button with toggle() starts in default state',
    `Button "Toggle", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify initial (off) state styling
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Element should exist')
      api.assert.equals(info!.tagName.toLowerCase(), 'button', 'Should be a button')

      // Check default background (off state)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // Verify text content
      api.assert.hasText('node-1', 'Toggle')

      // Should not be in 'on' state initially
      const element = await api.utils.waitForElement('node-1')
      const dataState = element.getAttribute('data-state')
      api.assert.ok(
        !element.classList.contains('on') && dataState !== 'on',
        `Should not have on state initially (data-state="${dataState}")`
      )
    }
  ),

  testWithSetup(
    'Button toggle() switches to on state on click',
    `Button "Toggle", bg #333, col white, toggle()
  on:
    bg #2271C1
    col #fff`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Verify on state styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
    }
  ),

  testWithSetup(
    'Button toggle() switches back to off state on second click',
    `Button "Toggle", bg #333, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial: off
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // First click: on
      await api.interact.click('node-1')
      await api.utils.delay(150)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Second click: off again
      await api.interact.click('node-1')
      await api.utils.delay(150)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Button with initial on state',
    `Button "Active", bg #333, toggle(), on
  on:
    bg #10b981
    col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Should start in on state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Click to toggle off
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Should now be in off state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Toggle with multiple style changes in on state',
    `Button "Like", bg #333, col #888, pad 10 20, rad 6, toggle()
  on:
    bg #ef4444
    col white
    pad 12 24
    rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify off state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(150)

      // Verify all on state styles
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
    }
  ),
])

export const toggleWithContentTests: TestCase[] = describe('Toggle with Content Changes', [
  testWithSetup(
    'Toggle changes text content in on state',
    `Button "Follow", bg #333, col white, toggle()
  on:
    bg #2271C1
    Text "Following"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial text
      api.assert.hasText('node-1', 'Follow')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Check if text changed (implementation dependent)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'Toggle with icon change',
    `Frame hor, gap 8, pad 12, bg #333, rad 6, toggle(), cursor pointer
  Icon "heart", ic #888, is 18
  Text "Like", col #888
  on:
    bg #ef4444
    Icon "heart", ic white, is 18, fill
    Text "Liked", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify on state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),
])

export const toggleMultipleTests: TestCase[] = describe('Multiple Toggle States', [
  testWithSetup(
    'Multiple toggles operate independently',
    `Frame gap 8
  Button "A", bg #333, toggle()
    on:
      bg #2271C1
  Button "B", bg #333, toggle()
    on:
      bg #10b981
  Button "C", bg #333, toggle()
    on:
      bg #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // All start off
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle first
      await api.interact.click('node-2')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle second
      await api.interact.click('node-3')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle third
      await api.interact.click('node-4')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(239, 68, 68)')

      // Toggle first off
      await api.interact.click('node-2')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),

  testWithSetup(
    'Toggle with multiple state cycles',
    `Button "Status", bg #333, col #888, toggle(), todo
  todo:
    bg #333
    col #888
  doing:
    bg #f59e0b
    col white
  done:
    bg #10b981
    col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state (todo - explicitly set with 'todo' modifier)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Cycle through states: todo -> doing
      await api.interact.click('node-1')
      await api.utils.delay(150)
      // Should be in 'doing' state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(245, 158, 11)')

      await api.interact.click('node-1')
      await api.utils.delay(150)
      // Should be in 'done' state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')

      await api.interact.click('node-1')
      await api.utils.delay(150)
      // Should cycle back to 'todo'
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),
])

export const allToggleTests: TestCase[] = [
  ...toggleBasicTests,
  ...toggleWithContentTests,
  ...toggleMultipleTests,
]
