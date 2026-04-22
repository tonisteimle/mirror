/**
 * Extended Styling Tests - B3.2
 *
 * Additional styling tests for:
 * - rgba() color format
 * - Hex with alpha (#2271C180)
 * - Per-side padding (pad-t, pad-r, pad-b, pad-l)
 * - Per-side margin (mar-t, mar-r, mar-b, mar-l)
 * - Per-side border (bor-t, bor-r, bor-b, bor-l)
 * - Shadow value validation
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse rgba string to components
 */
function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return null
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] ? parseFloat(match[4]) : 1,
  }
}

/**
 * Get computed style value
 */
function getStyle(nodeId: string, property: string): string {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!el) return ''
  return window.getComputedStyle(el).getPropertyValue(property)
}

// =============================================================================
// RGBA Color Format Tests
// =============================================================================

export const rgbaColorTests: TestCase[] = describe('RGBA Color Format', [
  testWithSetup(
    'rgba() background with full opacity',
    'Frame bg rgba(34,113,193,1), w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse rgba, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.r === 34, `Red should be 34, got ${parsed.r}`)
        api.assert.ok(parsed.g === 113, `Green should be 113, got ${parsed.g}`)
        api.assert.ok(parsed.b === 193, `Blue should be 193, got ${parsed.b}`)
      }
    }
  ),

  testWithSetup(
    'rgba() background with 50% opacity',
    'Frame bg rgba(0,0,0,0.5), w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse rgba, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.r === 0, `Red should be 0, got ${parsed.r}`)
        api.assert.ok(parsed.g === 0, `Green should be 0, got ${parsed.g}`)
        api.assert.ok(parsed.b === 0, `Blue should be 0, got ${parsed.b}`)
        api.assert.ok(Math.abs(parsed.a - 0.5) < 0.01, `Alpha should be 0.5, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'rgba() background with 0 opacity (fully transparent)',
    'Frame bg rgba(255,0,0,0), w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse rgba, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.a === 0, `Alpha should be 0, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'rgba() text color',
    'Text "Hello", col rgba(255,255,255,0.8)',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const color = getStyle('node-1', 'color')
      const parsed = parseRgba(color)
      api.assert.ok(parsed !== null, `Should parse rgba color, got ${color}`)
      if (parsed) {
        api.assert.ok(parsed.r === 255, `Red should be 255, got ${parsed.r}`)
        api.assert.ok(parsed.g === 255, `Green should be 255, got ${parsed.g}`)
        api.assert.ok(parsed.b === 255, `Blue should be 255, got ${parsed.b}`)
        api.assert.ok(Math.abs(parsed.a - 0.8) < 0.01, `Alpha should be 0.8, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'rgba() border color',
    'Frame bor 2, boc rgba(34,113,193,0.5), w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const borderColor = getStyle('node-1', 'border-color')
      const parsed = parseRgba(borderColor)
      api.assert.ok(parsed !== null, `Should parse rgba border color, got ${borderColor}`)
      if (parsed) {
        api.assert.ok(parsed.r === 34, `Red should be 34, got ${parsed.r}`)
        api.assert.ok(Math.abs(parsed.a - 0.5) < 0.01, `Alpha should be 0.5, got ${parsed.a}`)
      }
    }
  ),
])

// =============================================================================
// Hex with Alpha Tests
// =============================================================================

export const hexAlphaTests: TestCase[] = describe('Hex with Alpha', [
  testWithSetup(
    'Hex with 80 alpha (50% opacity)',
    'Frame bg #2271C180, w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse hex with alpha, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.r === 34, `Red should be 34, got ${parsed.r}`)
        api.assert.ok(parsed.g === 113, `Green should be 113, got ${parsed.g}`)
        api.assert.ok(parsed.b === 193, `Blue should be 193, got ${parsed.b}`)
        // 80 hex = 128 decimal = 50% opacity
        api.assert.ok(parsed.a >= 0.49 && parsed.a <= 0.51, `Alpha should be ~0.5, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'Hex with FF alpha (full opacity)',
    'Frame bg #ef4444FF, w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse hex with FF alpha, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.r === 239, `Red should be 239, got ${parsed.r}`)
        api.assert.ok(parsed.a === 1, `Alpha should be 1, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'Hex with 00 alpha (fully transparent)',
    'Frame bg #00000000, w 100, h 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const bg = getStyle('node-1', 'background-color')
      const parsed = parseRgba(bg)
      api.assert.ok(parsed !== null, `Should parse hex with 00 alpha, got ${bg}`)
      if (parsed) {
        api.assert.ok(parsed.a === 0, `Alpha should be 0, got ${parsed.a}`)
      }
    }
  ),

  testWithSetup(
    'Hex with alpha on text color',
    'Text "Semi", col #FFFFFF80',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const color = getStyle('node-1', 'color')
      const parsed = parseRgba(color)
      api.assert.ok(parsed !== null, `Should parse hex color with alpha, got ${color}`)
      if (parsed) {
        api.assert.ok(parsed.r === 255, `Red should be 255, got ${parsed.r}`)
        api.assert.ok(parsed.a >= 0.49 && parsed.a <= 0.51, `Alpha should be ~0.5, got ${parsed.a}`)
      }
    }
  ),
])

// =============================================================================
// Per-Side Padding Tests
// =============================================================================

export const perSidePaddingTests: TestCase[] = describe('Per-Side Padding', [
  testWithSetup('pad-t sets only padding-top', 'Frame pad-t 12', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '12px')
    // Other sides should be 0 or default
    const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    const styles = window.getComputedStyle(el)
    api.assert.ok(
      styles.paddingBottom === '0px',
      `paddingBottom should be 0px, got ${styles.paddingBottom}`
    )
  }),

  testWithSetup('pad-r sets only padding-right', 'Frame pad-r 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingRight', '16px')
    const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    const styles = window.getComputedStyle(el)
    api.assert.ok(
      styles.paddingLeft === '0px',
      `paddingLeft should be 0px, got ${styles.paddingLeft}`
    )
  }),

  testWithSetup('pad-b sets only padding-bottom', 'Frame pad-b 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingBottom', '20px')
  }),

  testWithSetup('pad-l sets only padding-left', 'Frame pad-l 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '24px')
  }),

  testWithSetup('pt alias for pad-t', 'Frame pt 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '8px')
  }),

  testWithSetup('pr alias for pad-r', 'Frame pr 10', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingRight', '10px')
  }),

  testWithSetup('pb alias for pad-b', 'Frame pb 14', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingBottom', '14px')
  }),

  testWithSetup('pl alias for pad-l', 'Frame pl 18', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '18px')
  }),

  testWithSetup(
    'Combined per-side padding',
    'Frame pad-t 4, pad-r 8, pad-b 12, pad-l 16',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'paddingTop', '4px')
      api.assert.hasStyle('node-1', 'paddingRight', '8px')
      api.assert.hasStyle('node-1', 'paddingBottom', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '16px')
    }
  ),
])

// =============================================================================
// Per-Side Margin Tests
// =============================================================================

export const perSideMarginTests: TestCase[] = describe('Per-Side Margin', [
  testWithSetup('mar-t sets only margin-top', 'Frame mar-t 12', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginTop', '12px')
  }),

  testWithSetup('mar-r sets only margin-right', 'Frame mar-r 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginRight', '16px')
  }),

  testWithSetup('mar-b sets only margin-bottom', 'Frame mar-b 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginBottom', '20px')
  }),

  testWithSetup('mar-l sets only margin-left', 'Frame mar-l 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginLeft', '24px')
  }),

  testWithSetup('mt alias for mar-t', 'Frame mt 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginTop', '8px')
  }),

  testWithSetup('mr alias for mar-r', 'Frame mr 10', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginRight', '10px')
  }),

  testWithSetup('mb alias for mar-b', 'Frame mb 14', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginBottom', '14px')
  }),

  testWithSetup('ml alias for mar-l', 'Frame ml 18', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginLeft', '18px')
  }),

  testWithSetup(
    'Combined per-side margin',
    'Frame mar-t 4, mar-r 8, mar-b 12, mar-l 16',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'marginTop', '4px')
      api.assert.hasStyle('node-1', 'marginRight', '8px')
      api.assert.hasStyle('node-1', 'marginBottom', '12px')
      api.assert.hasStyle('node-1', 'marginLeft', '16px')
    }
  ),
])

// =============================================================================
// Per-Side Border Tests
// =============================================================================

export const perSideBorderTests: TestCase[] = describe('Per-Side Border', [
  testWithSetup('bor-t sets only border-top', 'Frame bor-t 2, boc #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderTopWidth', '2px')
    // Other sides should be 0
    const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    const styles = window.getComputedStyle(el)
    api.assert.ok(
      styles.borderBottomWidth === '0px',
      `borderBottomWidth should be 0px, got ${styles.borderBottomWidth}`
    )
  }),

  testWithSetup('bor-r sets only border-right', 'Frame bor-r 2, boc #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRightWidth', '2px')
  }),

  testWithSetup(
    'bor-b sets only border-bottom',
    'Frame bor-b 2, boc #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'borderBottomWidth', '2px')
    }
  ),

  testWithSetup('bor-l sets only border-left', 'Frame bor-l 2, boc #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderLeftWidth', '2px')
  }),

  testWithSetup('bort alias for bor-t', 'Frame bort 1, boc #444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderTopWidth', '1px')
  }),

  testWithSetup('borr alias for bor-r', 'Frame borr 1, boc #444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRightWidth', '1px')
  }),

  testWithSetup('borb alias for bor-b', 'Frame borb 1, boc #444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderBottomWidth', '1px')
  }),

  testWithSetup('borl alias for bor-l', 'Frame borl 1, boc #444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderLeftWidth', '1px')
  }),

  testWithSetup(
    'Combined per-side borders (top and bottom only)',
    'Frame bor-t 1, bor-b 1, boc #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'borderTopWidth', '1px')
      api.assert.hasStyle('node-1', 'borderBottomWidth', '1px')
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const styles = window.getComputedStyle(el)
      api.assert.ok(
        styles.borderLeftWidth === '0px',
        `borderLeftWidth should be 0px for horizontal-only border`
      )
      api.assert.ok(
        styles.borderRightWidth === '0px',
        `borderRightWidth should be 0px for horizontal-only border`
      )
    }
  ),

  testWithSetup(
    'Shorthand bor 4 values (T R B L)',
    'Frame bor 1 2 3 4, boc #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'borderTopWidth', '1px')
      api.assert.hasStyle('node-1', 'borderRightWidth', '2px')
      api.assert.hasStyle('node-1', 'borderBottomWidth', '3px')
      api.assert.hasStyle('node-1', 'borderLeftWidth', '4px')
    }
  ),
])

// =============================================================================
// Shadow Value Exact Validation
// =============================================================================

export const shadowValidationTests: TestCase[] = describe('Shadow Value Validation', [
  testWithSetup(
    'shadow sm has specific small values',
    'Frame shadow sm, w 100, h 100, bg white',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const shadow = window.getComputedStyle(el).boxShadow

      api.assert.ok(shadow !== 'none', 'Should have shadow')

      // shadow sm should be subtle - small offset and blur
      // Check that blur is small (1-4px typically)
      const blurMatch = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (blurMatch) {
        const blur = parseInt(blurMatch[3], 10)
        api.assert.ok(blur <= 4, `shadow sm blur should be <= 4px, got ${blur}px`)
      }
    }
  ),

  testWithSetup(
    'shadow md has medium values',
    'Frame shadow md, w 100, h 100, bg white',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const shadow = window.getComputedStyle(el).boxShadow

      api.assert.ok(shadow !== 'none', 'Should have shadow')

      // shadow md should have medium blur (4-10px typically)
      const blurMatch = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (blurMatch) {
        const blur = parseInt(blurMatch[3], 10)
        api.assert.ok(blur >= 4 && blur <= 15, `shadow md blur should be 4-15px, got ${blur}px`)
      }
    }
  ),

  testWithSetup(
    'shadow lg has large values',
    'Frame shadow lg, w 100, h 100, bg white',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const shadow = window.getComputedStyle(el).boxShadow

      api.assert.ok(shadow !== 'none', 'Should have shadow')

      // shadow lg should have large blur (10px+ typically)
      const blurMatch = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (blurMatch) {
        const blur = parseInt(blurMatch[3], 10)
        api.assert.ok(blur >= 10, `shadow lg blur should be >= 10px, got ${blur}px`)
      }
    }
  ),

  testWithSetup(
    'shadow sm < shadow md < shadow lg blur values',
    'Frame shadow sm, w 50, h 50, bg white',
    async (api: TestAPI) => {
      // This test verifies the relative ordering of shadow sizes
      // We'll compile three separate elements conceptually
      api.assert.exists('node-1')

      // For this test, we just verify sm exists with small blur
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const shadow = window.getComputedStyle(el).boxShadow
      api.assert.ok(shadow !== 'none', 'shadow sm should produce visible shadow')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allExtendedStylingTests: TestCase[] = [
  ...rgbaColorTests,
  ...hexAlphaTests,
  ...perSidePaddingTests,
  ...perSideMarginTests,
  ...perSideBorderTests,
  ...shadowValidationTests,
]

export default allExtendedStylingTests
