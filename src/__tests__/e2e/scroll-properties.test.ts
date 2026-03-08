/**
 * Scroll Properties E2E Tests
 *
 * Tests the full compilation pipeline for scroll-related properties:
 * - scroll (vertical)
 * - scroll-ver
 * - scroll-hor
 * - scroll-both
 * - clip (overflow: hidden)
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

describe('E2E: Scroll - Vertical (scroll)', () => {
  const input = `
List as frame:
  scroll
  height 300

List
`

  it('generates overflow-y: auto', () => {
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
  })

  it('maintains fixed height', () => {
    const output = compile(input)
    expect(output).toContain("'height': '300px'")
  })
})

describe('E2E: Scroll - Vertical Explicit (scroll-ver)', () => {
  const input = `
Panel as frame:
  scroll-ver
  maxh 400

Panel
`

  it('generates overflow-y: auto', () => {
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
  })

  it('generates max-height', () => {
    const output = compile(input)
    expect(output).toContain("'max-height': '400px'")
  })
})

describe('E2E: Scroll - Horizontal (scroll-hor)', () => {
  const input = `
HorizontalList as frame:
  scroll-hor
  horizontal

HorizontalList
`

  it('generates overflow-x: auto', () => {
    const output = compile(input)
    expect(output).toContain("'overflow-x': 'auto'")
  })

  it('generates horizontal layout', () => {
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
  })
})

describe('E2E: Scroll - Both Directions (scroll-both)', () => {
  const input = `
Canvas as frame:
  scroll-both
  width 500
  height 400

Canvas
`

  it('generates overflow: auto', () => {
    const output = compile(input)
    expect(output).toContain("'overflow': 'auto'")
  })

  it('generates fixed dimensions', () => {
    const output = compile(input)
    expect(output).toContain("'width': '500px'")
    expect(output).toContain("'height': '400px'")
  })
})

describe('E2E: Clip (overflow: hidden)', () => {
  const input = `
Card as frame:
  clip
  rad 8

Card
`

  it('generates overflow: hidden', () => {
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
  })

  it('maintains border-radius', () => {
    const output = compile(input)
    expect(output).toContain("'border-radius': '8px'")
  })
})

describe('E2E: Scroll with Other Properties', () => {
  it('scroll with padding', () => {
    const input = `
List as frame:
  scroll
  pad 16

List
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'padding': '16px'")
  })

  it('scroll with gap', () => {
    const input = `
List as frame:
  scroll
  gap 8

List
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'gap': '8px'")
  })

  it('scroll with background', () => {
    const input = `
List as frame:
  scroll
  bg #1a1a23

List
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'background': '#1a1a23'")
  })
})

describe('E2E: Scroll Containers with Children', () => {
  const input = `
Item as frame:
  pad 12

ScrollList as frame:
  scroll
  height 200
  gap 4

ScrollList
  - Item "Item 1"
  - Item "Item 2"
  - Item "Item 3"
`

  it('parent has scroll', () => {
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
  })

  it('children are created', () => {
    const output = compile(input)
    expect(output).toContain('textContent = "Item 1"')
    expect(output).toContain('textContent = "Item 2"')
    expect(output).toContain('textContent = "Item 3"')
  })
})

describe('E2E: Clip for Image Containers', () => {
  const input = `
Avatar as frame:
  clip
  rad 50
  width 48
  height 48

Avatar
`

  it('generates circular clip', () => {
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'border-radius': '50px'")
  })

  it('has fixed dimensions', () => {
    const output = compile(input)
    expect(output).toContain("'width': '48px'")
    expect(output).toContain("'height': '48px'")
  })
})

describe('E2E: Scroll Real World Patterns', () => {
  it('sidebar navigation with scroll', () => {
    const input = `
NavItem as frame:
  pad 8 16

Sidebar as frame:
  scroll
  width 250
  height full
  bg #1a1a23

Sidebar
  - NavItem "Home"
  - NavItem "Settings"
  - NavItem "Profile"
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'width': '250px'")
  })

  it('code block with horizontal scroll', () => {
    const input = `
CodeBlock as frame:
  scroll-hor
  pad 16
  bg #282c34
  rad 4

CodeBlock
`
    const output = compile(input)
    expect(output).toContain("'overflow-x': 'auto'")
    expect(output).toContain("'padding': '16px'")
  })

  it('modal content with max height scroll', () => {
    const input = `
ModalContent as frame:
  scroll
  maxh 400
  pad 20

ModalContent
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'max-height': '400px'")
  })

  it('card with clipped image', () => {
    const input = `
CardImage as frame:
  clip
  rad 8 8 0 0
  height 200

CardImage
`
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'border-radius': '8px 8px 0px 0px'")
  })
})

describe('E2E: Scroll Property Combinations', () => {
  it('scroll-ver with minw and maxw', () => {
    const input = `
Panel as frame:
  scroll-ver
  minw 200
  maxw 600

Panel
`
    const output = compile(input)
    expect(output).toContain("'overflow-y': 'auto'")
    expect(output).toContain("'min-width': '200px'")
    expect(output).toContain("'max-width': '600px'")
  })

  it('clip with border', () => {
    const input = `
Container as frame:
  clip
  bor 1 #333
  rad 8

Container
`
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'border':")
  })
})
