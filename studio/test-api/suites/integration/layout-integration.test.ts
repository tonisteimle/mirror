/**
 * Integration — Layout + Component + State
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Layout + Component + State Integration
// =============================================================================

export const layoutIntegrationTests: TestCase[] = describe('Layout + Component + State', [
  testWithSetup(
    'Grid of toggleable cards',
    `Card: bg #1a1a1a, pad 16, rad 8, cursor pointer, toggle()
  hover:
    shadow md
  on:
    bg #2271C1
    shadow lg

Frame grid 2, gap 12
  Card
    Text "Option A", col white
  Card
    Text "Option B", col white
  Card
    Text "Option C", col white
  Card
    Text "Option D", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Grid
      api.assert.exists('node-2') // Card A
      api.assert.exists('node-4') // Card B
      api.assert.exists('node-6') // Card C
      api.assert.exists('node-8') // Card D

      // Grid layout verified
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'gap', '12px')

      const grid = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const gridStyle = getComputedStyle(grid)
      api.assert.ok(
        gridStyle.gridTemplateColumns.includes('repeat') ||
          gridStyle.gridTemplateColumns.split(' ').length >= 2,
        'Grid should have 2 columns'
      )

      // All cards have default styling
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')

      // === TOGGLE FIRST CARD ===
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // First card is on (blue)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Others still default (independent toggle)
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')

      // === TOGGLE THIRD CARD ===
      await api.interact.click('node-6')
      await api.utils.delay(200)

      // Both first and third on
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')

      // Second and fourth still off
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Horizontal scroll with hover cards',
    `Card: bg #1a1a1a, pad 16, rad 8, w 200, cursor pointer
  hover:
    bg #252525
    scale 1.02

Frame hor, gap 12, scroll-hor, pad 4
  Card
    Text "Card 1", col white
  Card
    Text "Card 2", col white
  Card
    Text "Card 3", col white
  Card
    Text "Card 4", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Scroll container

      // Container layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'padding', '4px')

      // Should have horizontal scroll
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const computedStyle = getComputedStyle(container)
      api.assert.ok(
        computedStyle.overflowX === 'auto' || computedStyle.overflowX === 'scroll',
        `Should have horizontal scroll, got ${computedStyle.overflowX}`
      )

      // Cards exist with fixed width
      api.assert.hasStyle('node-2', 'width', '200px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'padding', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')

      // Cards should NOT shrink in horizontal scroll (default flex-shrink: 0 for items with fixed width)
      api.assert.hasStyle('node-2', 'flexShrink', '0')
    }
  ),

  testWithSetup(
    'Stacked layout with interactive overlay',
    `Overlay: abs, x 0, y 0, w full, h full, bg rgba(0,0,0,0.5), center, hidden
  Button.open:
    visible

CloseBtn as Button: pad 12 24, bg white, col black, rad 6
  hover:
    bg #f0f0f0

Frame stacked, w 300, h 200, bg #1a1a1a, rad 8, relative
  Text "Background Content", col white, pad 16
  Button name openBtn, pad 10 20, bg #2271C1, col white, rad 6, toggle(), x 16, y 50
    open:
      bg #1d5fa8
  Overlay
    CloseBtn "Close"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Stacked container

      // Container is stacked (position: relative for stacking context)
      api.assert.hasStyle('node-1', 'position', 'relative')
      api.assert.hasStyle('node-1', 'width', '300px')
      api.assert.hasStyle('node-1', 'height', '200px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Container has stacked display
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(container)
      api.assert.ok(
        style.display === 'grid' || style.position === 'relative',
        'Stacked container should use grid or relative positioning'
      )

      // Content exists
      const containerText = container.textContent || ''
      api.assert.ok(containerText.includes('Background Content'), 'Should have background content')
    }
  ),
])
