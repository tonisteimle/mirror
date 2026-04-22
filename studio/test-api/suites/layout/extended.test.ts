/**
 * Extended Layout Tests - B3.3
 *
 * Additional layout tests for:
 * - minw/maxw Constraints
 * - minh/maxh Constraints
 * - Grid with explicit x/y position
 * - row-height Verification
 * - gap-x/gap-y separate values
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get computed style value
 */
function getStyle(nodeId: string, property: string): string {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!el) return ''
  return window.getComputedStyle(el).getPropertyValue(property)
}

/**
 * Get element bounds
 */
function getBounds(nodeId: string): DOMRect | null {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  return el?.getBoundingClientRect() ?? null
}

// =============================================================================
// Min/Max Width Constraints
// =============================================================================

export const minMaxWidthTests: TestCase[] = describe('Min/Max Width Constraints', [
  testWithSetup('minw sets minimum width', 'Frame minw 100, bg #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minWidth', '100px')
  }),

  testWithSetup('maxw sets maximum width', 'Frame maxw 200, bg #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxWidth', '200px')
  }),

  testWithSetup(
    'minw prevents element from shrinking below',
    'Frame hor, w 100\n  Frame minw 80, grow, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      // Element should respect minw even in constrained container
      const bounds = getBounds('node-2')
      api.assert.ok(bounds !== null, 'Element should exist')
      if (bounds) {
        api.assert.ok(
          bounds.width >= 80,
          `Element with minw 80 should be at least 80px wide, got ${bounds.width}px`
        )
      }
    }
  ),

  testWithSetup(
    'maxw prevents element from growing beyond',
    'Frame hor, w 500\n  Frame maxw 200, grow, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      const bounds = getBounds('node-2')
      api.assert.ok(bounds !== null, 'Element should exist')
      if (bounds) {
        api.assert.ok(
          bounds.width <= 200,
          `Element with maxw 200 should not exceed 200px, got ${bounds.width}px`
        )
      }
    }
  ),

  testWithSetup(
    'Combined minw and maxw',
    'Frame minw 100, maxw 300, grow, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'minWidth', '100px')
      api.assert.hasStyle('node-1', 'maxWidth', '300px')
    }
  ),

  testWithSetup(
    'minw with w full',
    'Frame hor, w 50\n  Frame minw 100, w full, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      // minw should override w full in constrained container
      const bounds = getBounds('node-2')
      api.assert.ok(bounds !== null, 'Element should exist')
      if (bounds) {
        api.assert.ok(
          bounds.width >= 100,
          `minw should override width constraint, got ${bounds.width}px`
        )
      }
    }
  ),
])

// =============================================================================
// Min/Max Height Constraints
// =============================================================================

export const minMaxHeightTests: TestCase[] = describe('Min/Max Height Constraints', [
  testWithSetup('minh sets minimum height', 'Frame minh 100, bg #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minHeight', '100px')
  }),

  testWithSetup('maxh sets maximum height', 'Frame maxh 200, bg #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxHeight', '200px')
  }),

  testWithSetup(
    'minh prevents element from shrinking below',
    'Frame ver, h 50\n  Frame minh 80, grow, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      const bounds = getBounds('node-2')
      api.assert.ok(bounds !== null, 'Element should exist')
      if (bounds) {
        api.assert.ok(
          bounds.height >= 80,
          `Element with minh 80 should be at least 80px tall, got ${bounds.height}px`
        )
      }
    }
  ),

  testWithSetup(
    'maxh prevents element from growing beyond',
    'Frame ver, h 500\n  Frame maxh 100, grow, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      const bounds = getBounds('node-2')
      api.assert.ok(bounds !== null, 'Element should exist')
      if (bounds) {
        api.assert.ok(
          bounds.height <= 100,
          `Element with maxh 100 should not exceed 100px, got ${bounds.height}px`
        )
      }
    }
  ),

  testWithSetup(
    'Combined minh and maxh',
    'Frame minh 50, maxh 150, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'minHeight', '50px')
      api.assert.hasStyle('node-1', 'maxHeight', '150px')
    }
  ),

  testWithSetup(
    'All four min/max constraints',
    'Frame minw 100, maxw 300, minh 50, maxh 200, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'minWidth', '100px')
      api.assert.hasStyle('node-1', 'maxWidth', '300px')
      api.assert.hasStyle('node-1', 'minHeight', '50px')
      api.assert.hasStyle('node-1', 'maxHeight', '200px')
    }
  ),
])

// =============================================================================
// Grid with Explicit x/y Position
// =============================================================================

export const gridPositionTests: TestCase[] = describe('Grid with x/y Position', [
  testWithSetup(
    'Grid element with x position',
    'Frame grid 12, w 480\n  Frame x 1, w 6, bg #2271C1\n  Frame x 7, w 6, bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Both elements should be on the grid
      const el1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const el2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      if (el1 && el2) {
        const style1 = window.getComputedStyle(el1)
        const style2 = window.getComputedStyle(el2)

        // Check gridColumn
        api.assert.ok(
          style1.gridColumnStart !== 'auto' || style1.gridColumn !== 'auto',
          'First element should have explicit grid column'
        )
        api.assert.ok(
          style2.gridColumnStart !== 'auto' || style2.gridColumn !== 'auto',
          'Second element should have explicit grid column'
        )
      }
    }
  ),

  testWithSetup(
    'Grid element with y position (row)',
    'Frame grid 12, w 480, row-height 50\n  Frame x 1, y 1, w 12, bg #2271C1\n  Frame x 1, y 2, w 12, bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Elements should be on different rows
      const bounds1 = getBounds('node-2')
      const bounds2 = getBounds('node-3')

      api.assert.ok(bounds1 !== null, 'First element should exist')
      api.assert.ok(bounds2 !== null, 'Second element should exist')

      if (bounds1 && bounds2) {
        api.assert.ok(
          bounds2.top > bounds1.bottom - 5, // Small tolerance
          `Second element (y 2) should be below first element (y 1). Y1 bottom: ${bounds1.bottom}, Y2 top: ${bounds2.top}`
        )
      }
    }
  ),

  testWithSetup(
    'Grid element spanning multiple rows with h',
    'Frame grid 12, w 480, row-height 50\n  Frame x 1, y 1, w 6, h 2, bg #2271C1\n  Frame x 7, y 1, w 6, bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const boundsSpan = getBounds('node-2')
      const boundsSingle = getBounds('node-3')

      api.assert.ok(boundsSpan !== null, 'Spanning element should exist')
      api.assert.ok(boundsSingle !== null, 'Single row element should exist')

      if (boundsSpan && boundsSingle) {
        // Element with h 2 should be taller (spanning 2 rows)
        api.assert.ok(
          boundsSpan.height > boundsSingle.height + 20,
          `h 2 element should be taller than h 1. H2: ${boundsSpan.height}px, H1: ${boundsSingle.height}px`
        )
      }
    }
  ),

  testWithSetup(
    'Complex grid layout with multiple positioned elements',
    'Frame grid 12, w 480, gap 8\n  Frame x 1, w 4, bg #ef4444\n  Frame x 5, w 4, bg #10b981\n  Frame x 9, w 4, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      const bounds1 = getBounds('node-2')
      const bounds2 = getBounds('node-3')
      const bounds3 = getBounds('node-4')

      api.assert.ok(bounds1 !== null, 'First element should exist')
      api.assert.ok(bounds2 !== null, 'Second element should exist')
      api.assert.ok(bounds3 !== null, 'Third element should exist')

      if (bounds1 && bounds2 && bounds3) {
        // All should be on same row
        api.assert.ok(Math.abs(bounds1.top - bounds2.top) < 2, 'Elements should be on same row')
        api.assert.ok(Math.abs(bounds2.top - bounds3.top) < 2, 'Elements should be on same row')

        // Should be positioned left to right
        api.assert.ok(bounds1.right < bounds2.left, 'First element should be left of second')
        api.assert.ok(bounds2.right < bounds3.left, 'Second element should be left of third')
      }
    }
  ),
])

// =============================================================================
// Row-Height Verification
// =============================================================================

export const rowHeightTests: TestCase[] = describe('Row Height', [
  testWithSetup(
    'row-height sets grid row height',
    'Frame grid 12, w 480, row-height 50\n  Frame w 12, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Check gridAutoRows style
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        api.assert.ok(
          style.gridAutoRows.includes('50px') || style.gridAutoRows === '50px',
          `gridAutoRows should be 50px, got ${style.gridAutoRows}`
        )
      }
    }
  ),

  testWithSetup(
    'row-height rh alias',
    'Frame grid 12, w 480, rh 40\n  Frame w 12, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        api.assert.ok(
          style.gridAutoRows.includes('40') || style.gridAutoRows === '40px',
          `rh alias should set gridAutoRows to 40px, got ${style.gridAutoRows}`
        )
      }
    }
  ),

  testWithSetup(
    'row-height affects actual row heights',
    'Frame grid 12, w 480, row-height 60\n  Frame w 6, bg #2271C1\n  Frame w 6, bg #10b981\n  Frame w 6, bg #ef4444\n  Frame w 6, bg #f59e0b',
    async (api: TestAPI) => {
      // 4 elements with w 6 = 2 per row = 2 rows
      api.assert.exists('node-1')

      const bounds1 = getBounds('node-2')
      const bounds3 = getBounds('node-4')

      api.assert.ok(bounds1 !== null, 'First row element should exist')
      api.assert.ok(bounds3 !== null, 'Second row element should exist')

      if (bounds1 && bounds3) {
        // First element should be ~60px tall
        api.assert.ok(
          Math.abs(bounds1.height - 60) < 10,
          `Row height should be ~60px, got ${bounds1.height}px`
        )

        // Row gap should position second row correctly
        api.assert.ok(bounds3.top >= bounds1.bottom - 5, 'Second row should start after first row')
      }
    }
  ),
])

// =============================================================================
// Gap-X / Gap-Y Separate Values
// =============================================================================

export const gapXYTests: TestCase[] = describe('Gap-X / Gap-Y', [
  testWithSetup(
    'gap-x sets horizontal gap only',
    'Frame hor, gap-x 20, wrap, w 200\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        // columnGap or gap property
        api.assert.ok(
          style.columnGap === '20px' || style.gap.includes('20px'),
          `gap-x should set columnGap to 20px, got columnGap: ${style.columnGap}, gap: ${style.gap}`
        )
      }
    }
  ),

  testWithSetup(
    'gap-y sets vertical gap only',
    'Frame ver, gap-y 16\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        // rowGap or gap property
        api.assert.ok(
          style.rowGap === '16px' || style.gap.includes('16px'),
          `gap-y should set rowGap to 16px, got rowGap: ${style.rowGap}, gap: ${style.gap}`
        )
      }
    }
  ),

  testWithSetup(
    'gx alias for gap-x',
    'Frame hor, gx 12\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        api.assert.ok(
          style.columnGap === '12px' || style.gap.includes('12px'),
          `gx should set columnGap, got ${style.columnGap}`
        )
      }
    }
  ),

  testWithSetup(
    'gy alias for gap-y',
    'Frame ver, gy 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        api.assert.ok(
          style.rowGap === '8px' || style.gap.includes('8px'),
          `gy should set rowGap, got ${style.rowGap}`
        )
      }
    }
  ),

  testWithSetup(
    'gap-x and gap-y together',
    'Frame wrap, gap-x 20, gap-y 10, w 200\n  Button "A"\n  Button "B"\n  Button "C"\n  Button "D"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (container) {
        const style = window.getComputedStyle(container)
        // Should have different horizontal and vertical gaps
        const colGap = parseFloat(style.columnGap) || 0
        const rowGap = parseFloat(style.rowGap) || 0

        api.assert.ok(
          Math.abs(colGap - 20) < 2 || style.gap.includes('20'),
          `columnGap should be ~20px, got ${style.columnGap}`
        )
        api.assert.ok(
          Math.abs(rowGap - 10) < 2 || style.gap.includes('10'),
          `rowGap should be ~10px, got ${style.rowGap}`
        )
      }
    }
  ),

  testWithSetup(
    'gap-x and gap-y visual verification',
    'Frame hor, wrap, gap-x 30, gap-y 15, w 150\n  Frame w 60, h 40, bg #2271C1\n  Frame w 60, h 40, bg #10b981\n  Frame w 60, h 40, bg #ef4444\n  Frame w 60, h 40, bg #f59e0b',
    async (api: TestAPI) => {
      // With w 150 container and w 60 children, 2 fit per row
      api.assert.exists('node-1')

      const bounds1 = getBounds('node-2') // First row, first element
      const bounds2 = getBounds('node-3') // First row, second element
      const bounds3 = getBounds('node-4') // Second row, first element

      if (bounds1 && bounds2 && bounds3) {
        // Horizontal gap between elements on same row should be ~30px
        const hGap = bounds2.left - bounds1.right
        api.assert.ok(
          Math.abs(hGap - 30) < 5,
          `Horizontal gap (gap-x) should be ~30px, got ${hGap}px`
        )

        // Vertical gap between rows should be ~15px
        const vGap = bounds3.top - bounds1.bottom
        api.assert.ok(
          Math.abs(vGap - 15) < 5,
          `Vertical gap (gap-y) should be ~15px, got ${vGap}px`
        )
      }
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allExtendedLayoutTests: TestCase[] = [
  ...minMaxWidthTests,
  ...minMaxHeightTests,
  ...gridPositionTests,
  ...rowHeightTests,
  ...gapXYTests,
]

export default allExtendedLayoutTests
