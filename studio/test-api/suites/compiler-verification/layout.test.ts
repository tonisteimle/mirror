/**
 * Compiler Verification — Layout Verification (basic + advanced)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 2. Layout-Verifizierung
// =============================================================================

export const layoutVerificationTests: TestCase[] = describe('Layout Verification', [
  testWithSetup(
    'Horizontal layout with gap',
    `Frame hor, gap 16, pad 8, bg #1a1a1a
  Button "A", w 50, h 30, bg #333
  Button "B", w 50, h 30, bg #444
  Button "C", w 50, h 30, bg #555`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.flexDirection === 'row',
        `Should be row, got ${frame.styles.flexDirection}`
      )
      api.assert.ok(frame.styles.gap === '16px', `Gap should be 16px, got ${frame.styles.gap}`)

      // All 3 buttons should exist
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // Verify button widths
      const btnA = api.preview.inspect('node-2')
      api.assert.ok(btnA, 'btnA should exist')
      api.assert.ok(
        btnA?.styles.width === '50px',
        `Button A width should be 50px, got ${btnA?.styles.width}`
      )
    }
  ),

  testWithSetup(
    'Vertical layout with spread',
    `Frame h 300, spread, pad 16, bg #1a1a1a
  Text "Top", col white
  Text "Middle", col #888
  Text "Bottom", col #666`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.flexDirection === 'column',
        `Should be column, got ${frame.styles.flexDirection}`
      )
      api.assert.ok(
        frame.styles.justifyContent === 'space-between',
        `Should be space-between, got ${frame.styles.justifyContent}`
      )
    }
  ),

  testWithSetup(
    'Center alignment both axes',
    `Frame w 200, h 200, center, bg #1a1a1a
  Text "Centered", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(
        frame.styles.justifyContent === 'center',
        `justifyContent should be center, got ${frame.styles.justifyContent}`
      )
      api.assert.ok(
        frame.styles.alignItems === 'center',
        `alignItems should be center, got ${frame.styles.alignItems}`
      )
    }
  ),

  testWithSetup(
    'Grid layout 12 columns',
    `Frame grid 12, gap 8, w 400, bg #1a1a1a
  Frame w 6, h 50, bg #333
  Frame w 6, h 50, bg #444
  Frame w 4, h 50, bg #555
  Frame w 4, h 50, bg #666
  Frame w 4, h 50, bg #777`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', `Should be grid, got ${grid.styles.display}`)

      // Should have 5 children
      api.assert.ok(
        grid.children.length === 5,
        `Should have 5 children, got ${grid.children.length}`
      )
    }
  ),

  testWithSetup(
    'Stacked layout with positioning',
    `Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w full, h full, bg #333
  Frame x 20, y 20, w 50, h 50, bg #2271C1
  Frame x 100, y 100, w 80, h 80, bg #10b981`,
    async (api: TestAPI) => {
      const stack = api.preview.inspect('node-1')
      api.assert.ok(stack !== null, 'Stack should exist')

      // Child frames should have position
      const child2 = api.preview.inspect('node-3')
      api.assert.ok(child2 !== null, 'Positioned child should exist')
      api.assert.ok(
        child2.styles.position === 'absolute',
        `Should be absolute, got ${child2.styles.position}`
      )
      api.assert.ok(child2.styles.left === '20px', `Left should be 20px, got ${child2.styles.left}`)
      api.assert.ok(child2.styles.top === '20px', `Top should be 20px, got ${child2.styles.top}`)
    }
  ),

  testWithSetup(
    'Wrap layout',
    `Frame hor, wrap, gap 8, w 150, bg #1a1a1a
  Frame w 60, h 40, bg #333
  Frame w 60, h 40, bg #444
  Frame w 60, h 40, bg #555
  Frame w 60, h 40, bg #666`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame.styles.flexWrap === 'wrap', `Should wrap, got ${frame.styles.flexWrap}`)
    }
  ),

  testWithSetup(
    '9-position alignment (all corners and edges)',
    `Frame w 300, h 300, bg #1a1a1a, stacked
  Frame tl, w 30, h 30, bg #f00
  Frame tc, w 30, h 30, bg #0f0
  Frame tr, w 30, h 30, bg #00f
  Frame cl, w 30, h 30, bg #ff0
  Frame center, w 30, h 30, bg #0ff
  Frame cr, w 30, h 30, bg #f0f
  Frame bl, w 30, h 30, bg #fff
  Frame bc, w 30, h 30, bg #888
  Frame br, w 30, h 30, bg #444`,
    async (api: TestAPI) => {
      // All 9 positioned elements should exist
      for (let i = 2; i <= 10; i++) {
        api.assert.exists(`node-${i}`)
      }

      // Check top-left positioning
      const tl = api.preview.inspect('node-2')
      api.assert.ok(tl !== null, 'TL element should exist')
    }
  ),
])

// =============================================================================
// 14. Advanced Layout
// =============================================================================

export const advancedLayoutTests: TestCase[] = describe('Advanced Layout', [
  testWithSetup(
    'Grid with explicit positions',
    `Frame grid 12, gap 8, w 400, h 300, bg #1a1a1a
  Frame x 1, y 1, w 12, h 1, bg #2271C1
  Frame x 1, y 2, w 3, h 3, bg #333
  Frame x 4, y 2, w 9, h 3, bg #444`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', 'Should be grid layout')
      api.assert.ok(grid.children.length === 3, 'Should have 3 children')
    }
  ),

  testWithSetup(
    'Grow and shrink flex items',
    `Frame hor, gap 8, w 400, bg #1a1a1a, pad 8
  Frame w 100, h 50, bg #333, shrink
  Frame grow, h 50, bg #2271C1
  Frame w 100, h 50, bg #333, shrink`,
    async (api: TestAPI) => {
      const middle = api.preview.inspect('node-3')
      api.assert.ok(middle !== null, 'Middle element should exist')

      // Should have flex-grow
      const hasGrow = middle.styles.flexGrow === '1' || middle.styles.flex?.includes('1')

      api.assert.ok(hasGrow, `Should have flex-grow, got flexGrow: ${middle.styles.flexGrow}`)
    }
  ),

  testWithSetup(
    'Nested flex layouts',
    `Frame h 300, bg #1a1a1a
  Frame hor, h 50, bg #333, spread, ver-center, pad 0 16
    Text "Header", col white
    Icon "menu", ic white, is 20
  Frame grow, hor, gap 0
    Frame w 200, bg #222, pad 16
      Text "Sidebar", col white
    Frame grow, bg #2a2a2a, pad 16
      Text "Content", col white
  Frame h 40, bg #333, center
    Text "Footer", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Header
      api.assert.exists('node-5') // Middle row
      api.assert.exists('node-9') // Footer

      const header = api.preview.inspect('node-2')
      api.assert.ok(header?.styles.flexDirection === 'row', 'Header should be horizontal')
      api.assert.ok(header?.styles.justifyContent === 'space-between', 'Header should be spread')
    }
  ),

  testWithSetup(
    'Min and max constraints',
    `Frame minw 100, maxw 400, minh 50, maxh 200, bg #2271C1, pad 16
  Text "Constrained", col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')

      api.assert.ok(
        frame.styles.minWidth === '100px',
        `minWidth should be 100px, got ${frame.styles.minWidth}`
      )
      api.assert.ok(
        frame.styles.maxWidth === '400px',
        `maxWidth should be 400px, got ${frame.styles.maxWidth}`
      )
      api.assert.ok(
        frame.styles.minHeight === '50px',
        `minHeight should be 50px, got ${frame.styles.minHeight}`
      )
      api.assert.ok(
        frame.styles.maxHeight === '200px',
        `maxHeight should be 200px, got ${frame.styles.maxHeight}`
      )
    }
  ),

  testWithSetup(
    'Scroll container',
    `Frame w 200, h 150, bg #1a1a1a, pad 8, scroll
  Frame h 300, bg #333
    Text "Scrollable content", col white`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have overflow scroll or auto
      const hasScroll =
        container.styles.overflow === 'auto' ||
        container.styles.overflowY === 'auto' ||
        container.styles.overflow === 'scroll' ||
        container.styles.overflowY === 'scroll'

      api.assert.ok(
        hasScroll,
        `Should have scroll overflow, got overflow: ${container.styles.overflow}`
      )
    }
  ),

  testWithSetup(
    'Clip overflow',
    `Frame w 100, h 100, bg #1a1a1a, clip
  Frame w 200, h 200, bg #2271C1`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')

      // Should have overflow hidden
      api.assert.ok(
        container.styles.overflow === 'hidden',
        `Should clip overflow, got ${container.styles.overflow}`
      )
    }
  ),
])
