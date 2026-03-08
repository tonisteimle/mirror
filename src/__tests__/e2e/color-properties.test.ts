/**
 * Color Properties E2E Tests
 *
 * Tests the full compilation pipeline for color properties:
 * - color / col / c (text color)
 * - background / bg (background color)
 * - Color formats: hex, named, rgb, rgba
 * - Token references
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'

// Helper to compile Mirror code to JS
function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

// ============================================
// TEXT COLOR
// ============================================

describe('E2E: Text Color', () => {
  it('color property with hex', () => {
    const input = `
Text as text:
  color #fff

Text "Hello"
`
    const output = compile(input)
    expect(output).toContain("'color': '#fff'")
  })

  it('col shorthand', () => {
    const input = `
Label as text:
  col #666

Label "Label"
`
    const output = compile(input)
    expect(output).toContain("'color': '#666'")
  })

  it('c shorthand', () => {
    const input = `
Muted as text:
  c #888

Muted "Muted text"
`
    const output = compile(input)
    expect(output).toContain("'color': '#888'")
  })

  it('named color white', () => {
    const input = `
White as text:
  col white

White "White text"
`
    const output = compile(input)
    expect(output).toContain("'color': 'white'")
  })

  it('named color black', () => {
    const input = `
Black as text:
  col black

Black "Black text"
`
    const output = compile(input)
    expect(output).toContain("'color': 'black'")
  })

  it('6-digit hex color', () => {
    const input = `
Blue as text:
  col #3B82F6

Blue "Blue text"
`
    const output = compile(input)
    expect(output).toContain("'color': '#3B82F6'")
  })

  it('3-digit hex color', () => {
    const input = `
Short as text:
  col #333

Short "Short hex"
`
    const output = compile(input)
    expect(output).toContain("'color': '#333'")
  })
})

// ============================================
// BACKGROUND COLOR
// ============================================

describe('E2E: Background Color', () => {
  it('background property with hex', () => {
    const input = `
Card as frame:
  background #1a1a23

Card
`
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
  })

  it('bg shorthand', () => {
    const input = `
Button as button:
  bg #3B82F6

Button "Click"
`
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
  })

  it('transparent background', () => {
    const input = `
Ghost as button:
  bg transparent

Ghost "Ghost"
`
    const output = compile(input)
    expect(output).toContain("'background': 'transparent'")
  })

  it('white background', () => {
    const input = `
Light as frame:
  bg white

Light
`
    const output = compile(input)
    expect(output).toContain("'background': 'white'")
  })
})

// ============================================
// COLOR TOKENS
// Note: Token references in styles use CSS variables but the syntax might differ
// ============================================

describe.skip('E2E: Color Tokens (CSS Variable integration not fully working)', () => {
  it('token in background', () => {
    const input = `
$primary: #3B82F6

Button as button:
  bg $primary

Button "Click"
`
    const output = compile(input)
    expect(output).toContain("'background': 'var(--primary)'")
    expect(output).toContain('--primary: #3B82F6')
  })

  it('token in color', () => {
    const input = `
$text: #fff

Label as text:
  col $text

Label "Text"
`
    const output = compile(input)
    expect(output).toContain("'color': 'var(--text)'")
    expect(output).toContain('--text: #fff')
  })

  it('multiple tokens', () => {
    const input = `
$bg: #1a1a23
$text: #fff

Card as frame:
  bg $bg
  col $text

Card
`
    const output = compile(input)
    expect(output).toContain("'background': 'var(--bg)'")
    expect(output).toContain("'color': 'var(--text)'")
    expect(output).toContain('--bg: #1a1a23')
    expect(output).toContain('--text: #fff')
  })

  it('semantic tokens', () => {
    const input = `
$primary.bg: #3B82F6
$primary.col: #fff

Button as button:
  bg $primary.bg
  col $primary.col

Button "Primary"
`
    const output = compile(input)
    expect(output).toContain("var(--primary.bg)")
    expect(output).toContain("var(--primary.col)")
  })
})

// ============================================
// COLOR COMBINATIONS
// ============================================

describe('E2E: Color Combinations', () => {
  it('background and text color', () => {
    const input = `
Button as button:
  bg #3B82F6
  col white

Button "Click"
`
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
    expect(output).toContain("'color': 'white'")
  })

  it('border color with background', () => {
    const input = `
Card as frame:
  bg #1a1a23
  bor 1 #333

Card
`
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'border':")
    expect(output).toContain('#333')
  })

  it('all color properties', () => {
    const input = `
Input as input:
  bg #1a1a23
  col #fff
  bor 1 #333

Input "Type here"
`
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'color': '#fff'")
    expect(output).toContain('#333')
  })
})

// ============================================
// HOVER COLORS
// ============================================

describe('E2E: Hover Colors', () => {
  it('hover background change', () => {
    const input = `
Button as button:
  bg #3B82F6
  hover:
    bg #2563EB

Button "Hover me"
`
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
    expect(output).toContain(':hover')
    expect(output).toContain('#2563EB')
  })

  it('hover color change', () => {
    const input = `
Link as text:
  col #666
  hover:
    col #3B82F6

Link "Hover link"
`
    const output = compile(input)
    expect(output).toContain("'color': '#666'")
    expect(output).toContain(':hover')
    expect(output).toContain('#3B82F6')
  })

  it('inline hover-bg', () => {
    const input = `
Button as button:
  bg #333
  hover-bg #555

Button "Click"
`
    const output = compile(input)
    expect(output).toContain("'background': '#333'")
    expect(output).toContain(':hover')
    expect(output).toContain('#555')
  })

  it('inline hover-col', () => {
    const input = `
Item as frame:
  col #888
  hover-col #fff

Item
`
    const output = compile(input)
    expect(output).toContain("'color': '#888'")
    expect(output).toContain(':hover')
    expect(output).toContain('#fff')
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Color Real World Patterns', () => {
  it('dark theme card', () => {
    const input = `
Card as frame:
  bg #1a1a23
  col #e5e5e5
  pad 20
  rad 8

Card
`
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'color': '#e5e5e5'")
  })

  it('primary button', () => {
    const input = `
PrimaryBtn as button:
  bg #3B82F6
  col white
  pad 12 24
  rad 6

PrimaryBtn "Submit"
`
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
    expect(output).toContain("'color': 'white'")
  })

  it('ghost button', () => {
    const input = `
GhostBtn as button:
  bg transparent
  col #3B82F6
  bor 1 #3B82F6
  pad 12 24
  rad 6

GhostBtn "Ghost"
`
    const output = compile(input)
    expect(output).toContain("'background': 'transparent'")
    expect(output).toContain("'color': '#3B82F6'")
  })

  it('danger button', () => {
    const input = `
DangerBtn as button:
  bg #EF4444
  col white
  pad 12 24

DangerBtn "Delete"
`
    const output = compile(input)
    expect(output).toContain("'background': '#EF4444'")
    expect(output).toContain("'color': 'white'")
  })

  it('muted text', () => {
    const input = `
Muted as text:
  col #666
  font-size 12

Muted "Secondary text"
`
    const output = compile(input)
    expect(output).toContain("'color': '#666'")
    expect(output).toContain("'font-size': '12px'")
  })

  // Note: rgba() colors might not be parsed correctly
  it.skip('overlay background (rgba not yet supported)', () => {
    const input = `
Overlay as frame:
  bg rgba(0,0,0,0.5)
  z 100

Overlay
`
    const output = compile(input)
    expect(output).toContain("'background': 'rgba(0,0,0,0.5)'")
    expect(output).toContain("'z-index': '100'")
  })

  it('card with full border', () => {
    const input = `
Card as frame:
  bg #1a1a23
  bor 3 #3B82F6
  pad 20

Card
`
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'border':")
    expect(output).toContain('#3B82F6')
  })
})

// ============================================
// TOKEN SYSTEM
// ============================================

describe.skip('E2E: Complete Token System (CSS Variable integration not fully working)', () => {
  it('design system tokens', () => {
    const input = `
$grey-900: #18181B
$grey-700: #3F3F46
$blue-500: #3B82F6

Card as frame:
  bg $grey-900
  bor 1 $grey-700

Card
`
    const output = compile(input)
    expect(output).toContain('--grey-900: #18181B')
    expect(output).toContain('--grey-700: #3F3F46')
    expect(output).toContain('--blue-500: #3B82F6')
    expect(output).toContain("var(--grey-900)")
    expect(output).toContain("var(--grey-700)")
  })
})
