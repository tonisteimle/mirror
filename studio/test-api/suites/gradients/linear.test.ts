/**
 * Linear Gradient Tests
 *
 * Tests for gradient backgrounds:
 * - grad (horizontal gradient)
 * - grad-ver (vertical gradient)
 * - grad with angle
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const horizontalGradientTests: TestCase[] = describe('Horizontal Gradients', [
  testWithSetup(
    'Basic horizontal gradient (two colors)',
    `Frame w 200, h 100, bg grad #2271C1 #7c3aed, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have gradient background
      api.assert.ok(
        style.backgroundImage !== 'none' &&
          (style.backgroundImage.includes('gradient') || style.background.includes('gradient')),
        'Should have gradient background'
      )

      // Verify it's a linear gradient
      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should be a linear gradient'
      )
    }
  ),

  testWithSetup(
    'Horizontal gradient with brand colors',
    `Frame w 300, h 80, bg grad #10b981 #2271C1, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have linear gradient'
      )

      // Gradient should include the colors (in rgb format)
      api.assert.ok(
        style.backgroundImage.includes('rgb') || style.backgroundImage.includes('#'),
        'Gradient should contain color values'
      )
    }
  ),

  testWithSetup(
    'Button with gradient background',
    `Button "Gradient Button", bg grad #2271C1 #7c3aed, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify button styling
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      const button = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(button)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Button should have gradient background'
      )
    }
  ),

  testWithSetup(
    'Card with gradient header',
    `Frame w 250, bg #1a1a1a, rad 8, clip
  Frame h 60, bg grad #2271C1 #10b981
  Frame pad 16, gap 8
    Text "Card Title", col white, fs 16, weight bold
    Text "Description text here", col #888, fs 14`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2') // Gradient header
      api.assert.exists('node-3') // Content

      const header = await api.utils.waitForElement('node-2')
      const style = window.getComputedStyle(header)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Header should have gradient'
      )
    }
  ),
])

export const verticalGradientTests: TestCase[] = describe('Vertical Gradients', [
  testWithSetup(
    'Vertical gradient (top to bottom)',
    `Frame w 100, h 200, bg grad-ver #2271C1 #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have linear gradient'
      )

      // Vertical gradient (180deg) - browser normalizes this to default direction
      // Chrome removes 180deg from computed style since it's the default
      // We can verify it's NOT a horizontal gradient (no 90deg, no "to right")
      api.assert.ok(
        !style.backgroundImage.includes('90deg') && !style.backgroundImage.includes('to right'),
        'Should be vertical (top to bottom) gradient, not horizontal'
      )
    }
  ),

  testWithSetup(
    'Vertical gradient for fade effect',
    `Frame w 200, h 150, bg grad-ver rgba(26,26,26,0) #1a1a1a`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.backgroundImage.includes('linear-gradient'), 'Should have fade gradient')
    }
  ),

  testWithSetup(
    'Sunset gradient',
    `Frame w 300, h 200, bg grad-ver #f59e0b #ef4444 #8b5cf6, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have multi-color gradient'
      )

      // Should contain multiple color stops
      const colorMatches = style.backgroundImage.match(/rgb/g)
      api.assert.ok(
        colorMatches && colorMatches.length >= 2,
        'Should have multiple colors in gradient'
      )
    }
  ),
])

export const angledGradientTests: TestCase[] = describe('Angled Gradients', [
  testWithSetup(
    'Gradient at 45 degrees',
    `Frame w 150, h 150, bg grad 45 #2271C1 #10b981, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have angled gradient'
      )

      // Should contain 45deg angle
      api.assert.ok(style.backgroundImage.includes('45deg'), 'Should be at 45 degree angle')
    }
  ),

  testWithSetup(
    'Gradient at 135 degrees',
    `Frame w 150, h 150, bg grad 135 #ef4444 #f59e0b, rad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(style.backgroundImage.includes('135deg'), 'Should be at 135 degree angle')
    }
  ),

  testWithSetup(
    'Diagonal gradient button',
    `Button "Diagonal", bg grad 45 #8b5cf6 #ec4899, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      const button = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(button)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient') &&
          style.backgroundImage.includes('45deg'),
        'Should have diagonal gradient'
      )
    }
  ),

  testWithSetup(
    'Gradient at 90 degrees (same as horizontal)',
    `Frame w 200, h 80, bg grad 90 #2271C1 #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have 90 degree gradient'
      )
    }
  ),
])

export const gradientTextTests: TestCase[] = describe('Gradient Text', [
  testWithSetup(
    'Text with gradient color',
    `Text "Gradient Text", col grad #2271C1 #7c3aed, fs 32, weight bold`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Text gradient uses background-clip: text with -webkit-background-clip
      api.assert.ok(
        style.backgroundImage.includes('linear-gradient') || style.webkitBackgroundClip === 'text',
        'Should have gradient text styling'
      )
    }
  ),

  testWithSetup(
    'Heading with gradient',
    `Text "Welcome", col grad #f59e0b #ef4444, fs 48, weight bold`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.assert.hasStyle('node-1', 'fontSize', '48px')
      api.assert.hasStyle('node-1', 'fontWeight', '700')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.backgroundClip === 'text',
        'Heading should have gradient text'
      )
    }
  ),
])

export const gradientWithEffectsTests: TestCase[] = describe('Gradients with Effects', [
  testWithSetup(
    'Gradient with shadow',
    `Frame w 200, h 100, bg grad #2271C1 #7c3aed, rad 12, shadow lg`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      // Should have both gradient and shadow
      api.assert.ok(style.backgroundImage.includes('linear-gradient'), 'Should have gradient')
      api.assert.ok(style.boxShadow !== 'none' && style.boxShadow !== '', 'Should have shadow')
    }
  ),

  testWithSetup(
    'Gradient with opacity',
    `Frame w 200, h 100, bg grad #2271C1 #10b981, rad 8, opacity 0.8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.assert.hasStyle('node-1', 'opacity', '0.8')

      const element = await api.utils.waitForElement('node-1')
      const style = window.getComputedStyle(element)

      api.assert.ok(
        style.backgroundImage.includes('linear-gradient'),
        'Should have gradient with opacity'
      )
    }
  ),

  testWithSetup(
    'Gradient card with hover effect',
    `Frame w 200, h 120, bg grad #1a1a1a #333, rad 12, pad 16, gap 8
  Text "Premium", col #f59e0b, fs 12, uppercase
  Text "Upgrade Now", col white, fs 18, weight bold
  hover:
    bg grad #2271C1 #7c3aed`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial gradient
      const initial = await api.utils.waitForElement('node-1')
      const initialStyle = window.getComputedStyle(initial)
      api.assert.ok(
        initialStyle.backgroundImage.includes('linear-gradient'),
        'Should have initial gradient'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(150)

      // Gradient should change on hover
      const hoverStyle = window.getComputedStyle(initial)
      api.assert.ok(
        hoverStyle.backgroundImage.includes('linear-gradient'),
        'Should still have gradient on hover'
      )
    }
  ),
])

export const allGradientTests: TestCase[] = [
  ...horizontalGradientTests,
  ...verticalGradientTests,
  ...angledGradientTests,
  ...gradientTextTests,
  ...gradientWithEffectsTests,
]
