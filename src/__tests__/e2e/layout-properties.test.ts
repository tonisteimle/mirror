/**
 * Layout Properties E2E Tests
 *
 * Tests the full compilation pipeline for layout properties:
 * - horizontal / hor
 * - vertical / ver
 * - center / cen
 * - gap
 * - spread
 * - wrap
 * - stacked
 * - Alignment: left, right, top, bottom, hor-center, ver-center
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
// DIRECTION
// ============================================

describe('E2E: Layout Direction', () => {
  it('vertical (column) is default for frame', () => {
    const input = `
Container as frame:

Container
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'column'")
  })

  it('horizontal generates row direction', () => {
    const input = `
Row as frame:
  horizontal

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
  })

  it('hor shorthand generates row direction', () => {
    const input = `
Row as frame:
  hor

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
  })

  it('vertical explicit', () => {
    const input = `
Col as frame:
  vertical

Col
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'column'")
  })

  it('ver shorthand', () => {
    const input = `
Col as frame:
  ver

Col
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'column'")
  })
})

// ============================================
// CENTER ALIGNMENT
// ============================================

describe('E2E: Center Alignment', () => {
  it('center aligns both axes', () => {
    const input = `
Centered as frame:
  center

Centered
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })

  it('cen shorthand', () => {
    const input = `
Centered as frame:
  cen

Centered
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })
})

// ============================================
// GAP
// ============================================

describe('E2E: Gap', () => {
  it('generates gap style', () => {
    const input = `
List as frame:
  gap 16

List
`
    const output = compile(input)
    expect(output).toContain("'gap': '16px'")
  })

  it('g shorthand', () => {
    const input = `
List as frame:
  g 8

List
`
    const output = compile(input)
    expect(output).toContain("'gap': '8px'")
  })

  it('gap with direction', () => {
    const input = `
Row as frame:
  horizontal
  gap 12

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'gap': '12px'")
  })
})

// ============================================
// SPREAD
// ============================================

describe('E2E: Spread', () => {
  it('generates space-between', () => {
    const input = `
Nav as frame:
  spread

Nav
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'space-between'")
  })

  it('spread with horizontal', () => {
    const input = `
Header as frame:
  horizontal
  spread

Header
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'justify-content': 'space-between'")
  })
})

// ============================================
// WRAP
// ============================================

describe('E2E: Wrap', () => {
  it('generates flex-wrap', () => {
    const input = `
Grid as frame:
  wrap

Grid
`
    const output = compile(input)
    expect(output).toContain("'flex-wrap': 'wrap'")
  })

  it('wrap with horizontal and gap', () => {
    const input = `
Tags as frame:
  horizontal
  wrap
  gap 8

Tags
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'flex-wrap': 'wrap'")
    expect(output).toContain("'gap': '8px'")
  })
})

// ============================================
// STACKED
// ============================================

describe('E2E: Stacked', () => {
  it('generates position relative for stacked container', () => {
    const input = `
Stack as frame:
  stacked

Stack
`
    const output = compile(input)
    expect(output).toContain("'position': 'relative'")
  })
})

// ============================================
// ALIGNMENT PROPERTIES
// ============================================

describe('E2E: Horizontal Alignment', () => {
  it('left alignment', () => {
    const input = `
Container as frame:
  left

Container
`
    const output = compile(input)
    expect(output).toContain("'align-items': 'flex-start'")
  })

  it('right alignment', () => {
    const input = `
Container as frame:
  right

Container
`
    const output = compile(input)
    expect(output).toContain("'align-items': 'flex-end'")
  })

  it('hor-center alignment', () => {
    const input = `
Container as frame:
  hor-center

Container
`
    const output = compile(input)
    expect(output).toContain("'align-items': 'center'")
  })
})

describe('E2E: Vertical Alignment', () => {
  it('top alignment', () => {
    const input = `
Container as frame:
  top

Container
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'flex-start'")
  })

  it('bottom alignment', () => {
    const input = `
Container as frame:
  bottom

Container
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'flex-end'")
  })

  it('ver-center alignment', () => {
    const input = `
Container as frame:
  ver-center

Container
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'center'")
  })
})

describe('E2E: Alignment in Horizontal Layout', () => {
  it('left in horizontal is justify-start', () => {
    const input = `
Row as frame:
  horizontal
  left

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    // In row direction, left affects justify-content
    expect(output).toContain("'justify-content': 'flex-start'")
  })

  it('right in horizontal is justify-end', () => {
    const input = `
Row as frame:
  horizontal
  right

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'justify-content': 'flex-end'")
  })

  it('top in horizontal affects align-items', () => {
    const input = `
Row as frame:
  horizontal
  top

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'align-items': 'flex-start'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Layout Real World Patterns', () => {
  it('header with spread navigation', () => {
    const input = `
Logo as text:

NavLinks as frame:
  horizontal
  gap 16

Header as frame:
  horizontal
  spread
  pad 16

Header
  Logo "Site"
  NavLinks
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'space-between'")
    expect(output).toContain("'padding': '16px'")
  })

  it('centered modal', () => {
    const input = `
Modal as frame:
  center
  width 400
  height 300
  bg #fff
  rad 8

Modal
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
    expect(output).toContain("'width': '400px'")
    expect(output).toContain("'height': '300px'")
  })

  it('card list with gap', () => {
    const input = `
Card as frame:
  pad 16
  bg #333
  rad 8

CardList as frame:
  gap 16

CardList
  Card
  Card
  Card
`
    const output = compile(input)
    expect(output).toContain("'gap': '16px'")
  })

  it('tag cloud with wrap', () => {
    const input = `
Tag as frame:
  pad 4 12
  bg #3B82F6
  rad 16

Tags as frame:
  horizontal
  wrap
  gap 8

Tags
  Tag
  Tag
  Tag
`
    const output = compile(input)
    expect(output).toContain("'flex-wrap': 'wrap'")
    expect(output).toContain("'gap': '8px'")
  })

  it('sidebar layout', () => {
    const input = `
Sidebar as frame:
  width 250
  bg #1a1a23
  pad 16
  gap 8

Content as frame:
  width full
  pad 20

Layout as frame:
  horizontal

Layout
  Sidebar
  Content
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'width': '250px'")
  })

  it('footer with centered content', () => {
    const input = `
Footer as frame:
  center
  pad 24
  bg #1a1a23

Footer
`
    const output = compile(input)
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
    expect(output).toContain("'padding': '24px'")
  })
})

// ============================================
// LAYOUT COMBINATIONS
// ============================================

describe('E2E: Layout Property Combinations', () => {
  it('horizontal center spread', () => {
    const input = `
Container as frame:
  horizontal
  center

Container
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })

  it('vertical with alignment overrides', () => {
    const input = `
Container as frame:
  vertical
  right
  bottom

Container
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'column'")
    expect(output).toContain("'align-items': 'flex-end'")
    expect(output).toContain("'justify-content': 'flex-end'")
  })

  it('full layout stack', () => {
    const input = `
Container as frame:
  horizontal
  wrap
  gap 16
  spread
  pad 20

Container
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'flex-wrap': 'wrap'")
    expect(output).toContain("'gap': '16px'")
    expect(output).toContain("'justify-content': 'space-between'")
    expect(output).toContain("'padding': '20px'")
  })
})
