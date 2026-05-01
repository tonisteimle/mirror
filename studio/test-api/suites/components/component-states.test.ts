/**
 * Component State Tests (hover, toggle, multiple states)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const componentStateTests: TestCase[] = describe('Components with States', [
  testWithSetup(
    'Component with hover state',
    `HoverCard: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover:
    bg #222
    shadow md

HoverCard
  Text "Hover me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Component with toggle state',
    `ToggleBtn as Button: pad 10 20, bg #333, col #888, rad 6, toggle()
  on:
    bg #2271C1
    col white

ToggleBtn "Toggle"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Toggle' })
    }
  ),

  testWithSetup(
    'Component with multiple states',
    `StatusBadge: pad 4 8, rad 4, fs 12
  success:
    bg #10b981
    col white
  warning:
    bg #f59e0b
    col black
  error:
    bg #ef4444
    col white

Frame hor, gap 8
  StatusBadge "Active", success
  StatusBadge "Pending", warning
  StatusBadge "Failed", error`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),
])
