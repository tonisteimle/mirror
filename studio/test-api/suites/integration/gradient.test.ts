/**
 * Integration — Gradient Integration
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Gradient Integration
// =============================================================================

export const gradientTests: TestCase[] = describe('Gradient Integration', [
  testWithSetup(
    'Horizontal gradient background',
    `GradientCard: pad 24, rad 12, bg grad #2271C1 #7c3aed

GradientCard
  Text "Gradient Card", col white, fs 20, weight bold
  Text "Horizontal gradient from blue to purple", col rgba(255,255,255,0.8), fs 14`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Card styling
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')

      // Gradient background
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Text content
      const elText = el.textContent || ''
      api.assert.ok(elText.includes('Gradient Card'), 'Should have title')
    }
  ),

  testWithSetup(
    'Vertical gradient background',
    `Frame pad 24, rad 12, bg grad-ver #10b981 #2271C1
  Text "Vertical Gradient", col white, fs 18, weight 500`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)

      // Should have gradient
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Check it's vertical: Chrome normalizes 180deg (default direction) by removing it,
      // so a vertical gradient is `linear-gradient(color1, color2)` without an angle.
      // Non-vertical gradients would have explicit angles like 90deg, 45deg, etc.
      const bgImage = style.backgroundImage
      const isVertical =
        bgImage.includes('180deg') ||
        bgImage.includes('to bottom') ||
        // Chrome normalized: no explicit angle in linear-gradient means default (180deg = vertical)
        (bgImage.startsWith('linear-gradient(rgb') && !bgImage.includes('deg'))
      api.assert.ok(isVertical, 'Should be vertical gradient')
    }
  ),

  testWithSetup(
    'Gradient with angle',
    `Frame pad 24, rad 12, bg grad 45 #f59e0b #ef4444
  Text "45° Gradient", col white, fs 18, weight 500`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)

      // Should have gradient
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Check angle
      api.assert.ok(
        style.backgroundImage.includes('45deg') || style.background.includes('45deg'),
        'Should have 45 degree angle'
      )
    }
  ),

  testWithSetup(
    'Gradient text color',
    `Frame pad 24, bg #0a0a0a, rad 12
  Text "Gradient Text", col grad #2271C1 #7c3aed, fs 32, weight bold`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Container
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')

      // Text should have gradient (via background-clip: text)
      const text = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const style = getComputedStyle(text)

      // Either has gradient background with text clip, or special color property
      const hasGradient =
        style.backgroundImage.includes('gradient') ||
        style.background.includes('gradient') ||
        style.webkitBackgroundClip === 'text' ||
        (style as CSSStyleDeclaration & { backgroundClip?: string }).backgroundClip === 'text'

      api.assert.ok(hasGradient, 'Text should have gradient styling')
      api.assert.hasStyle('node-2', 'fontSize', '32px')
    }
  ),

  testWithSetup(
    'Gradient button with hover',
    `GradBtn as Button: pad 14 28, rad 8, bg grad #2271C1 #7c3aed, col white, weight 600, cursor pointer
  hover:
    bg grad #1d5fa8 #6d28d9
    scale 1.02

GradBtn "Gradient Button"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Gradient Button' })

      // Button styling
      api.assert.hasStyle('node-1', 'paddingTop', '14px')
      api.assert.hasStyle('node-1', 'paddingLeft', '28px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Has gradient
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const initialStyle = getComputedStyle(el)
      api.assert.ok(
        initialStyle.backgroundImage.includes('gradient'),
        'Button should have gradient background'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Should still have gradient (different colors)
      const hoverStyle = getComputedStyle(el)
      api.assert.ok(
        hoverStyle.backgroundImage.includes('gradient'),
        'Button should have gradient on hover'
      )
    }
  ),
])
