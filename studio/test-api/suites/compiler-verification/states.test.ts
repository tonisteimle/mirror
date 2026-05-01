/**
 * Compiler Verification — State Management
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 11. State Management
// =============================================================================

export const stateManagementTests: TestCase[] = describe('State Management', [
  testWithSetup(
    'Toggle state initial off',
    `Button "Toggle Me", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(btn.tagName === 'button', 'Should be a button')

      // Initial state should be off (gray background)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial bg should be #333, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Toggle state initial on',
    `Button "Active", bg #333, col white, pad 12 24, rad 6, toggle(), on
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Initial state is on (blue background)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#2271C1'),
        `Initial bg should be #2271C1 (on state), got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Hover state styles',
    `Button "Hover Me", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444
    scale 1.02`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Initial state (not hovered)
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `Initial bg should be #333, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Active state styles',
    `Button "Press Me", bg #333, col white, pad 12 24, rad 6
  active:
    scale 0.98
    bg #222`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(
        btn.styles.cursor === 'pointer' || btn.tagName === 'button',
        'Should be interactive'
      )
    }
  ),

  testWithSetup(
    'Focus state styles',
    `Input placeholder "Focus me...", bg #333, col white, pad 12, rad 6, bor 1, boc #555
  focus:
    boc #2271C1
    bg #3a3a3a`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be an input')
    }
  ),

  testWithSetup(
    'Disabled state',
    `Button "Disabled", bg #333, col white, pad 12 24, rad 6, disabled
  disabled:
    opacity 0.5
    cursor not-allowed`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button should exist')

      // Should have disabled styles
      const isDisabled =
        btn.styles.opacity === '0.5' ||
        btn.styles.cursor === 'not-allowed' ||
        btn.attributes.disabled !== undefined

      api.assert.ok(isDisabled, 'Button should appear disabled')
    }
  ),

  testWithSetup(
    'Multiple custom states (multi-toggle)',
    `Frame pad 12 24, rad 6, bg #333, col white, toggle()
  todo:
    bg #666
  doing:
    bg #f59e0b
  done:
    bg #10b981`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      // Initial state should be first custom state or default
      api.assert.ok(frame.styles.backgroundColor !== '', 'Should have background')
    }
  ),

  testWithSetup(
    'Exclusive state (tabs)',
    `Frame hor, gap 0
  Button "Tab 1", pad 12 20, col #888, exclusive(), selected
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 2", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 3", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Tab 1
      api.assert.exists('node-3') // Tab 2
      api.assert.exists('node-4') // Tab 3

      // Tab 1 should be selected initially
      const tab1 = api.preview.inspect('node-2')
      api.assert.ok(tab1 !== null, 'Tab 1 should exist')
    }
  ),
])
