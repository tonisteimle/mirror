/**
 * Sizing Properties E2E Tests
 *
 * Tests the full compilation pipeline for sizing properties:
 * - width / w (fixed, hug, full)
 * - height / h (fixed, hug, full)
 * - size (combined)
 * - min-width / minw
 * - max-width / maxw
 * - min-height / minh
 * - max-height / maxh
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
// FIXED WIDTH
// ============================================

describe('E2E: Width - Fixed Values', () => {
  it('generates fixed width', () => {
    const input = `
Box as frame:
  width 200

Box
`
    const output = compile(input)
    expect(output).toContain("'width': '200px'")
  })

  it('w shorthand', () => {
    const input = `
Box as frame:
  w 150

Box
`
    const output = compile(input)
    expect(output).toContain("'width': '150px'")
  })

  it('width with large value', () => {
    const input = `
Container as frame:
  width 1200

Container
`
    const output = compile(input)
    expect(output).toContain("'width': '1200px'")
  })
})

describe('E2E: Width - Hug (fit-content)', () => {
  it('width hug generates fit-content', () => {
    const input = `
Button as frame:
  width hug

Button
`
    const output = compile(input)
    expect(output).toContain("'width': 'fit-content'")
  })

  it('w hug shorthand', () => {
    const input = `
Tag as frame:
  w hug

Tag
`
    const output = compile(input)
    expect(output).toContain("'width': 'fit-content'")
  })
})

describe('E2E: Width - Full (100%)', () => {
  it('width full generates 100% and flex-grow', () => {
    const input = `
Container as frame:
  width full

Container
`
    const output = compile(input)
    expect(output).toContain("'width': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })

  it('w full shorthand', () => {
    const input = `
Content as frame:
  w full

Content
`
    const output = compile(input)
    expect(output).toContain("'width': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })
})

// ============================================
// FIXED HEIGHT
// ============================================

describe('E2E: Height - Fixed Values', () => {
  it('generates fixed height', () => {
    const input = `
Box as frame:
  height 100

Box
`
    const output = compile(input)
    expect(output).toContain("'height': '100px'")
  })

  it('h shorthand', () => {
    const input = `
Box as frame:
  h 80

Box
`
    const output = compile(input)
    expect(output).toContain("'height': '80px'")
  })
})

describe('E2E: Height - Hug (fit-content)', () => {
  it('height hug generates fit-content', () => {
    const input = `
Card as frame:
  height hug

Card
`
    const output = compile(input)
    expect(output).toContain("'height': 'fit-content'")
  })
})

describe('E2E: Height - Full (100%)', () => {
  it('height full generates 100% and flex-grow', () => {
    const input = `
Sidebar as frame:
  height full

Sidebar
`
    const output = compile(input)
    expect(output).toContain("'height': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })
})

// ============================================
// SIZE (COMBINED)
// ============================================

describe('E2E: Size - Combined Dimension', () => {
  it('size with two values (width height)', () => {
    const input = `
Box as frame:
  size 100 200

Box
`
    const output = compile(input)
    expect(output).toContain("'width': '100px'")
    expect(output).toContain("'height': '200px'")
  })

  it('size with single value (square)', () => {
    const input = `
Square as frame:
  size 50

Square
`
    const output = compile(input)
    expect(output).toContain("'width': '50px'")
    expect(output).toContain("'height': '50px'")
  })

  it('size hug makes both fit-content', () => {
    const input = `
Flexible as frame:
  size hug

Flexible
`
    const output = compile(input)
    expect(output).toContain("'width': 'fit-content'")
    expect(output).toContain("'height': 'fit-content'")
  })
})

// ============================================
// MIN/MAX DIMENSIONS
// ============================================

describe('E2E: Min Width', () => {
  it('generates min-width', () => {
    const input = `
Container as frame:
  minw 300

Container
`
    const output = compile(input)
    expect(output).toContain("'min-width': '300px'")
  })

  it('min-width full form', () => {
    const input = `
Panel as frame:
  min-width 200

Panel
`
    const output = compile(input)
    expect(output).toContain("'min-width': '200px'")
  })
})

describe('E2E: Max Width', () => {
  it('generates max-width', () => {
    const input = `
Container as frame:
  maxw 800

Container
`
    const output = compile(input)
    expect(output).toContain("'max-width': '800px'")
  })

  it('max-width full form', () => {
    const input = `
Content as frame:
  max-width 1200

Content
`
    const output = compile(input)
    expect(output).toContain("'max-width': '1200px'")
  })
})

describe('E2E: Min Height', () => {
  it('generates min-height', () => {
    const input = `
Card as frame:
  minh 100

Card
`
    const output = compile(input)
    expect(output).toContain("'min-height': '100px'")
  })

  it('min-height full form', () => {
    const input = `
Modal as frame:
  min-height 200

Modal
`
    const output = compile(input)
    expect(output).toContain("'min-height': '200px'")
  })
})

describe('E2E: Max Height', () => {
  it('generates max-height', () => {
    const input = `
Dropdown as frame:
  maxh 300

Dropdown
`
    const output = compile(input)
    expect(output).toContain("'max-height': '300px'")
  })

  it('max-height full form', () => {
    const input = `
ScrollArea as frame:
  max-height 400

ScrollArea
`
    const output = compile(input)
    expect(output).toContain("'max-height': '400px'")
  })
})

// ============================================
// COMBINATIONS
// ============================================

describe('E2E: Sizing Combinations', () => {
  it('width and height together', () => {
    const input = `
Card as frame:
  width 300
  height 200

Card
`
    const output = compile(input)
    expect(output).toContain("'width': '300px'")
    expect(output).toContain("'height': '200px'")
  })

  it('min and max width together', () => {
    const input = `
Responsive as frame:
  minw 300
  maxw 600

Responsive
`
    const output = compile(input)
    expect(output).toContain("'min-width': '300px'")
    expect(output).toContain("'max-width': '600px'")
  })

  it('all sizing constraints', () => {
    const input = `
Container as frame:
  minw 200
  maxw 800
  minh 100
  maxh 600

Container
`
    const output = compile(input)
    expect(output).toContain("'min-width': '200px'")
    expect(output).toContain("'max-width': '800px'")
    expect(output).toContain("'min-height': '100px'")
    expect(output).toContain("'max-height': '600px'")
  })

  it('fixed width with height full', () => {
    const input = `
Sidebar as frame:
  width 250
  height full

Sidebar
`
    const output = compile(input)
    expect(output).toContain("'width': '250px'")
    expect(output).toContain("'height': '100%'")
    expect(output).toContain("'flex-grow': '1'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Sizing Real World Patterns', () => {
  it('avatar circle with size', () => {
    const input = `
Avatar as frame:
  size 48
  rad 24

Avatar
`
    const output = compile(input)
    expect(output).toContain("'width': '48px'")
    expect(output).toContain("'height': '48px'")
    expect(output).toContain("'border-radius': '24px'")
  })

  it('responsive container', () => {
    const input = `
Container as frame:
  width full
  maxw 1200
  pad 0 20

Container
`
    const output = compile(input)
    expect(output).toContain("'width': '100%'")
    expect(output).toContain("'max-width': '1200px'")
  })

  it('sidebar layout', () => {
    const input = `
Sidebar as frame:
  width 250
  height full
  minw 200

Content as frame:
  width full
  height full

Sidebar
Content
`
    const output = compile(input)
    expect(output).toContain("'width': '250px'")
    expect(output).toContain("'min-width': '200px'")
  })

  it('modal with constraints', () => {
    const input = `
Modal as frame:
  minw 300
  maxw 500
  minh 200
  maxh 80%

Modal
`
    const output = compile(input)
    expect(output).toContain("'min-width': '300px'")
    expect(output).toContain("'max-width': '500px'")
    expect(output).toContain("'min-height': '200px'")
    expect(output).toContain("'max-height': '80%'")
  })

  it('icon button square with size', () => {
    const input = `
IconBtn as button:
  size 40
  center

IconBtn
`
    const output = compile(input)
    expect(output).toContain("'width': '40px'")
    expect(output).toContain("'height': '40px'")
    expect(output).toContain("'justify-content': 'center'")
    expect(output).toContain("'align-items': 'center'")
  })

  it('thumbnail image with size', () => {
    const input = `
Thumbnail as frame:
  size 120 80
  rad 4
  clip

Thumbnail
`
    const output = compile(input)
    expect(output).toContain("'width': '120px'")
    expect(output).toContain("'height': '80px'")
    expect(output).toContain("'border-radius': '4px'")
    expect(output).toContain("'overflow': 'hidden'")
  })

  it('card with hug height', () => {
    const input = `
Card as frame:
  width 300
  height hug
  pad 20

Card
`
    const output = compile(input)
    expect(output).toContain("'width': '300px'")
    expect(output).toContain("'height': 'fit-content'")
    expect(output).toContain("'padding': '20px'")
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('E2E: Sizing Edge Cases', () => {
  it('zero width', () => {
    const input = `
Collapsed as frame:
  width 0

Collapsed
`
    const output = compile(input)
    expect(output).toContain("'width': '0px'")
  })

  it('percentage values', () => {
    const input = `
Half as frame:
  width 50%

Half
`
    const output = compile(input)
    expect(output).toContain("'width': '50%'")
  })

  // Note: Viewport units might not be parsed correctly as they contain letters
  it.skip('viewport units (complex values not yet supported)', () => {
    const input = `
Fullscreen as frame:
  width 100vw
  height 100vh

Fullscreen
`
    const output = compile(input)
    expect(output).toContain("'width': '100vw'")
    expect(output).toContain("'height': '100vh'")
  })
})
