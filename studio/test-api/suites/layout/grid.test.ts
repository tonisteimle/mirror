/**
 * Grid Layout Tests
 *
 * Tests for: grid, 12-column system
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const gridTests: TestCase[] = describe('Grid Layout', [
  testWithSetup(
    'grid creates 12-column grid',
    'Frame grid 12, w 600\n  Frame w 6, bg #2271C1\n  Frame w 6, bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'grid')

      // Validate grid has columns defined
      const gridContainer = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(gridContainer)

      // gridTemplateColumns should define columns
      api.assert.ok(
        style.gridTemplateColumns !== 'none' && style.gridTemplateColumns !== '',
        `Grid should have gridTemplateColumns defined, got: "${style.gridTemplateColumns}"`
      )

      // Children should span 6 columns each (half the grid)
      const child1 = await api.utils.waitForElement('node-2')
      const child2 = await api.utils.waitForElement('node-3')

      const child1Width = child1.getBoundingClientRect().width
      const child2Width = child2.getBoundingClientRect().width
      const containerWidth = gridContainer.getBoundingClientRect().width

      // Each 6-column child should be ~50% of container width
      const expectedWidth = containerWidth / 2
      api.assert.ok(
        Math.abs(child1Width - expectedWidth) < 10,
        `First child (w 6) should be ~50% of container (${expectedWidth}px), got: ${child1Width}px`
      )
      api.assert.ok(
        Math.abs(child2Width - expectedWidth) < 10,
        `Second child (w 6) should be ~50% of container (${expectedWidth}px), got: ${child2Width}px`
      )
    }
  ),

  testWithSetup(
    'grid with gap',
    'Frame grid 12, gap 8, w 480\n  Frame w 4, bg #ef4444\n  Frame w 4, bg #10b981\n  Frame w 4, bg #2271C1',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // Validate children are properly positioned with gaps
      const child1 = await api.utils.waitForElement('node-2')
      const child2 = await api.utils.waitForElement('node-3')
      const child3 = await api.utils.waitForElement('node-4')

      const rect1 = child1.getBoundingClientRect()
      const rect2 = child2.getBoundingClientRect()
      const rect3 = child3.getBoundingClientRect()

      // All three children with w 4 should fit on one row
      // They should be horizontally aligned (same top)
      api.assert.ok(
        Math.abs(rect1.top - rect2.top) < 2 && Math.abs(rect2.top - rect3.top) < 2,
        `All three 4-column children should be on same row`
      )

      // There should be gaps between them
      const gap1 = rect2.left - rect1.right
      const gap2 = rect3.left - rect2.right

      api.assert.ok(
        Math.abs(gap1 - 8) < 2,
        `Gap between first and second child should be ~8px, got: ${gap1}px`
      )
      api.assert.ok(
        Math.abs(gap2 - 8) < 2,
        `Gap between second and third child should be ~8px, got: ${gap2}px`
      )
    }
  ),

  testWithSetup(
    'grid columns with different widths',
    'Frame grid 12, w 480\n  Frame w 8, bg #2271C1\n  Frame w 4, bg #10b981',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'grid')

      const container = await api.utils.waitForElement('node-1')
      const child1 = await api.utils.waitForElement('node-2')
      const child2 = await api.utils.waitForElement('node-3')

      const containerWidth = container.getBoundingClientRect().width
      const child1Width = child1.getBoundingClientRect().width
      const child2Width = child2.getBoundingClientRect().width

      // w 8 should be 2/3 (8/12) of container, w 4 should be 1/3 (4/12)
      const expectedWidth1 = (containerWidth * 8) / 12
      const expectedWidth2 = (containerWidth * 4) / 12

      api.assert.ok(
        Math.abs(child1Width - expectedWidth1) < 10,
        `w 8 child should be ~${expectedWidth1}px (8/12), got: ${child1Width}px`
      )
      api.assert.ok(
        Math.abs(child2Width - expectedWidth2) < 10,
        `w 4 child should be ~${expectedWidth2}px (4/12), got: ${child2Width}px`
      )
    }
  ),
])
