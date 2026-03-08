/**
 * Mirror Compiler E2E Tests - Formatting & Styling
 *
 * Tests all formatting properties and their CSS output.
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'

function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

// ============================================
// PADDING
// ============================================
describe('Formatting: Padding', () => {
  it('pad with single value', () => {
    const output = compile(`Box as frame:\n  pad 16\nBox`)
    expect(output).toContain("'padding': '16px'")
  })

  it('pad with two values (vertical horizontal)', () => {
    const output = compile(`Box as frame:\n  pad 8 16\nBox`)
    expect(output).toContain("'padding': '8px 16px'")
  })

  it('pad with four values', () => {
    const output = compile(`Box as frame:\n  pad 8 16 12 20\nBox`)
    expect(output).toContain("'padding': '8px 16px 12px 20px'")
  })

  it('p shorthand', () => {
    const output = compile(`Box as frame:\n  p 10\nBox`)
    expect(output).toContain("'padding': '10px'")
  })
})

// ============================================
// MARGIN
// ============================================
describe('Formatting: Margin', () => {
  it('margin with single value', () => {
    const output = compile(`Box as frame:\n  margin 16\nBox`)
    expect(output).toContain("'margin': '16px'")
  })

  it('m shorthand', () => {
    const output = compile(`Box as frame:\n  m 8 16\nBox`)
    expect(output).toContain("'margin': '8px 16px'")
  })
})

// ============================================
// COLORS
// ============================================
describe('Formatting: Colors', () => {
  it('background with hex color', () => {
    const output = compile(`Box as frame:\n  bg #FF5500\nBox`)
    expect(output).toContain("'background': '#FF5500'")
  })

  it('bg shorthand', () => {
    const output = compile(`Box as frame:\n  bg #333\nBox`)
    expect(output).toContain("'background': '#333'")
  })

  it('color with hex', () => {
    const output = compile(`Text as text:\n  col #FFFFFF\nText "Hi"`)
    expect(output).toContain("'color': '#FFFFFF'")
  })

  it('col shorthand', () => {
    const output = compile(`Text as text:\n  col white\nText "Hi"`)
    expect(output).toContain("'color': 'white'")
  })

  it('c shorthand', () => {
    const output = compile(`Text as text:\n  c red\nText "Hi"`)
    expect(output).toContain("'color': 'red'")
  })

  it('color with token reference', () => {
    const output = compile(`primary: #3B82F6\nText as text:\n  col primary\nText "Hi"`)
    expect(output).toContain("'color': 'var(--primary)'")
  })
})

// ============================================
// BORDER
// ============================================
describe('Formatting: Border', () => {
  it('border with width only', () => {
    const output = compile(`Box as frame:\n  bor 1\nBox`)
    expect(output).toContain("'border': '1px'")
  })

  it('border with width and color', () => {
    const output = compile(`Box as frame:\n  bor 2 #333\nBox`)
    expect(output).toContain("'border': '2px #333'")
  })

  it('border-color', () => {
    const output = compile(`Box as frame:\n  boc #FF0000\nBox`)
    expect(output).toContain("'border-color': '#FF0000'")
  })
})

// ============================================
// BORDER RADIUS
// ============================================
describe('Formatting: Border Radius', () => {
  it('radius with single value', () => {
    const output = compile(`Box as frame:\n  rad 8\nBox`)
    expect(output).toContain("'border-radius': '8px'")
  })

  it('rad shorthand', () => {
    const output = compile(`Box as frame:\n  rad 12\nBox`)
    expect(output).toContain("'border-radius': '12px'")
  })

  it('radius with multiple values', () => {
    const output = compile(`Box as frame:\n  rad 8 16\nBox`)
    expect(output).toContain("'border-radius': '8px 16px'")
  })
})

// ============================================
// TYPOGRAPHY
// ============================================
describe('Formatting: Typography', () => {
  it('font-size', () => {
    const output = compile(`Text as text:\n  font-size 18\nText "Hi"`)
    expect(output).toContain("'font-size': '18px'")
  })

  it('fs shorthand', () => {
    const output = compile(`Text as text:\n  fs 14\nText "Hi"`)
    expect(output).toContain("'font-size': '14px'")
  })

  it('weight with number', () => {
    const output = compile(`Text as text:\n  weight 600\nText "Hi"`)
    expect(output).toContain("'font-weight': '600'")
  })

  it('weight with keyword', () => {
    const output = compile(`Text as text:\n  weight bold\nText "Hi"`)
    expect(output).toContain("'font-weight': 'bold'")
  })

  it('line-height', () => {
    const output = compile(`Text as text:\n  line 1.5\nText "Hi"`)
    expect(output).toContain("'line-height': '1.5'")
  })

  it('font-family', () => {
    const output = compile(`Text as text:\n  font Arial\nText "Hi"`)
    expect(output).toContain("'font-family': 'Arial'")
  })

  it('text-align', () => {
    const output = compile(`Text as text:\n  text-align center\nText "Hi"`)
    expect(output).toContain("'text-align': 'center'")
  })

  it('italic boolean', () => {
    const output = compile(`Text as text:\n  italic\nText "Hi"`)
    expect(output).toContain("'font-style': 'italic'")
  })

  it('underline boolean', () => {
    const output = compile(`Text as text:\n  underline\nText "Hi"`)
    expect(output).toContain("'text-decoration': 'underline'")
  })

  it('uppercase boolean', () => {
    const output = compile(`Text as text:\n  uppercase\nText "Hi"`)
    expect(output).toContain("'text-transform': 'uppercase'")
  })

  it('lowercase boolean', () => {
    const output = compile(`Text as text:\n  lowercase\nText "Hi"`)
    expect(output).toContain("'text-transform': 'lowercase'")
  })

  it('truncate boolean', () => {
    const output = compile(`Text as text:\n  truncate\nText "Hi"`)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'text-overflow': 'ellipsis'")
    expect(output).toContain("'white-space': 'nowrap'")
  })
})

// ============================================
// LAYOUT - DIRECTION
// ============================================
describe('Formatting: Layout Direction', () => {
  it('horizontal', () => {
    const output = compile(`Box as frame:\n  horizontal\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'row'")
  })

  it('hor shorthand', () => {
    const output = compile(`Box as frame:\n  hor\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'row'")
  })

  it('vertical', () => {
    const output = compile(`Box as frame:\n  vertical\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'column'")
  })

  it('ver shorthand', () => {
    const output = compile(`Box as frame:\n  ver\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'column'")
  })
})

// ============================================
// LAYOUT - ALIGNMENT
// ============================================
describe('Formatting: Layout Alignment', () => {
  it('center', () => {
    const output = compile(`Box as frame:\n  center\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })

  it('cen shorthand', () => {
    const output = compile(`Box as frame:\n  cen\nBox`)
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })

  it('spread', () => {
    const output = compile(`Box as frame:\n  spread\nBox`)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'justify-content': 'space-between'")
  })

  // In column layout (default): left/right → align-items (cross-axis)
  it('left alignment (column)', () => {
    const output = compile(`Box as frame:\n  left\nBox`)
    expect(output).toContain("'align-items': 'flex-start'")
  })

  it('right alignment (column)', () => {
    const output = compile(`Box as frame:\n  right\nBox`)
    expect(output).toContain("'align-items': 'flex-end'")
  })

  // In column layout: top/bottom → justify-content (main-axis)
  it('top alignment (column)', () => {
    const output = compile(`Box as frame:\n  top\nBox`)
    expect(output).toContain("'justify-content': 'flex-start'")
  })

  it('bottom alignment (column)', () => {
    const output = compile(`Box as frame:\n  bottom\nBox`)
    expect(output).toContain("'justify-content': 'flex-end'")
  })

  // In column layout: hor-center → align-items, ver-center → justify-content
  it('hor-center (column)', () => {
    const output = compile(`Box as frame:\n  hor-center\nBox`)
    expect(output).toContain("'align-items': 'center'")
  })

  it('ver-center (column)', () => {
    const output = compile(`Box as frame:\n  ver-center\nBox`)
    expect(output).toContain("'justify-content': 'center'")
  })

  // In row layout: left/right → justify-content, top/bottom → align-items
  it('left alignment (row)', () => {
    const output = compile(`Box as frame:\n  hor, left\nBox`)
    expect(output).toContain("'justify-content': 'flex-start'")
  })

  it('right alignment (row)', () => {
    const output = compile(`Box as frame:\n  hor, right\nBox`)
    expect(output).toContain("'justify-content': 'flex-end'")
  })

  it('top alignment (row)', () => {
    const output = compile(`Box as frame:\n  hor, top\nBox`)
    expect(output).toContain("'align-items': 'flex-start'")
  })

  it('bottom alignment (row)', () => {
    const output = compile(`Box as frame:\n  hor, bottom\nBox`)
    expect(output).toContain("'align-items': 'flex-end'")
  })

  it('wrap', () => {
    const output = compile(`Box as frame:\n  wrap\nBox`)
    expect(output).toContain("'flex-wrap': 'wrap'")
  })
})

// ============================================
// LAYOUT - GAP
// ============================================
describe('Formatting: Gap', () => {
  it('gap with single value', () => {
    const output = compile(`Box as frame:\n  gap 16\nBox`)
    expect(output).toContain("'gap': '16px'")
  })

  it('g shorthand', () => {
    const output = compile(`Box as frame:\n  g 8\nBox`)
    expect(output).toContain("'gap': '8px'")
  })
})

// ============================================
// SIZING
// ============================================
describe('Formatting: Sizing', () => {
  it('width with pixel value', () => {
    const output = compile(`Box as frame:\n  width 200\nBox`)
    expect(output).toContain("'width': '200px'")
  })

  it('w shorthand', () => {
    const output = compile(`Box as frame:\n  w 100\nBox`)
    expect(output).toContain("'width': '100px'")
  })

  it('width full', () => {
    const output = compile(`Box as frame:\n  width full\nBox`)
    expect(output).toContain("'width': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })

  it('width hug', () => {
    const output = compile(`Box as frame:\n  width hug\nBox`)
    expect(output).toContain("'width': 'fit-content'")
  })

  it('height with pixel value', () => {
    const output = compile(`Box as frame:\n  height 300\nBox`)
    expect(output).toContain("'height': '300px'")
  })

  it('h shorthand', () => {
    const output = compile(`Box as frame:\n  h 50\nBox`)
    expect(output).toContain("'height': '50px'")
  })

  it('height full', () => {
    const output = compile(`Box as frame:\n  height full\nBox`)
    expect(output).toContain("'height': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })

  it('height hug', () => {
    const output = compile(`Box as frame:\n  height hug\nBox`)
    expect(output).toContain("'height': 'fit-content'")
  })

  it('min-width', () => {
    const output = compile(`Box as frame:\n  min-width 100\nBox`)
    expect(output).toContain("'min-width': '100px'")
  })

  it('minw shorthand', () => {
    const output = compile(`Box as frame:\n  minw 50\nBox`)
    expect(output).toContain("'min-width': '50px'")
  })

  it('max-width', () => {
    const output = compile(`Box as frame:\n  max-width 500\nBox`)
    expect(output).toContain("'max-width': '500px'")
  })

  it('maxw shorthand', () => {
    const output = compile(`Box as frame:\n  maxw 400\nBox`)
    expect(output).toContain("'max-width': '400px'")
  })

  it('min-height', () => {
    const output = compile(`Box as frame:\n  min-height 200\nBox`)
    expect(output).toContain("'min-height': '200px'")
  })

  it('max-height', () => {
    const output = compile(`Box as frame:\n  max-height 600\nBox`)
    expect(output).toContain("'max-height': '600px'")
  })
})

// ============================================
// VISIBILITY & OPACITY
// ============================================
describe('Formatting: Visibility & Opacity', () => {
  it('hidden boolean', () => {
    const output = compile(`Box as frame:\n  hidden\nBox`)
    expect(output).toContain("'display': 'none'")
  })

  it('visible boolean', () => {
    const output = compile(`Box as frame:\n  visible\nBox`)
    expect(output).toContain("'visibility': 'visible'")
  })

  it('opacity', () => {
    const output = compile(`Box as frame:\n  opacity 0.5\nBox`)
    expect(output).toContain("'opacity': '0.5'")
  })

  it('o shorthand', () => {
    const output = compile(`Box as frame:\n  o 0.8\nBox`)
    expect(output).toContain("'opacity': '0.8'")
  })
})

// ============================================
// SHADOW
// ============================================
describe('Formatting: Shadow', () => {
  it('shadow sm', () => {
    const output = compile(`Box as frame:\n  shadow sm\nBox`)
    expect(output).toContain("'box-shadow': '0 1px 2px rgba(0,0,0,0.05)'")
  })

  it('shadow md', () => {
    const output = compile(`Box as frame:\n  shadow md\nBox`)
    expect(output).toContain("'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'")
  })

  it('shadow lg', () => {
    const output = compile(`Box as frame:\n  shadow lg\nBox`)
    expect(output).toContain("'box-shadow': '0 10px 15px rgba(0,0,0,0.1)'")
  })
})

// ============================================
// CURSOR
// ============================================
describe('Formatting: Cursor', () => {
  it('cursor pointer', () => {
    const output = compile(`Box as frame:\n  cursor pointer\nBox`)
    expect(output).toContain("'cursor': 'pointer'")
  })

  it('cursor not-allowed', () => {
    const output = compile(`Box as frame:\n  cursor not-allowed\nBox`)
    expect(output).toContain("'cursor': 'not-allowed'")
  })
})

// ============================================
// Z-INDEX
// ============================================
describe('Formatting: Z-Index', () => {
  it('z-index', () => {
    const output = compile(`Box as frame:\n  z 100\nBox`)
    expect(output).toContain("'z-index': '100'")
  })
})

// ============================================
// SCROLL & OVERFLOW
// ============================================
describe('Formatting: Scroll & Overflow', () => {
  it('scroll (vertical)', () => {
    const output = compile(`Box as frame:\n  scroll\nBox`)
    expect(output).toContain("'overflow-y': 'auto'")
  })

  it('scroll-hor', () => {
    const output = compile(`Box as frame:\n  scroll-hor\nBox`)
    expect(output).toContain("'overflow-x': 'auto'")
  })

  it('scroll-both', () => {
    const output = compile(`Box as frame:\n  scroll-both\nBox`)
    expect(output).toContain("'overflow': 'auto'")
  })

  it('clip', () => {
    const output = compile(`Box as frame:\n  clip\nBox`)
    expect(output).toContain("'overflow': 'hidden'")
  })
})

// ============================================
// GRID
// ============================================
describe('Formatting: Grid', () => {
  it('grid with column count', () => {
    const output = compile(`Box as frame:\n  grid 3\nBox`)
    expect(output).toContain("'display': 'grid'")
    expect(output).toContain("'grid-template-columns': 'repeat(3, 1fr)'")
  })

  it('grid auto-fill', () => {
    const output = compile(`Box as frame:\n  grid auto 250\nBox`)
    expect(output).toContain("'display': 'grid'")
    expect(output).toContain("'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))'")
  })

  it('grid with percentages', () => {
    const output = compile(`Box as frame:\n  grid 30% 70%\nBox`)
    expect(output).toContain("'display': 'grid'")
    expect(output).toContain("'grid-template-columns': '30% 70%'")
  })
})

// ============================================
// DISABLED STATE
// ============================================
describe('Formatting: Disabled', () => {
  it('disabled boolean', () => {
    const output = compile(`Box as frame:\n  disabled\nBox`)
    expect(output).toContain("'pointer-events': 'none'")
    expect(output).toContain("'opacity': '0.5'")
  })
})

// ============================================
// STACKED (Position)
// ============================================
describe('Formatting: Stacked', () => {
  it('stacked sets position relative', () => {
    const output = compile(`Box as frame:\n  stacked\nBox`)
    expect(output).toContain("'position': 'relative'")
  })
})
