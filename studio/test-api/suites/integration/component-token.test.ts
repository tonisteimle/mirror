/**
 * Integration — Component + Token
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Component + Token Integration
// =============================================================================

export const componentTokenTests: TestCase[] = describe('Component + Token', [
  testWithSetup(
    'Button component uses color token',
    `primary.bg: #2271C1
primary.col: white

Btn as Button: bg $primary, col $primary, pad 12 24, rad 6

Btn "Save"`,
    async (api: TestAPI) => {
      // 1. Element exists and is correct tag
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save' })

      // 2. Token was resolved to EXACT color values
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // 3. Component properties were applied correctly
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingRight', '24px')
      api.assert.hasStyle('node-1', 'paddingBottom', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // 4. It's actually a clickable button
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(el.tagName === 'BUTTON', 'Must be a button element')
      api.assert.ok(!el.disabled, 'Button should be enabled')
    }
  ),

  testWithSetup(
    'Multiple components share same token',
    `accent.bg: #10b981

Card: bg $accent, pad 16, rad 8
Badge: bg $accent, pad 4 8, rad 4, fs 12

Frame gap 8
  Card
    Text "Card using accent", col white
  Badge "Active"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Card
      api.assert.exists('node-4') // Badge

      // Both components resolved same token to EXACT same RGB value
      const expectedGreen = 'rgb(16, 185, 129)'
      api.assert.hasStyle('node-2', 'backgroundColor', expectedGreen)
      api.assert.hasStyle('node-4', 'backgroundColor', expectedGreen)

      // Card styling validated
      api.assert.hasStyle('node-2', 'padding', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')

      // Badge styling validated
      api.assert.hasStyle('node-4', 'paddingTop', '4px')
      api.assert.hasStyle('node-4', 'paddingLeft', '8px')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasStyle('node-4', 'fontSize', '12px')

      // Text inside Card is white
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // DOM hierarchy: Card contains Text
      const card = document.querySelector('[data-mirror-id="node-2"]')
      const cardText = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(card !== null, 'Card element should exist')
      api.assert.ok(cardText !== null, 'Card text element should exist')
      api.assert.ok(card!.contains(cardText), 'Card must contain Text')
    }
  ),

  testWithSetup(
    'Component with multiple token types',
    `card.bg: #1a1a1a
card.rad: 8
space.pad: 16
space.gap: 12

Card: bg $card, rad $card, pad $space, gap $space

Card
  Text "Title", col white, fs 18
  Text "Description", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Title
      api.assert.exists('node-3') // Description

      // ALL tokens resolved to exact values
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'gap', '12px')

      // Card is a flex container (vertical by default)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')

      // Title styling
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')

      // Description styling
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // DOM hierarchy validated
      const card = document.querySelector('[data-mirror-id="node-1"]')
      const title = document.querySelector('[data-mirror-id="node-2"]')
      const desc = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(card !== null, 'Card element should exist')
      api.assert.ok(title !== null, 'Title element should exist')
      api.assert.ok(desc !== null, 'Description element should exist')
      api.assert.ok(card!.contains(title), 'Card must contain Title')
      api.assert.ok(card!.contains(desc), 'Card must contain Description')
      api.assert.ok(
        card!.children.length === 2,
        `Card must have exactly 2 children, got ${card!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Token override in component instance',
    `primary.bg: #2271C1
danger.bg: #ef4444

Btn as Button: bg $primary, col white, pad 10 20, rad 6

Frame hor, gap 8
  Btn "Save"
  Btn "Delete", bg $danger`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Save button
      api.assert.exists('node-3') // Delete button

      // Save uses primary token
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // Delete OVERRIDES with danger token
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // Both have same base component styling
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      api.assert.hasStyle('node-3', 'paddingTop', '10px')
      api.assert.hasStyle('node-3', 'paddingLeft', '20px')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // Frame layout verified
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // Both are actual buttons
      const save = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      const del = document.querySelector('[data-mirror-id="node-3"]') as HTMLButtonElement
      api.assert.ok(save.tagName === 'BUTTON', 'Save must be button')
      api.assert.ok(del.tagName === 'BUTTON', 'Delete must be button')
    }
  ),

  testWithSetup(
    'Property set token in component',
    `btnstyle: pad 10 20, rad 6, cursor pointer

Btn: $btnstyle, bg #333, col white

Btn "Click me"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Property set was fully expanded
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingRight', '20px')
      api.assert.hasStyle('node-1', 'paddingBottom', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Additional component properties
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Text content
      api.dom.expect('node-1', { text: 'Click me' })
    }
  ),
])
