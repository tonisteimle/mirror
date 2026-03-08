/**
 * Typography Properties E2E Tests
 *
 * Tests the full compilation pipeline for typography properties:
 * - font-size / fs
 * - weight
 * - line (line-height)
 * - font (font-family)
 * - align (text-align)
 * - italic
 * - underline
 * - truncate
 * - uppercase / lowercase
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
// FONT SIZE
// ============================================

describe('E2E: Font Size', () => {
  it('generates font-size style', () => {
    const input = `
Text as text:
  font-size 16

Text "Hello"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '16px'")
  })

  it('generates font-size with fs shorthand', () => {
    const input = `
Label as text:
  fs 12

Label "Small"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '12px'")
  })

  it('large font size', () => {
    const input = `
Heading as text:
  font-size 32

Heading "Title"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '32px'")
  })
})

// ============================================
// FONT WEIGHT
// ============================================

describe('E2E: Font Weight', () => {
  it('generates numeric font weight', () => {
    const input = `
Bold as text:
  weight 700

Bold "Bold text"
`
    const output = compile(input)
    expect(output).toContain("'font-weight': '700'")
  })

  it('generates weight 600', () => {
    const input = `
SemiBold as text:
  weight 600

SemiBold "Semi Bold"
`
    const output = compile(input)
    expect(output).toContain("'font-weight': '600'")
  })

  it('generates weight 400 (normal)', () => {
    const input = `
Normal as text:
  weight 400

Normal "Normal weight"
`
    const output = compile(input)
    expect(output).toContain("'font-weight': '400'")
  })

  it('generates bold keyword', () => {
    const input = `
Bold as text:
  weight bold

Bold "Bold"
`
    const output = compile(input)
    expect(output).toContain("'font-weight': 'bold'")
  })
})

// ============================================
// LINE HEIGHT
// ============================================

describe('E2E: Line Height', () => {
  it('generates line-height style', () => {
    const input = `
Paragraph as text:
  line 1.5

Paragraph "Multi-line text"
`
    const output = compile(input)
    expect(output).toContain("'line-height': '1.5'")
  })

  it('generates tight line height', () => {
    const input = `
Compact as text:
  line 1.2

Compact "Tight spacing"
`
    const output = compile(input)
    expect(output).toContain("'line-height': '1.2'")
  })

  it('generates loose line height', () => {
    const input = `
Spacious as text:
  line 2

Spacious "Loose spacing"
`
    const output = compile(input)
    expect(output).toContain("'line-height': '2'")
  })
})

// ============================================
// FONT FAMILY
// ============================================

describe('E2E: Font Family', () => {
  it('generates font-family style', () => {
    const input = `
Mono as text:
  font monospace

Mono "Code"
`
    const output = compile(input)
    expect(output).toContain("'font-family': 'monospace'")
  })

  it('generates custom font', () => {
    const input = `
Custom as text:
  font "Inter"

Custom "Custom font"
`
    const output = compile(input)
    expect(output).toContain("'font-family':")
    expect(output).toContain('Inter')
  })
})

// ============================================
// TEXT ALIGN
// ============================================

describe('E2E: Text Align', () => {
  it('generates text-align center', () => {
    const input = `
Centered as text:
  text-align center

Centered "Centered text"
`
    const output = compile(input)
    expect(output).toContain("'text-align': 'center'")
  })

  it('generates text-align right', () => {
    const input = `
Right as text:
  text-align right

Right "Right aligned"
`
    const output = compile(input)
    expect(output).toContain("'text-align': 'right'")
  })

  it('generates text-align left', () => {
    const input = `
Left as text:
  text-align left

Left "Left aligned"
`
    const output = compile(input)
    expect(output).toContain("'text-align': 'left'")
  })
})

// ============================================
// ITALIC
// ============================================

describe('E2E: Italic', () => {
  it('generates italic style', () => {
    const input = `
Italic as text:
  italic

Italic "Italic text"
`
    const output = compile(input)
    expect(output).toContain("'font-style': 'italic'")
  })
})

// ============================================
// UNDERLINE
// ============================================

describe('E2E: Underline', () => {
  it('generates underline style', () => {
    const input = `
Underlined as text:
  underline

Underlined "Underlined text"
`
    const output = compile(input)
    expect(output).toContain("'text-decoration': 'underline'")
  })
})

// ============================================
// TRUNCATE
// ============================================

describe('E2E: Truncate', () => {
  it('generates truncate styles', () => {
    const input = `
Truncated as text:
  truncate

Truncated "Very long text that should be truncated"
`
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'text-overflow': 'ellipsis'")
    expect(output).toContain("'white-space': 'nowrap'")
  })
})

// ============================================
// TEXT TRANSFORM
// ============================================

describe('E2E: Uppercase', () => {
  it('generates uppercase transform', () => {
    const input = `
Upper as text:
  uppercase

Upper "uppercase text"
`
    const output = compile(input)
    expect(output).toContain("'text-transform': 'uppercase'")
  })
})

describe('E2E: Lowercase', () => {
  it('generates lowercase transform', () => {
    const input = `
Lower as text:
  lowercase

Lower "LOWERCASE TEXT"
`
    const output = compile(input)
    expect(output).toContain("'text-transform': 'lowercase'")
  })
})

// ============================================
// COMBINATIONS
// ============================================

describe('E2E: Typography Combinations', () => {
  it('heading styles', () => {
    const input = `
Heading as text:
  font-size 24
  weight 700
  line 1.2

Heading "Page Title"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '24px'")
    expect(output).toContain("'font-weight': '700'")
    expect(output).toContain("'line-height': '1.2'")
  })

  it('paragraph styles', () => {
    const input = `
Paragraph as text:
  font-size 16
  line 1.6
  col #666

Paragraph "Body text"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '16px'")
    expect(output).toContain("'line-height': '1.6'")
    expect(output).toContain("'color': '#666'")
  })

  it('label styles', () => {
    const input = `
Label as text:
  font-size 11
  uppercase
  weight 600

Label "LABEL"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '11px'")
    expect(output).toContain("'text-transform': 'uppercase'")
    expect(output).toContain("'font-weight': '600'")
  })

  it('link styles', () => {
    const input = `
Link as text:
  col #3B82F6
  underline

Link "Click here"
`
    const output = compile(input)
    expect(output).toContain("'color': '#3B82F6'")
    expect(output).toContain("'text-decoration': 'underline'")
  })

  it('code styles', () => {
    const input = `
Code as text:
  font monospace
  font-size 13
  bg #282c34
  pad 2 6
  rad 3

Code "const x = 1"
`
    const output = compile(input)
    expect(output).toContain("'font-family': 'monospace'")
    expect(output).toContain("'font-size': '13px'")
    expect(output).toContain("'background': '#282c34'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Typography Real World Patterns', () => {
  it('card title and description', () => {
    const input = `
Title as text:
  font-size 18
  weight 600

Description as text:
  font-size 14
  col #666
  line 1.5

Card as frame:
  pad 16
  gap 8

Card
  Title "Card Title"
  Description "This is a description"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '18px'")
    expect(output).toContain("'font-weight': '600'")
    expect(output).toContain("'font-size': '14px'")
    expect(output).toContain("'color': '#666'")
  })

  it('button with text', () => {
    const input = `
Button as button:
  font-size 14
  weight 600
  uppercase
  pad 12 24

Button "SUBMIT"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '14px'")
    expect(output).toContain("'font-weight': '600'")
    expect(output).toContain("'text-transform': 'uppercase'")
    expect(output).toContain('textContent = "SUBMIT"')
  })

  it('truncated list item', () => {
    const input = `
ListItem as frame:
  pad 8 12

ItemText as text:
  truncate

ListItem
  ItemText "Very long text that will be truncated with ellipsis"
`
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'text-overflow': 'ellipsis'")
    expect(output).toContain("'white-space': 'nowrap'")
  })

  it('navigation item', () => {
    const input = `
NavItem as text:
  font-size 14
  weight 500
  cursor pointer

NavItem "Home"
`
    const output = compile(input)
    expect(output).toContain("'font-size': '14px'")
    expect(output).toContain("'font-weight': '500'")
    expect(output).toContain("'cursor': 'pointer'")
  })
})
