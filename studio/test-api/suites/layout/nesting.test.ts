/**
 * Nesting Tests
 *
 * Tests for: nested containers, complex layouts
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const nestingTests: TestCase[] = describe('Nesting', [
  testWithSetup(
    '2 levels of nesting',
    'Frame gap 16\n  Frame gap 8\n    Text "Inner"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasChildren('node-1', 1)
      api.assert.hasChildren('node-2', 1)
    }
  ),

  testWithSetup(
    '3 levels of nesting',
    'Frame\n  Frame\n    Frame\n      Text "Deep"',
    async (api: TestAPI) => {
      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'Deep')
    }
  ),

  testWithSetup(
    'siblings at same level',
    'Frame gap 8\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
    }
  ),

  testWithSetup(
    'mixed horizontal and vertical',
    'Frame gap 16\n  Frame hor, gap 8\n    Button "A"\n    Button "B"\n  Frame gap 4\n    Text "X"\n    Text "Y"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
    }
  ),
])

export const complexLayoutTests: TestCase[] = describe('Complex Layouts', [
  testWithSetup(
    'App Shell layout',
    'Frame hor, w 800, h 400\n  Frame w 200, bg #1a1a1a\n    Text "Sidebar"\n  Frame grow, bg #0a0a0a\n    Text "Content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasChildren('node-1', 2)

      // Validate sidebar has fixed width
      const sidebar = await api.utils.waitForElement('node-2')
      const sidebarWidth = sidebar.getBoundingClientRect().width

      api.assert.ok(
        Math.abs(sidebarWidth - 200) < 5,
        `Sidebar should be 200px wide, got: ${sidebarWidth}px`
      )

      // Validate content area grows to fill remaining space
      const content = await api.utils.waitForElement('node-4')
      const contentStyle = window.getComputedStyle(content)

      api.assert.ok(
        parseFloat(contentStyle.flexGrow) >= 1,
        `Content area should have flexGrow >= 1, got: "${contentStyle.flexGrow}"`
      )

      // Content should fill remaining width (~600px = 800 - 200)
      const contentWidth = content.getBoundingClientRect().width
      api.assert.ok(
        contentWidth > 500,
        `Content area should fill remaining space (> 500px), got: ${contentWidth}px`
      )
    }
  ),

  testWithSetup(
    'Card layout',
    'Frame gap 12, pad 16, bg #1a1a1a, rad 8\n  Text "Title", fs 18\n  Text "Description"\n  Frame hor, gap 8\n    Button "OK"\n    Button "Cancel"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
      api.assert.hasStyle('node-4', 'flexDirection', 'row')

      // Validate card styling
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      // Validate button container has gap
      api.assert.hasStyle('node-4', 'gap', '8px')

      // Validate buttons are horizontally aligned
      const button1 = await api.utils.waitForElement('node-5')
      const button2 = await api.utils.waitForElement('node-6')

      const rect1 = button1.getBoundingClientRect()
      const rect2 = button2.getBoundingClientRect()

      api.assert.ok(
        Math.abs(rect1.top - rect2.top) < 2,
        `Buttons should be horizontally aligned (same top), got: ${rect1.top} and ${rect2.top}`
      )
    }
  ),

  testWithSetup(
    'Header with spread',
    'Frame hor, spread, pad 16, bg #1a1a1a, w 600\n  Text "Logo"\n  Frame hor, gap 12\n    Text "Home"\n    Text "About"\n    Text "Contact"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
      api.assert.hasChildren('node-1', 2)

      // Validate spread distributes items to edges
      const container = await api.utils.waitForElement('node-1')
      const logo = await api.utils.waitForElement('node-2')
      const nav = await api.utils.waitForElement('node-3')

      const containerRect = container.getBoundingClientRect()
      const logoRect = logo.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()

      // Logo should be near left edge (after padding)
      api.assert.ok(
        logoRect.left - containerRect.left < 25,
        `Logo should be near left edge, got offset: ${logoRect.left - containerRect.left}px`
      )

      // Nav should be near right edge (before padding)
      api.assert.ok(
        containerRect.right - navRect.right < 25,
        `Nav should be near right edge, got offset: ${containerRect.right - navRect.right}px`
      )

      // There should be significant space between them
      const spaceBetween = navRect.left - logoRect.right
      api.assert.ok(
        spaceBetween > 100,
        `Should have significant space between logo and nav, got: ${spaceBetween}px`
      )
    }
  ),

  testWithSetup(
    'Nested layout with grow in both directions',
    'Frame hor, w 600, h 400\n  Frame w 150, bg #222\n    Text "Sidebar"\n  Frame grow\n    Frame h 50, bg #333\n      Text "Header"\n    Frame grow, bg #111\n      Text "Content"\n    Frame h 30, bg #444\n      Text "Footer"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Validate sidebar has fixed width
      const sidebar = await api.utils.waitForElement('node-2')
      const sidebarWidth = sidebar.getBoundingClientRect().width
      api.assert.ok(
        Math.abs(sidebarWidth - 150) < 5,
        `Sidebar should be 150px wide, got: ${sidebarWidth}px`
      )

      // Validate main area grows (node-4)
      const main = await api.utils.waitForElement('node-4')
      const mainStyle = window.getComputedStyle(main)
      api.assert.ok(
        parseFloat(mainStyle.flexGrow) >= 1,
        `Main area should have flexGrow >= 1, got: "${mainStyle.flexGrow}"`
      )

      // Main should fill remaining width (~450px = 600 - 150)
      const mainWidth = main.getBoundingClientRect().width
      api.assert.ok(
        mainWidth > 400,
        `Main area should fill remaining width (> 400px), got: ${mainWidth}px`
      )

      // Validate content area grows vertically (node-7)
      const content = await api.utils.waitForElement('node-7')
      const contentStyle = window.getComputedStyle(content)
      api.assert.ok(
        parseFloat(contentStyle.flexGrow) >= 1,
        `Content should have flexGrow >= 1 for vertical growth, got: "${contentStyle.flexGrow}"`
      )

      // Content should be taller than header + footer combined
      const contentHeight = content.getBoundingClientRect().height
      api.assert.ok(
        contentHeight > 200,
        `Content should fill vertical space (> 200px), got: ${contentHeight}px`
      )
    }
  ),
])
