/**
 * Stacked Layout Tests
 *
 * Tests for: stacked, absolute positioning
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const stackedTests: TestCase[] = describe('Stacked Layout', [
  testWithSetup(
    'stacked positions children absolutely',
    'Frame stacked, w 100, h 100\n  Text "Bottom"\n  Text "Top"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Parent should have position: relative to establish positioning context
      const parent = await api.utils.waitForElement('node-1')
      const parentStyle = window.getComputedStyle(parent)

      api.assert.ok(
        parentStyle.position === 'relative',
        `Stacked parent should have position: relative, got: "${parentStyle.position}"`
      )

      // Children should be absolutely positioned
      const child1 = await api.utils.waitForElement('node-2')
      const child2 = await api.utils.waitForElement('node-3')
      const child1Style = window.getComputedStyle(child1)
      const child2Style = window.getComputedStyle(child2)

      api.assert.ok(
        child1Style.position === 'absolute',
        `First child should have position: absolute, got: "${child1Style.position}"`
      )
      api.assert.ok(
        child2Style.position === 'absolute',
        `Second child should have position: absolute, got: "${child2Style.position}"`
      )
    }
  ),

  testWithSetup(
    'stacked with positioned children',
    'Frame stacked, w 100, h 100\n  Frame w full, h full, bg #2271C1\n  Frame x 10, y 10, w 20, h 20, bg #ef4444',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)

      // Positioned child should have correct left/top values
      const positionedChild = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(positionedChild)

      api.assert.ok(
        style.position === 'absolute',
        `Positioned child should have position: absolute, got: "${style.position}"`
      )

      // Validate x = 10, y = 10
      api.assert.ok(
        style.left === '10px',
        `Positioned child should have left: 10px, got: "${style.left}"`
      )
      api.assert.ok(
        style.top === '10px',
        `Positioned child should have top: 10px, got: "${style.top}"`
      )

      // Validate dimensions
      const width = positionedChild.getBoundingClientRect().width
      const height = positionedChild.getBoundingClientRect().height

      api.assert.ok(
        Math.abs(width - 20) < 2,
        `Positioned child should be 20px wide, got: ${width}px`
      )
      api.assert.ok(
        Math.abs(height - 20) < 2,
        `Positioned child should be 20px tall, got: ${height}px`
      )
    }
  ),

  testWithSetup(
    'stacked children overlap correctly',
    'Frame stacked, w 100, h 100\n  Frame w full, h full, bg #333, z 1\n  Frame w full, h full, bg #2271C1, z 2',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const bottomLayer = await api.utils.waitForElement('node-2')
      const topLayer = await api.utils.waitForElement('node-3')

      const bottomZ = window.getComputedStyle(bottomLayer).zIndex
      const topZ = window.getComputedStyle(topLayer).zIndex

      // Top layer should have higher z-index
      api.assert.ok(
        parseInt(topZ) > parseInt(bottomZ),
        `Top layer (z=${topZ}) should have higher z-index than bottom (z=${bottomZ})`
      )

      // Both should cover the full parent
      const parentRect = (await api.utils.waitForElement('node-1')).getBoundingClientRect()
      const bottomRect = bottomLayer.getBoundingClientRect()
      const topRect = topLayer.getBoundingClientRect()

      api.assert.ok(
        Math.abs(bottomRect.width - parentRect.width) < 2,
        `Bottom layer should fill parent width`
      )
      api.assert.ok(
        Math.abs(topRect.width - parentRect.width) < 2,
        `Top layer should fill parent width`
      )
    }
  ),
])
