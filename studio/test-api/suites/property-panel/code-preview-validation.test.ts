/**
 * Code + Preview Validation Tests
 *
 * These tests validate BOTH:
 * 1. The Mirror DSL code is correctly written/preserved
 * 2. The Preview renders the expected CSS/DOM
 *
 * This ensures the full pipeline works:
 * Mirror Code → Compiler → JavaScript → DOM → Computed Styles
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// ============================================================================
// Helper Functions
// ============================================================================

function getComputedStyleValue(nodeId: string, cssProperty: string): string {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return ''
  return window.getComputedStyle(element)[cssProperty as keyof CSSStyleDeclaration] as string
}

/**
 * Validates that code contains the expected property pattern
 */
function codeHasProperty(code: string, property: string, value: string | number): boolean {
  // Handle different patterns:
  // "bg #2271C1" or "bg #2271c1" (case insensitive for colors)
  // "pad 16" or "padding 16"
  // "w 100" or "width 100"
  const patterns = [
    new RegExp(`\\b${property}\\s+${value}\\b`, 'i'),
    new RegExp(`\\b${property}\\s+"${value}"`, 'i'),
  ]
  return patterns.some(p => p.test(code))
}

/**
 * Extracts the line for a specific node from code
 */
function getNodeLine(code: string, primitive: string): string | null {
  const lines = code.split('\n')
  for (const line of lines) {
    if (line.trim().startsWith(primitive)) {
      return line.trim()
    }
  }
  return null
}

// ============================================================================
// SIZING: Code + Preview Validation
// ============================================================================

export const sizingCodePreviewTests: TestCase[] = describe('Sizing: Code + Preview', [
  testWithSetup('Frame w 100 - code and preview', 'Frame w 100, bg #333', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      codeHasProperty(code, 'w', 100),
      `Code should contain "w 100", got: ${getNodeLine(code, 'Frame')}`
    )

    // 2. Validate PREVIEW
    const width = getComputedStyleValue('node-1', 'width')
    api.assert.ok(width === '100px', `Preview width should be 100px, got ${width}`)
  }),

  testWithSetup('Frame h 80 - code and preview', 'Frame h 80, bg #333', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      codeHasProperty(code, 'h', 80),
      `Code should contain "h 80", got: ${getNodeLine(code, 'Frame')}`
    )

    // 2. Validate PREVIEW
    const height = getComputedStyleValue('node-1', 'height')
    api.assert.ok(height === '80px', `Preview height should be 80px, got ${height}`)
  }),

  testWithSetup(
    'Button w 200 h 50 - code and preview',
    'Button "Click", w 200, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(codeHasProperty(code, 'w', 200), `Code should contain "w 200"`)
      api.assert.ok(codeHasProperty(code, 'h', 50), `Code should contain "h 50"`)

      // 2. Validate PREVIEW
      const width = getComputedStyleValue('node-1', 'width')
      const height = getComputedStyleValue('node-1', 'height')
      api.assert.ok(width === '200px', `Preview width should be 200px, got ${width}`)
      api.assert.ok(height === '50px', `Preview height should be 50px, got ${height}`)
    }
  ),
])

// ============================================================================
// SPACING: Code + Preview Validation
// ============================================================================

export const spacingCodePreviewTests: TestCase[] = describe('Spacing: Code + Preview', [
  testWithSetup(
    'Frame pad 16 - code and preview',
    'Frame pad 16, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'pad', 16),
        `Code should contain "pad 16", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const padding = getComputedStyleValue('node-1', 'padding')
      api.assert.ok(padding === '16px', `Preview padding should be 16px, got ${padding}`)
    }
  ),

  testWithSetup(
    'Frame pad 12 24 - code and preview',
    'Frame pad 12 24, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('pad 12 24'),
        `Code should contain "pad 12 24", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const paddingTop = getComputedStyleValue('node-1', 'paddingTop')
      const paddingLeft = getComputedStyleValue('node-1', 'paddingLeft')
      api.assert.ok(paddingTop === '12px', `Preview paddingTop should be 12px, got ${paddingTop}`)
      api.assert.ok(
        paddingLeft === '24px',
        `Preview paddingLeft should be 24px, got ${paddingLeft}`
      )
    }
  ),

  testWithSetup('Frame mar 8 - code and preview', 'Frame mar 8, bg #333', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      codeHasProperty(code, 'mar', 8),
      `Code should contain "mar 8", got: ${getNodeLine(code, 'Frame')}`
    )

    // 2. Validate PREVIEW
    const margin = getComputedStyleValue('node-1', 'margin')
    api.assert.ok(margin === '8px', `Preview margin should be 8px, got ${margin}`)
  }),

  testWithSetup(
    'Frame gap 12 - code and preview',
    'Frame gap 12, bg #333\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'gap', 12),
        `Code should contain "gap 12", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const gap = getComputedStyleValue('node-1', 'gap')
      api.assert.ok(gap === '12px', `Preview gap should be 12px, got ${gap}`)
    }
  ),
])

// ============================================================================
// COLOR: Code + Preview Validation
// ============================================================================

export const colorCodePreviewTests: TestCase[] = describe('Color: Code + Preview', [
  testWithSetup(
    'Frame bg #2271C1 - code and preview',
    'Frame bg #2271C1, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE (case-insensitive hex)
      const code = api.editor.getCode()
      api.assert.ok(
        code.toLowerCase().includes('bg #2271c1'),
        `Code should contain "bg #2271C1", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW (browser converts to rgb)
      const bg = getComputedStyleValue('node-1', 'backgroundColor')
      // rgb(34, 113, 193) = #2271C1
      api.assert.ok(
        bg.includes('34') && bg.includes('113') && bg.includes('193'),
        `Preview bg should be rgb(34, 113, 193), got ${bg}`
      )
    }
  ),

  testWithSetup(
    'Text col #ef4444 - code and preview',
    'Text "Hello", col #ef4444',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.toLowerCase().includes('col #ef4444'),
        `Code should contain "col #ef4444", got: ${getNodeLine(code, 'Text')}`
      )

      // 2. Validate PREVIEW
      const color = getComputedStyleValue('node-1', 'color')
      // rgb(239, 68, 68) = #ef4444
      api.assert.ok(
        color.includes('239') && color.includes('68'),
        `Preview color should be rgb(239, 68, 68), got ${color}`
      )
    }
  ),

  testWithSetup(
    'Frame boc #333 - code and preview',
    'Frame bor 2, boc #333333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.toLowerCase().includes('boc #333'),
        `Code should contain "boc #333", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const borderColor = getComputedStyleValue('node-1', 'borderColor')
      // rgb(51, 51, 51) = #333333
      api.assert.ok(
        borderColor.includes('51'),
        `Preview borderColor should contain 51, got ${borderColor}`
      )
    }
  ),
])

// ============================================================================
// BORDER: Code + Preview Validation
// ============================================================================

export const borderCodePreviewTests: TestCase[] = describe('Border: Code + Preview', [
  testWithSetup(
    'Frame bor 2 - code and preview',
    'Frame bor 2, boc #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'bor', 2),
        `Code should contain "bor 2", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const borderWidth = getComputedStyleValue('node-1', 'borderTopWidth')
      api.assert.ok(borderWidth === '2px', `Preview borderWidth should be 2px, got ${borderWidth}`)
    }
  ),

  testWithSetup(
    'Frame rad 8 - code and preview',
    'Frame rad 8, bg #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'rad', 8),
        `Code should contain "rad 8", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const radius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(radius === '8px', `Preview borderRadius should be 8px, got ${radius}`)
    }
  ),

  testWithSetup(
    'Button rad 99 (pill) - code and preview',
    'Button "Click", rad 99, bg #2271C1, pad 8 16',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'rad', 99),
        `Code should contain "rad 99", got: ${getNodeLine(code, 'Button')}`
      )

      // 2. Validate PREVIEW
      const radius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(radius === '99px', `Preview borderRadius should be 99px, got ${radius}`)
    }
  ),
])

// ============================================================================
// LAYOUT: Code + Preview Validation
// ============================================================================

export const layoutCodePreviewTests: TestCase[] = describe('Layout: Code + Preview', [
  testWithSetup(
    'Frame hor - code and preview',
    'Frame hor, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('hor'),
        `Code should contain "hor", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const flexDir = getComputedStyleValue('node-1', 'flexDirection')
      api.assert.ok(flexDir === 'row', `Preview flexDirection should be row, got ${flexDir}`)
    }
  ),

  testWithSetup(
    'Frame center - code and preview',
    'Frame center, w 200, h 100, bg #333\n  Text "Centered"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('center'),
        `Code should contain "center", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const justifyContent = getComputedStyleValue('node-1', 'justifyContent')
      const alignItems = getComputedStyleValue('node-1', 'alignItems')
      api.assert.ok(
        justifyContent === 'center',
        `justifyContent should be center, got ${justifyContent}`
      )
      api.assert.ok(alignItems === 'center', `alignItems should be center, got ${alignItems}`)
    }
  ),

  testWithSetup(
    'Frame wrap - code and preview',
    'Frame hor, wrap, w 100, gap 4\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('wrap'),
        `Code should contain "wrap", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const flexWrap = getComputedStyleValue('node-1', 'flexWrap')
      api.assert.ok(flexWrap === 'wrap', `Preview flexWrap should be wrap, got ${flexWrap}`)
    }
  ),

  testWithSetup(
    'Frame spread - code and preview',
    'Frame hor, spread, w 200\n  Text "Left"\n  Text "Right"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('spread'),
        `Code should contain "spread", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const justifyContent = getComputedStyleValue('node-1', 'justifyContent')
      api.assert.ok(
        justifyContent === 'space-between',
        `Preview justifyContent should be space-between, got ${justifyContent}`
      )
    }
  ),
])

// ============================================================================
// TYPOGRAPHY: Code + Preview Validation
// ============================================================================

export const typographyCodePreviewTests: TestCase[] = describe('Typography: Code + Preview', [
  testWithSetup('Text fs 24 - code and preview', 'Text "Hello", fs 24', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      codeHasProperty(code, 'fs', 24),
      `Code should contain "fs 24", got: ${getNodeLine(code, 'Text')}`
    )

    // 2. Validate PREVIEW
    const fontSize = getComputedStyleValue('node-1', 'fontSize')
    api.assert.ok(fontSize === '24px', `Preview fontSize should be 24px, got ${fontSize}`)
  }),

  testWithSetup(
    'Text weight bold - code and preview',
    'Text "Bold", weight bold',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('weight bold'),
        `Code should contain "weight bold", got: ${getNodeLine(code, 'Text')}`
      )

      // 2. Validate PREVIEW
      const fontWeight = getComputedStyleValue('node-1', 'fontWeight')
      api.assert.ok(fontWeight === '700', `Preview fontWeight should be 700, got ${fontWeight}`)
    }
  ),

  testWithSetup('Text italic - code and preview', 'Text "Italic", italic', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      code.includes('italic'),
      `Code should contain "italic", got: ${getNodeLine(code, 'Text')}`
    )

    // 2. Validate PREVIEW
    const fontStyle = getComputedStyleValue('node-1', 'fontStyle')
    api.assert.ok(fontStyle === 'italic', `Preview fontStyle should be italic, got ${fontStyle}`)
  }),

  testWithSetup(
    'Text uppercase - code and preview',
    'Text "upper", uppercase',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('uppercase'),
        `Code should contain "uppercase", got: ${getNodeLine(code, 'Text')}`
      )

      // 2. Validate PREVIEW
      const textTransform = getComputedStyleValue('node-1', 'textTransform')
      api.assert.ok(
        textTransform === 'uppercase',
        `Preview textTransform should be uppercase, got ${textTransform}`
      )
    }
  ),
])

// ============================================================================
// EFFECTS: Code + Preview Validation
// ============================================================================

export const effectsCodePreviewTests: TestCase[] = describe('Effects: Code + Preview', [
  testWithSetup(
    'Frame opacity 0.5 - code and preview',
    'Frame opacity 0.5, bg #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('opacity 0.5'),
        `Code should contain "opacity 0.5", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const opacity = getComputedStyleValue('node-1', 'opacity')
      api.assert.ok(opacity === '0.5', `Preview opacity should be 0.5, got ${opacity}`)
    }
  ),

  testWithSetup(
    'Frame shadow md - code and preview',
    'Frame shadow md, bg #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('shadow md'),
        `Code should contain "shadow md", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const shadow = getComputedStyleValue('node-1', 'boxShadow')
      api.assert.ok(
        shadow !== 'none' && shadow !== '',
        `Preview should have boxShadow, got ${shadow}`
      )
    }
  ),

  testWithSetup(
    'Frame cursor pointer - code and preview',
    'Frame cursor pointer, bg #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('cursor pointer'),
        `Code should contain "cursor pointer", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const cursor = getComputedStyleValue('node-1', 'cursor')
      api.assert.ok(cursor === 'pointer', `Preview cursor should be pointer, got ${cursor}`)
    }
  ),
])

// ============================================================================
// TRANSFORM: Code + Preview Validation
// ============================================================================

export const transformCodePreviewTests: TestCase[] = describe('Transform: Code + Preview', [
  testWithSetup(
    'Frame rotate 45 - code and preview',
    'Frame rotate 45, bg #333, w 50, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        codeHasProperty(code, 'rotate', 45),
        `Code should contain "rotate 45", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const transform = getComputedStyleValue('node-1', 'transform')
      api.assert.ok(
        transform.includes('matrix'),
        `Preview should have transform matrix, got ${transform}`
      )
    }
  ),

  testWithSetup(
    'Frame scale 1.5 - code and preview',
    'Frame scale 1.5, bg #333, w 50, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('scale 1.5'),
        `Code should contain "scale 1.5", got: ${getNodeLine(code, 'Frame')}`
      )

      // 2. Validate PREVIEW
      const transform = getComputedStyleValue('node-1', 'transform')
      api.assert.ok(
        transform.includes('matrix'),
        `Preview should have transform matrix, got ${transform}`
      )
    }
  ),
])

// ============================================================================
// ICON: Code + Preview Validation
// ============================================================================

export const iconCodePreviewTests: TestCase[] = describe('Icon: Code + Preview', [
  testWithSetup('Icon is 32 - code and preview', 'Icon "check", is 32', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // 1. Validate CODE
    const code = api.editor.getCode()
    api.assert.ok(
      codeHasProperty(code, 'is', 32),
      `Code should contain "is 32", got: ${getNodeLine(code, 'Icon')}`
    )

    // 2. Validate PREVIEW
    const width = getComputedStyleValue('node-1', 'width')
    const height = getComputedStyleValue('node-1', 'height')
    api.assert.ok(width === '32px', `Preview width should be 32px, got ${width}`)
    api.assert.ok(height === '32px', `Preview height should be 32px, got ${height}`)
  }),

  testWithSetup(
    'Icon ic #10b981 - code and preview',
    'Icon "check", ic #10b981, is 24',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE
      const code = api.editor.getCode()
      api.assert.ok(
        code.toLowerCase().includes('ic #10b981'),
        `Code should contain "ic #10b981", got: ${getNodeLine(code, 'Icon')}`
      )

      // 2. Validate PREVIEW
      const color = getComputedStyleValue('node-1', 'color')
      // rgb(16, 185, 129) = #10b981
      api.assert.ok(
        color.includes('16') && color.includes('185'),
        `Preview color should be rgb(16, 185, 129), got ${color}`
      )
    }
  ),
])

// ============================================================================
// COMPLEX COMBINATIONS: Code + Preview Validation
// ============================================================================

export const complexCodePreviewTests: TestCase[] = describe('Complex: Code + Preview', [
  testWithSetup(
    'Card with multiple properties',
    'Frame bg #1a1a1a, pad 16, rad 8, gap 12, w 200\n  Text "Title", col white, fs 18, weight bold\n  Text "Description", col #888, fs 14',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate CODE - Frame
      const code = api.editor.getCode()
      api.assert.ok(code.includes('bg #1a1a1a'), 'Code should have bg #1a1a1a')
      api.assert.ok(code.includes('pad 16'), 'Code should have pad 16')
      api.assert.ok(code.includes('rad 8'), 'Code should have rad 8')
      api.assert.ok(code.includes('gap 12'), 'Code should have gap 12')

      // 2. Validate PREVIEW - Frame
      const bg = getComputedStyleValue('node-1', 'backgroundColor')
      api.assert.ok(bg.includes('26'), `Frame bg should contain 26, got ${bg}`)

      const padding = getComputedStyleValue('node-1', 'padding')
      api.assert.ok(padding === '16px', `Frame padding should be 16px, got ${padding}`)

      const radius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(radius === '8px', `Frame radius should be 8px, got ${radius}`)

      const gap = getComputedStyleValue('node-1', 'gap')
      api.assert.ok(gap === '12px', `Frame gap should be 12px, got ${gap}`)

      // 3. Validate CODE - Title
      api.assert.ok(code.includes('col white'), 'Code should have col white')
      api.assert.ok(code.includes('fs 18'), 'Code should have fs 18')
      api.assert.ok(code.includes('weight bold'), 'Code should have weight bold')

      // 4. Validate PREVIEW - Title
      const titleColor = getComputedStyleValue('node-2', 'color')
      api.assert.ok(titleColor.includes('255'), `Title color should be white, got ${titleColor}`)

      const titleFontSize = getComputedStyleValue('node-2', 'fontSize')
      api.assert.ok(titleFontSize === '18px', `Title fontSize should be 18px, got ${titleFontSize}`)

      const titleWeight = getComputedStyleValue('node-2', 'fontWeight')
      api.assert.ok(titleWeight === '700', `Title fontWeight should be 700, got ${titleWeight}`)
    }
  ),

  testWithSetup(
    'Button with all styling',
    'Button "Submit", bg #2271C1, col white, pad 12 24, rad 6, fs 16, weight 500, cursor pointer',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // 1. Validate all CODE properties
      const code = api.editor.getCode()
      api.assert.ok(code.toLowerCase().includes('bg #2271c1'), 'Code should have bg #2271C1')
      api.assert.ok(code.includes('col white'), 'Code should have col white')
      api.assert.ok(code.includes('pad 12 24'), 'Code should have pad 12 24')
      api.assert.ok(code.includes('rad 6'), 'Code should have rad 6')
      api.assert.ok(code.includes('fs 16'), 'Code should have fs 16')
      api.assert.ok(code.includes('weight 500'), 'Code should have weight 500')
      api.assert.ok(code.includes('cursor pointer'), 'Code should have cursor pointer')

      // 2. Validate all PREVIEW properties
      const bg = getComputedStyleValue('node-1', 'backgroundColor')
      api.assert.ok(bg.includes('34'), `Button bg should contain 34, got ${bg}`)

      const color = getComputedStyleValue('node-1', 'color')
      api.assert.ok(color.includes('255'), `Button color should be white, got ${color}`)

      const paddingTop = getComputedStyleValue('node-1', 'paddingTop')
      api.assert.ok(paddingTop === '12px', `Button paddingTop should be 12px, got ${paddingTop}`)

      const paddingLeft = getComputedStyleValue('node-1', 'paddingLeft')
      api.assert.ok(paddingLeft === '24px', `Button paddingLeft should be 24px, got ${paddingLeft}`)

      const radius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(radius === '6px', `Button radius should be 6px, got ${radius}`)

      const fontSize = getComputedStyleValue('node-1', 'fontSize')
      api.assert.ok(fontSize === '16px', `Button fontSize should be 16px, got ${fontSize}`)

      const fontWeight = getComputedStyleValue('node-1', 'fontWeight')
      api.assert.ok(fontWeight === '500', `Button fontWeight should be 500, got ${fontWeight}`)

      const cursor = getComputedStyleValue('node-1', 'cursor')
      api.assert.ok(cursor === 'pointer', `Button cursor should be pointer, got ${cursor}`)
    }
  ),
])

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const allCodePreviewValidationTests: TestCase[] = [
  ...sizingCodePreviewTests,
  ...spacingCodePreviewTests,
  ...colorCodePreviewTests,
  ...borderCodePreviewTests,
  ...layoutCodePreviewTests,
  ...typographyCodePreviewTests,
  ...effectsCodePreviewTests,
  ...transformCodePreviewTests,
  ...iconCodePreviewTests,
  ...complexCodePreviewTests,
]
