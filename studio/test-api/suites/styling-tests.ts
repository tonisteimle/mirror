/**
 * Styling Test Suite
 *
 * Tests all styling properties: colors, spacing, borders, typography, effects.
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Color Tests
// =============================================================================

export const colorTests: TestCase[] = describe('Colors', [
  // Background colors
  testWithSetup('bg with hex color', 'Frame bg #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('bg with short hex', 'Frame bg #f00', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(255, 0, 0)')
  }),

  testWithSetup('bg with named color white', 'Frame bg white', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(255, 255, 255)')
  }),

  testWithSetup('bg with named color black', 'Frame bg black', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(0, 0, 0)')
  }),

  testWithSetup('bg transparent', 'Frame bg transparent', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // transparent becomes rgba(0,0,0,0)
  }),

  // Text colors
  testWithSetup('col sets text color', 'Text "Hello", col #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(239, 68, 68)')
  }),

  testWithSetup('col white', 'Text "Hello", col white', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
  }),

  testWithSetup('c alias for col', 'Text "Hello", c #10b981', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(16, 185, 129)')
  }),

  // Border colors
  testWithSetup('boc sets border color', 'Frame bor 1, boc #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderColor', 'rgb(51, 51, 51)')
  }),
])

// =============================================================================
// Sizing Tests
// =============================================================================

export const sizingTests: TestCase[] = describe('Sizing', [
  testWithSetup('w sets width', 'Frame w 200', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '200px')
  }),

  testWithSetup('h sets height', 'Frame h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'height', '100px')
  }),

  testWithSetup('w and h together', 'Frame w 150, h 75', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'width', '150px')
    api.assert.hasStyle('node-1', 'height', '75px')
  }),

  testWithSetup('minw sets min-width', 'Frame minw 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minWidth', '100px')
  }),

  testWithSetup('maxw sets max-width', 'Frame maxw 500', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxWidth', '500px')
  }),

  testWithSetup('minh sets min-height', 'Frame minh 50', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'minHeight', '50px')
  }),

  testWithSetup('maxh sets max-height', 'Frame maxh 300', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'maxHeight', '300px')
  }),
])

// =============================================================================
// Spacing Tests (Padding & Margin)
// =============================================================================

export const spacingTests: TestCase[] = describe('Spacing', [
  // Padding
  testWithSetup('pad single value', 'Frame pad 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '16px')
  }),

  testWithSetup('pad two values (vertical horizontal)', 'Frame pad 8 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '8px')
    api.assert.hasStyle('node-1', 'paddingRight', '16px')
    api.assert.hasStyle('node-1', 'paddingBottom', '8px')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
  }),

  testWithSetup('pad four values (TRBL)', 'Frame pad 4 8 12 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '4px')
    api.assert.hasStyle('node-1', 'paddingRight', '8px')
    api.assert.hasStyle('node-1', 'paddingBottom', '12px')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
  }),

  testWithSetup('p alias for pad', 'Frame p 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'padding', '20px')
  }),

  testWithSetup('pad-x sets horizontal padding', 'Frame pad-x 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '24px')
    api.assert.hasStyle('node-1', 'paddingRight', '24px')
  }),

  testWithSetup('pad-y sets vertical padding', 'Frame pad-y 12', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '12px')
    api.assert.hasStyle('node-1', 'paddingBottom', '12px')
  }),

  testWithSetup('px alias for pad-x', 'Frame px 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingLeft', '16px')
    api.assert.hasStyle('node-1', 'paddingRight', '16px')
  }),

  testWithSetup('py alias for pad-y', 'Frame py 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'paddingTop', '8px')
    api.assert.hasStyle('node-1', 'paddingBottom', '8px')
  }),

  // Margin
  testWithSetup('mar single value', 'Frame mar 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'margin', '16px')
  }),

  testWithSetup('m alias for mar', 'Frame m 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'margin', '8px')
  }),

  testWithSetup('mar-x sets horizontal margin', 'Frame mar-x 20', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginLeft', '20px')
    api.assert.hasStyle('node-1', 'marginRight', '20px')
  }),

  testWithSetup('mar-y sets vertical margin', 'Frame mar-y 10', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'marginTop', '10px')
    api.assert.hasStyle('node-1', 'marginBottom', '10px')
  }),
])

// =============================================================================
// Border Tests
// =============================================================================

export const borderTests: TestCase[] = describe('Borders', [
  testWithSetup('bor sets border width', 'Frame bor 1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '1px')
  }),

  testWithSetup('bor with color', 'Frame bor 2, boc #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '2px')
    api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('rad sets border-radius', 'Frame rad 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '8px')
  }),

  testWithSetup('rad 99 for pill shape', 'Frame rad 99, w 100, h 40', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderRadius', '99px')
  }),

  testWithSetup('bor 0 removes border', 'Frame bor 0', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderWidth', '0px')
  }),
])

// =============================================================================
// Typography Tests
// =============================================================================

export const typographyTests: TestCase[] = describe('Typography', [
  testWithSetup('fs sets font-size', 'Text "Big", fs 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontSize', '24px')
  }),

  testWithSetup('weight bold', 'Text "Bold", weight bold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '700')
  }),

  testWithSetup('weight semibold', 'Text "Semi", weight semibold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '600')
  }),

  testWithSetup('weight medium', 'Text "Medium", weight medium', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('weight normal', 'Text "Normal", weight normal', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '400')
  }),

  testWithSetup('weight light', 'Text "Light", weight light', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '300')
  }),

  testWithSetup('weight numeric', 'Text "500", weight 500', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('font mono', 'Text "Code", font mono', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // mono sets monospace font family
  }),

  testWithSetup('italic', 'Text "Italic", italic', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontStyle', 'italic')
  }),

  testWithSetup('underline', 'Text "Underline", underline', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textDecoration', 'underline')
  }),

  testWithSetup('uppercase', 'Text "upper", uppercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'uppercase')
  }),

  testWithSetup('lowercase', 'Text "LOWER", lowercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'lowercase')
  }),

  testWithSetup(
    'truncate adds ellipsis',
    'Text "Very long text that gets cut off", truncate, w 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'overflow', 'hidden')
    }
  ),

  testWithSetup(
    'text-align center',
    'Text "Centered", text-align center, w 200',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'textAlign', 'center')
    }
  ),
])

// =============================================================================
// Effect Tests
// =============================================================================

export const effectTests: TestCase[] = describe('Effects', [
  testWithSetup('opacity', 'Frame opacity 0.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'opacity', '0.5')
  }),

  testWithSetup('shadow sm', 'Frame shadow sm', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // shadow sets box-shadow
  }),

  testWithSetup('shadow md', 'Frame shadow md', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('shadow lg', 'Frame shadow lg', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('blur', 'Frame blur 4', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // blur applies filter: blur()
  }),

  testWithSetup('cursor pointer', 'Frame cursor pointer', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'pointer')
  }),

  testWithSetup('cursor not-allowed', 'Frame cursor not-allowed', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'not-allowed')
  }),
])

// =============================================================================
// Visibility Tests
// =============================================================================

export const visibilityTests: TestCase[] = describe('Visibility', [
  testWithSetup('hidden sets display none', 'Frame hidden', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'none')
  }),

  testWithSetup('visible sets display flex', 'Frame visible', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'flex')
  }),

  testWithSetup('clip sets overflow hidden', 'Frame clip', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflow', 'hidden')
  }),

  testWithSetup('scroll enables scrolling', 'Frame scroll, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflowY', 'auto')
  }),
])

// =============================================================================
// Combined Styling Tests
// =============================================================================

export const combinedTests: TestCase[] = describe('Combined Styles', [
  testWithSetup(
    'Button with full styling',
    'Button "Click", bg #2271C1, col white, pad 12 24, rad 6, fs 14, weight 500',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'fontSize', '14px')
      api.assert.hasStyle('node-1', 'fontWeight', '500')
    }
  ),

  testWithSetup(
    'Card with multiple styles',
    'Frame bg #1a1a1a, pad 16, rad 8, gap 8, shadow md\n  Text "Title", col white, fs 18, weight bold\n  Text "Desc", col #888, fs 14',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allStylingTests: TestCase[] = [
  ...colorTests,
  ...sizingTests,
  ...spacingTests,
  ...borderTests,
  ...typographyTests,
  ...effectTests,
  ...visibilityTests,
  ...combinedTests,
]
