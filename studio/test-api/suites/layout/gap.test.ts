/**
 * Gap Tests
 *
 * Tests for: gap, g, wrap
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const gapTests: TestCase[] = describe('Gap', [
  testWithSetup(
    'gap sets spacing',
    'Frame gap 16\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '16px')
    }
  ),

  testWithSetup('gap with alias g', 'Frame g 8\n  Text "A"\n  Text "B"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'gap', '8px')
  }),

  testWithSetup(
    'gap 0 removes spacing',
    'Frame gap 0\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '0px')
    }
  ),

  testWithSetup(
    'large gap value',
    'Frame gap 100\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '100px')
    }
  ),
])

export const wrapTests: TestCase[] = describe('Wrap', [
  testWithSetup(
    'wrap enables flex-wrap',
    'Frame hor, wrap, w 100\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexWrap', 'wrap')
    }
  ),
])

export const flexTests: TestCase[] = describe('Grow & Shrink', [
  testWithSetup(
    'grow makes element fill space',
    'Frame hor, h 100, w 400\n  Text "Fixed"\n  Frame grow, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3')

      // Validate the grow element has flexGrow set
      const growElement = await api.utils.waitForElement('node-3')
      const style = window.getComputedStyle(growElement)

      // flexGrow should be 1 (or greater)
      const flexGrow = parseFloat(style.flexGrow)
      api.assert.ok(
        flexGrow >= 1,
        `Growing element should have flexGrow >= 1, got: "${style.flexGrow}"`
      )

      // Validate it actually fills space - should be wider than 0
      const width = growElement.getBoundingClientRect().width
      api.assert.ok(
        width > 100,
        `Growing element should fill available space (width > 100), got: ${width}px`
      )
    }
  ),

  testWithSetup(
    'fixed width element does not shrink',
    'Frame hor, w 200\n  Frame w 150, bg #333\n  Frame w 150, bg #444',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Elements with fixed width automatically get flex-shrink: 0
      const element1 = await api.utils.waitForElement('node-2')
      const element2 = await api.utils.waitForElement('node-3')

      const style1 = window.getComputedStyle(element1)
      const style2 = window.getComputedStyle(element2)

      // Both should have flex-shrink: 0 since they have fixed widths
      api.assert.ok(
        style1.flexShrink === '0',
        `Fixed width element should have flex-shrink: 0, got: "${style1.flexShrink}"`
      )
      api.assert.ok(
        style2.flexShrink === '0',
        `Fixed width element should have flex-shrink: 0, got: "${style2.flexShrink}"`
      )

      // Elements should maintain their width (no shrinking)
      const width1 = element1.getBoundingClientRect().width
      const width2 = element2.getBoundingClientRect().width

      api.assert.ok(
        Math.abs(width1 - 150) < 5,
        `First element should maintain 150px width, got: ${width1}px`
      )
      api.assert.ok(
        Math.abs(width2 - 150) < 5,
        `Second element should maintain 150px width, got: ${width2}px`
      )
    }
  ),

  testWithSetup(
    'grow with multiple elements distributes space',
    'Frame hor, w 400\n  Frame grow, bg #333\n  Frame grow, bg #444',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const element1 = await api.utils.waitForElement('node-2')
      const element2 = await api.utils.waitForElement('node-3')

      const style1 = window.getComputedStyle(element1)
      const style2 = window.getComputedStyle(element2)

      // Both should have flexGrow
      api.assert.ok(
        parseFloat(style1.flexGrow) >= 1,
        `First grow element should have flexGrow >= 1, got: "${style1.flexGrow}"`
      )
      api.assert.ok(
        parseFloat(style2.flexGrow) >= 1,
        `Second grow element should have flexGrow >= 1, got: "${style2.flexGrow}"`
      )

      // Both should have similar widths (equal distribution)
      const width1 = element1.getBoundingClientRect().width
      const width2 = element2.getBoundingClientRect().width

      api.assert.ok(
        Math.abs(width1 - width2) < 10,
        `Both grow elements should have similar widths, got: ${width1}px and ${width2}px`
      )
    }
  ),

  testWithSetup(
    'fixed element does not grow',
    'Frame hor, w 400\n  Frame w 100, bg #333\n  Frame grow, bg #444',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const fixedElement = await api.utils.waitForElement('node-2')
      const growElement = await api.utils.waitForElement('node-3')

      const fixedStyle = window.getComputedStyle(fixedElement)
      const growStyle = window.getComputedStyle(growElement)

      // Fixed element should have flexGrow 0 (default)
      const fixedFlexGrow = parseFloat(fixedStyle.flexGrow)
      api.assert.ok(
        fixedFlexGrow === 0,
        `Fixed element should have flexGrow 0, got: "${fixedStyle.flexGrow}"`
      )

      // Grow element should have flexGrow >= 1
      api.assert.ok(
        parseFloat(growStyle.flexGrow) >= 1,
        `Grow element should have flexGrow >= 1, got: "${growStyle.flexGrow}"`
      )

      // Fixed element should be ~100px, grow element should fill rest (~300px)
      const fixedWidth = fixedElement.getBoundingClientRect().width
      const growWidth = growElement.getBoundingClientRect().width

      api.assert.ok(
        Math.abs(fixedWidth - 100) < 5,
        `Fixed element should be ~100px, got: ${fixedWidth}px`
      )
      api.assert.ok(
        growWidth > 250,
        `Grow element should fill remaining space (> 250px), got: ${growWidth}px`
      )
    }
  ),
])
