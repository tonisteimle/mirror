/**
 * Layout System Tests (Phase 0)
 *
 * Tests the intelligent layout merging system.
 *
 * Key insight: In flexbox, alignment properties map differently based on flex-direction:
 * - In column (default): left/right → align-items (cross-axis), top/bottom → justify-content (main-axis)
 * - In row: left/right → justify-content (main-axis), top/bottom → align-items (cross-axis)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/parser'
import { generateDOM } from '../../src/backends/dom'

describe('Layout: Alignment in Column (default)', () => {
  // In column layout: horizontal alignment → align-items (cross-axis)
  it('left → align-items: flex-start', () => {
    const ast = parse(`
Box as frame:
  left

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'column'")
    expect(js).toContain("'align-items': 'flex-start'")
  })

  it('right → align-items: flex-end', () => {
    const ast = parse(`
Box as frame:
  right

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'align-items': 'flex-end'")
  })

  it('hor-center → align-items: center', () => {
    const ast = parse(`
Box as frame:
  hor-center

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'align-items': 'center'")
  })

  // In column layout: vertical alignment → justify-content (main-axis)
  it('top → justify-content: flex-start', () => {
    const ast = parse(`
Box as frame:
  top

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'justify-content': 'flex-start'")
  })

  it('bottom → justify-content: flex-end', () => {
    const ast = parse(`
Box as frame:
  bottom

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'justify-content': 'flex-end'")
  })

  it('ver-center → justify-content: center', () => {
    const ast = parse(`
Box as frame:
  ver-center

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'justify-content': 'center'")
  })

  it('center → both axes centered', () => {
    const ast = parse(`
Box as frame:
  center

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'justify-content': 'center'")
    expect(js).toContain("'align-items': 'center'")
  })
})

describe('Layout: Alignment in Row', () => {
  // In row layout: horizontal alignment → justify-content (main-axis)
  it('hor, left → justify-content: flex-start', () => {
    const ast = parse(`
Box as frame:
  hor, left

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'justify-content': 'flex-start'")
  })

  it('hor, right → justify-content: flex-end', () => {
    const ast = parse(`
Header as frame:
  hor, right

Header
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'justify-content': 'flex-end'")
  })

  it('hor, hor-center → justify-content: center', () => {
    const ast = parse(`
Box as frame:
  hor, hor-center

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'justify-content': 'center'")
  })

  // In row layout: vertical alignment → align-items (cross-axis)
  it('hor, top → align-items: flex-start', () => {
    const ast = parse(`
Box as frame:
  hor, top

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'align-items': 'flex-start'")
  })

  it('hor, bottom → align-items: flex-end', () => {
    const ast = parse(`
Box as frame:
  hor, bottom

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'align-items': 'flex-end'")
  })

  it('hor, ver-center → align-items: center', () => {
    const ast = parse(`
Box as frame:
  hor, ver-center

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'align-items': 'center'")
  })
})

describe('Layout: Combined Column Alignment', () => {
  it('ver, bottom → justify-content: flex-end (main-axis)', () => {
    const ast = parse(`
Footer as frame:
  ver, bottom

Footer
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'column'")
    expect(js).toContain("'justify-content': 'flex-end'")
  })

  it('ver, right → align-items: flex-end (cross-axis)', () => {
    const ast = parse(`
Box as frame:
  ver, right

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'column'")
    expect(js).toContain("'align-items': 'flex-end'")
  })

  it('ver, right, bottom → both axes aligned', () => {
    const ast = parse(`
Box as frame:
  ver, right, bottom

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'column'")
    expect(js).toContain("'justify-content': 'flex-end'")
    expect(js).toContain("'align-items': 'flex-end'")
  })
})

describe('Layout: Grid', () => {
  it('converts grid 3 to 3 equal columns', () => {
    const ast = parse(`
Gallery as frame:
  grid 3

Gallery
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'grid-template-columns': 'repeat(3, 1fr)'")
  })

  it('converts grid auto 250 to responsive columns', () => {
    const ast = parse(`
Products as frame:
  grid auto 250

Products
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))'")
  })

  it('converts grid with percentages', () => {
    const ast = parse(`
Layout as frame:
  grid 30% 70%

Layout
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'grid-template-columns': '30% 70%'")
  })
})

describe('Layout: Other Properties', () => {
  it('spread → justify-content: space-between', () => {
    const ast = parse(`
Box as frame:
  spread

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'justify-content': 'space-between'")
  })

  it('wrap → flex-wrap: wrap', () => {
    const ast = parse(`
Box as frame:
  wrap

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'flex-wrap': 'wrap'")
  })

  it('gap with layout', () => {
    const ast = parse(`
Box as frame:
  hor, gap 16

Box
`)
    const js = generateDOM(ast)

    expect(js).toContain("'display': 'flex'")
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'gap': '16px'")
  })
})
