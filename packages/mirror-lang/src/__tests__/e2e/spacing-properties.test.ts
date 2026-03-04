/**
 * Spacing Properties E2E Tests
 *
 * Tests the full compilation pipeline for spacing properties:
 * - padding / pad / p (all directions, directional)
 * - margin / m (all directions, directional)
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
// PADDING - SINGLE VALUE
// ============================================

describe('E2E: Padding - Single Value', () => {
  it('generates uniform padding', () => {
    const input = `
Card as frame:
  pad 16

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '16px'")
  })

  it('padding shorthand p', () => {
    const input = `
Box as frame:
  p 20

Box
`
    const output = compile(input)
    expect(output).toContain("'padding': '20px'")
  })

  it('padding full form', () => {
    const input = `
Container as frame:
  padding 24

Container
`
    const output = compile(input)
    expect(output).toContain("'padding': '24px'")
  })
})

// ============================================
// PADDING - TWO VALUES
// ============================================

describe('E2E: Padding - Two Values (vertical horizontal)', () => {
  it('generates vertical and horizontal padding', () => {
    const input = `
Button as button:
  pad 12 24

Button
`
    const output = compile(input)
    expect(output).toContain("'padding': '12px 24px'")
  })

  it('asymmetric padding', () => {
    const input = `
Card as frame:
  pad 8 16

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '8px 16px'")
  })
})

// ============================================
// PADDING - FOUR VALUES
// ============================================

describe('E2E: Padding - Four Values (top right bottom left)', () => {
  it('generates all four padding values', () => {
    const input = `
Card as frame:
  pad 8 16 12 20

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '8px 16px 12px 20px'")
  })
})

// ============================================
// PADDING - DIRECTIONAL
// ============================================

describe('E2E: Padding - Directional', () => {
  it('padding left', () => {
    const input = `
Item as frame:
  pad left 20

Item
`
    const output = compile(input)
    expect(output).toContain("'padding-left': '20px'")
  })

  it('padding right', () => {
    const input = `
Item as frame:
  pad right 20

Item
`
    const output = compile(input)
    expect(output).toContain("'padding-right': '20px'")
  })

  it('padding top', () => {
    const input = `
Section as frame:
  pad top 40

Section
`
    const output = compile(input)
    expect(output).toContain("'padding-top': '40px'")
  })

  it('padding bottom', () => {
    const input = `
Section as frame:
  pad bottom 40

Section
`
    const output = compile(input)
    expect(output).toContain("'padding-bottom': '40px'")
  })

  it('multiple directional paddings', () => {
    const input = `
Card as frame:
  pad top 8 bottom 24

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-top': '8px'")
    expect(output).toContain("'padding-bottom': '24px'")
  })
})

// ============================================
// MARGIN - SINGLE VALUE
// ============================================

describe('E2E: Margin - Single Value', () => {
  it('generates uniform margin', () => {
    const input = `
Card as frame:
  margin 16

Card
`
    const output = compile(input)
    expect(output).toContain("'margin': '16px'")
  })

  it('margin shorthand m', () => {
    const input = `
Box as frame:
  m 20

Box
`
    const output = compile(input)
    expect(output).toContain("'margin': '20px'")
  })
})

// ============================================
// MARGIN - TWO VALUES
// ============================================

describe('E2E: Margin - Two Values', () => {
  it('generates vertical and horizontal margin', () => {
    const input = `
Card as frame:
  margin 0 auto

Card
`
    const output = compile(input)
    expect(output).toContain("'margin': '0px auto'")
  })
})

// ============================================
// MARGIN - DIRECTIONAL
// ============================================

describe('E2E: Margin - Directional', () => {
  it('margin left', () => {
    const input = `
Icon as frame:
  margin left 8

Icon
`
    const output = compile(input)
    expect(output).toContain("'margin-left': '8px'")
  })

  it('margin right', () => {
    const input = `
Button as button:
  margin right 12

Button
`
    const output = compile(input)
    expect(output).toContain("'margin-right': '12px'")
  })

  it('margin top', () => {
    const input = `
Section as frame:
  margin top 32

Section
`
    const output = compile(input)
    expect(output).toContain("'margin-top': '32px'")
  })

  it('margin bottom', () => {
    const input = `
Paragraph as frame:
  margin bottom 16

Paragraph
`
    const output = compile(input)
    expect(output).toContain("'margin-bottom': '16px'")
  })
})

// ============================================
// COMBINATIONS
// ============================================

describe('E2E: Padding and Margin Combinations', () => {
  it('padding and margin together', () => {
    const input = `
Card as frame:
  pad 20
  margin 16

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '20px'")
    expect(output).toContain("'margin': '16px'")
  })

  it('two-value padding with uniform margin', () => {
    const input = `
Header as frame:
  pad 0 20
  margin 0

Header
`
    const output = compile(input)
    expect(output).toContain("'padding': '0px 20px'")
    expect(output).toContain("'margin': '0px'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Spacing Real World Patterns', () => {
  it('button padding', () => {
    const input = `
Button as button:
  pad 12 24
  bg #3B82F6

Button "Click"
`
    const output = compile(input)
    expect(output).toContain("'padding': '12px 24px'")
  })

  it('card with padding', () => {
    const input = `
Card as frame:
  pad 20
  bg #1a1a23
  rad 8

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '20px'")
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'border-radius': '8px'")
  })

  it('section with asymmetric padding', () => {
    const input = `
Section as frame:
  pad 40 20

Section
`
    const output = compile(input)
    expect(output).toContain("'padding': '40px 20px'")
  })

  it('centered container with auto margin', () => {
    const input = `
Container as frame:
  maxw 1200
  margin 0 auto

Container
`
    const output = compile(input)
    expect(output).toContain("'max-width': '1200px'")
    expect(output).toContain("'margin': '0px auto'")
  })

  it('list item with padding', () => {
    const input = `
ListItem as frame:
  pad 12 16
  bor 1 #333

ListItem
`
    const output = compile(input)
    expect(output).toContain("'padding': '12px 16px'")
    expect(output).toContain("'border':")
  })

  it('modal content padding', () => {
    const input = `
ModalContent as frame:
  pad 24
  gap 16

ModalContent
`
    const output = compile(input)
    expect(output).toContain("'padding': '24px'")
    expect(output).toContain("'gap': '16px'")
  })

  it('header with horizontal padding', () => {
    const input = `
Header as frame:
  horizontal
  spread
  pad 0 20
  height 60

Header
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain("'justify-content': 'space-between'")
    expect(output).toContain("'padding': '0px 20px'")
    expect(output).toContain("'height': '60px'")
  })

  it('spaced paragraph', () => {
    const input = `
Paragraph as text:
  margin 0 0 16 0
  line 1.6

Paragraph "Text content"
`
    const output = compile(input)
    expect(output).toContain("'margin': '0px 0px 16px 0px'")
    expect(output).toContain("'line-height': '1.6'")
  })

  it('row with gap instead of margin', () => {
    const input = `
Icon as frame:

Label as text:

ButtonContent as frame:
  horizontal
  center
  gap 8

ButtonContent
  Icon
  Label "Submit"
`
    const output = compile(input)
    expect(output).toContain("'gap': '8px'")
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('E2E: Spacing Edge Cases', () => {
  it('zero padding', () => {
    const input = `
Reset as frame:
  pad 0

Reset
`
    const output = compile(input)
    expect(output).toContain("'padding': '0px'")
  })

  it('zero margin', () => {
    const input = `
Reset as frame:
  margin 0

Reset
`
    const output = compile(input)
    expect(output).toContain("'margin': '0px'")
  })

  it('small padding', () => {
    const input = `
Compact as frame:
  pad 2

Compact
`
    const output = compile(input)
    expect(output).toContain("'padding': '2px'")
  })

  it('large padding', () => {
    const input = `
Spacious as frame:
  pad 100

Spacious
`
    const output = compile(input)
    expect(output).toContain("'padding': '100px'")
  })
})

// ============================================
// MULTI-DIRECTION SHORTCUTS
// ============================================

describe('E2E: Padding - Multi-Direction', () => {
  it('pad left right same value', () => {
    const input = `
Card as frame:
  pad left right 16

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-left': '16px'")
    expect(output).toContain("'padding-right': '16px'")
  })

  it('pad x shortcut (left + right)', () => {
    const input = `
Card as frame:
  pad x 20

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-left': '20px'")
    expect(output).toContain("'padding-right': '20px'")
  })

  it('pad y shortcut (top + bottom)', () => {
    const input = `
Card as frame:
  pad y 12

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-top': '12px'")
    expect(output).toContain("'padding-bottom': '12px'")
  })

  it('pad top down same value (down = bottom alias)', () => {
    const input = `
Card as frame:
  pad top down 8

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-top': '8px'")
    expect(output).toContain("'padding-bottom': '8px'")
  })

  it('pad three directions same value', () => {
    const input = `
Card as frame:
  pad top left right 10

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-top': '10px'")
    expect(output).toContain("'padding-left': '10px'")
    expect(output).toContain("'padding-right': '10px'")
  })

  it('short direction names (l r t b)', () => {
    const input = `
Card as frame:
  pad l r 8

Card
`
    const output = compile(input)
    expect(output).toContain("'padding-left': '8px'")
    expect(output).toContain("'padding-right': '8px'")
  })
})

describe('E2E: Margin - Multi-Direction', () => {
  it('margin left right same value', () => {
    const input = `
Card as frame:
  margin left right 16

Card
`
    const output = compile(input)
    expect(output).toContain("'margin-left': '16px'")
    expect(output).toContain("'margin-right': '16px'")
  })

  it('margin x shortcut', () => {
    const input = `
Card as frame:
  m x auto

Card
`
    const output = compile(input)
    expect(output).toContain("'margin-left': 'auto'")
    expect(output).toContain("'margin-right': 'auto'")
  })

  it('margin y shortcut', () => {
    const input = `
Card as frame:
  margin y 24

Card
`
    const output = compile(input)
    expect(output).toContain("'margin-top': '24px'")
    expect(output).toContain("'margin-bottom': '24px'")
  })
})
