/**
 * Border and Radius Properties E2E Tests
 *
 * Tests the full compilation pipeline for border properties:
 * - border / bor (width, style, color)
 * - border directions (t, b, l, r)
 * - radius / rad
 * - radius corners (tl, tr, bl, br)
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
// BASIC BORDER
// ============================================

describe('E2E: Border - Basic', () => {
  it('border with width only', () => {
    const input = `
Card as frame:
  bor 1

Card
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain('1px')
  })

  it('border with width and color', () => {
    const input = `
Card as frame:
  bor 1 #333

Card
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain('#333')
  })

  it('border with width, style, and color', () => {
    const input = `
Card as frame:
  bor 2 dashed #3B82F6

Card
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain('dashed')
    expect(output).toContain('#3B82F6')
  })

  it('border full form', () => {
    const input = `
Panel as frame:
  border 1 solid #666

Panel
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain('solid')
  })
})

// ============================================
// DIRECTIONAL BORDERS
// ============================================

describe('E2E: Border - Directional', () => {
  it('border top', () => {
    const input = `
Card as frame:
  bor t 1 #333

Card
`
    const output = compile(input)
    expect(output).toContain("'border-top':")
    expect(output).toContain('#333')
  })

  it('border bottom', () => {
    const input = `
Divider as frame:
  bor b 1 #333

Divider
`
    const output = compile(input)
    expect(output).toContain("'border-bottom':")
  })

  it('border left', () => {
    const input = `
Sidebar as frame:
  bor l 1 #333

Sidebar
`
    const output = compile(input)
    expect(output).toContain("'border-left':")
  })

  it('border right', () => {
    const input = `
Panel as frame:
  bor r 1 #333

Panel
`
    const output = compile(input)
    expect(output).toContain("'border-right':")
  })

  it('border left right same value', () => {
    const input = `
Card as frame:
  bor left right 1 #333

Card
`
    const output = compile(input)
    expect(output).toContain("'border-left':")
    expect(output).toContain("'border-right':")
    expect(output).toContain('#333')
  })

  it('border x shortcut (left + right)', () => {
    const input = `
Divider as frame:
  bor x 1 #666

Divider
`
    const output = compile(input)
    expect(output).toContain("'border-left':")
    expect(output).toContain("'border-right':")
  })

  it('border y shortcut (top + bottom)', () => {
    const input = `
Row as frame:
  bor y 1 #333

Row
`
    const output = compile(input)
    expect(output).toContain("'border-top':")
    expect(output).toContain("'border-bottom':")
  })

  it('border top down (down = bottom alias)', () => {
    const input = `
Cell as frame:
  bor top down 2 dashed #3B82F6

Cell
`
    const output = compile(input)
    expect(output).toContain("'border-top':")
    expect(output).toContain("'border-bottom':")
    expect(output).toContain('dashed')
  })
})

// ============================================
// BORDER STYLES
// ============================================

describe('E2E: Border - Styles', () => {
  it('solid border', () => {
    const input = `
Card as frame:
  bor 1 solid #333

Card
`
    const output = compile(input)
    expect(output).toContain('solid')
  })

  it('dashed border', () => {
    const input = `
DropZone as frame:
  bor 2 dashed #3B82F6

DropZone
`
    const output = compile(input)
    expect(output).toContain('dashed')
  })

  it('dotted border', () => {
    const input = `
Hint as frame:
  bor 1 dotted #888

Hint
`
    const output = compile(input)
    expect(output).toContain('dotted')
  })
})

// ============================================
// BASIC RADIUS
// ============================================

describe('E2E: Radius - Basic', () => {
  it('single radius value', () => {
    const input = `
Card as frame:
  rad 8

Card
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '8px'")
  })

  it('radius shorthand', () => {
    const input = `
Button as button:
  radius 6

Button
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '6px'")
  })

  it('circular radius', () => {
    const input = `
Avatar as frame:
  rad 50%

Avatar
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '50%'")
  })

  it('pill radius', () => {
    const input = `
Tag as frame:
  rad 999

Tag
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '999px'")
  })
})

// ============================================
// CORNER-SPECIFIC RADIUS
// ============================================

describe('E2E: Radius - Corners', () => {
  it('four corner values', () => {
    const input = `
Card as frame:
  rad 8 8 0 0

Card
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '8px 8px 0px 0px'")
  })
})

describe('E2E: Radius - Individual Corners', () => {
  it('top-left corner', () => {
    const input = `
Tab as frame:
  rad tl 8

Tab
`
    const output = compile(input)
    expect(output).toContain("'border-top-left-radius': '8px'")
  })

  it('top-right corner', () => {
    const input = `
Tab as frame:
  rad tr 8

Tab
`
    const output = compile(input)
    expect(output).toContain("'border-top-right-radius': '8px'")
  })

  it('bottom-left corner', () => {
    const input = `
Card as frame:
  rad bl 8

Card
`
    const output = compile(input)
    expect(output).toContain("'border-bottom-left-radius': '8px'")
  })

  it('bottom-right corner', () => {
    const input = `
Card as frame:
  rad br 8

Card
`
    const output = compile(input)
    expect(output).toContain("'border-bottom-right-radius': '8px'")
  })

  it('top corners shorthand', () => {
    const input = `
Header as frame:
  rad t 8

Header
`
    const output = compile(input)
    expect(output).toContain("'border-top-left-radius': '8px'")
    expect(output).toContain("'border-top-right-radius': '8px'")
  })

  it('bottom corners shorthand', () => {
    const input = `
Footer as frame:
  rad b 8

Footer
`
    const output = compile(input)
    expect(output).toContain("'border-bottom-left-radius': '8px'")
    expect(output).toContain("'border-bottom-right-radius': '8px'")
  })

  it('left corners shorthand', () => {
    const input = `
Panel as frame:
  rad l 8

Panel
`
    const output = compile(input)
    expect(output).toContain("'border-top-left-radius': '8px'")
    expect(output).toContain("'border-bottom-left-radius': '8px'")
  })

  it('right corners shorthand', () => {
    const input = `
Panel as frame:
  rad r 8

Panel
`
    const output = compile(input)
    expect(output).toContain("'border-top-right-radius': '8px'")
    expect(output).toContain("'border-bottom-right-radius': '8px'")
  })
})

// ============================================
// BORDER COLOR
// ============================================

describe('E2E: Border Color', () => {
  it('border-color property', () => {
    const input = `
Card as frame:
  bor 1
  boc #3B82F6

Card
`
    const output = compile(input)
    expect(output).toContain("'border-color': '#3B82F6'")
  })

  it('border-color full form', () => {
    const input = `
Input as input:
  border-color #666

Input
`
    const output = compile(input)
    expect(output).toContain("'border-color': '#666'")
  })
})

// ============================================
// COMBINATIONS
// ============================================

describe('E2E: Border and Radius Combinations', () => {
  it('border with radius', () => {
    const input = `
Card as frame:
  bor 1 #333
  rad 8

Card
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain("'border-radius': '8px'")
  })

  it('border with top-only radius', () => {
    const input = `
Header as frame:
  bor 1 #333
  rad 8 8 0 0

Header
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain("'border-radius': '8px 8px 0px 0px'")
  })

  it('border with uniform radius', () => {
    const input = `
Cell as frame:
  bor 1 #333
  rad 4

Cell
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain("'border-radius': '4px'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Border/Radius Real World Patterns', () => {
  it('card with shadow and radius', () => {
    const input = `
Card as frame:
  bg #fff
  pad 20
  rad 8
  shadow md

Card
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '8px'")
    expect(output).toContain("'box-shadow':")
  })

  it('outlined button', () => {
    const input = `
OutlineBtn as button:
  bg transparent
  bor 1 #3B82F6
  col #3B82F6
  pad 8 16
  rad 4

OutlineBtn "Click"
`
    const output = compile(input)
    expect(output).toContain("'background': 'transparent'")
    expect(output).toContain("'border':")
    expect(output).toContain('#3B82F6')
    expect(output).toContain("'border-radius': '4px'")
  })

  it('input field with focus border', () => {
    const input = `
Input as input:
  pad 8 12
  bor 1 #333
  rad 4
  focus:
    bor 1 #3B82F6

Input "Email"
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain("'border-radius': '4px'")
    expect(output).toContain(':focus')
  })

  it('avatar with full radius', () => {
    const input = `
Avatar as frame:
  size 48
  rad 24
  clip

Avatar
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '24px'")
    expect(output).toContain("'overflow': 'hidden'")
  })

  it('dropdown menu item with no radius', () => {
    const input = `
MenuItem as frame:
  pad 8 16
  rad 0

MenuItem
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '0px'")
  })

  it('tab with top radius only', () => {
    const input = `
Tab as frame:
  pad 8 16
  rad 6 6 0 0
  bg #333

Tab
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '6px 6px 0px 0px'")
  })

  it('divider line', () => {
    const input = `
Divider as frame:
  height 1
  bg #333

Divider
`
    const output = compile(input)
    expect(output).toContain("'height': '1px'")
    expect(output).toContain("'background': '#333'")
  })

  it('list item with border', () => {
    const input = `
ListItem as frame:
  pad 12 16
  bor 1 #333

ListItem
`
    const output = compile(input)
    expect(output).toContain("'border':")
    expect(output).toContain('#333')
  })

  it('pill tag', () => {
    const input = `
Tag as frame:
  pad 4 12
  bg #3B82F6
  col white
  rad 999

Tag "New"
`
    const output = compile(input)
    expect(output).toContain("'border-radius': '999px'")
    expect(output).toContain("'background': '#3B82F6'")
  })
})
