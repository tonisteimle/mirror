/**
 * Layout Measurement Tests
 *
 * These tests verify layout behavior by rendering DOM elements
 * and checking their CSS properties. This tests the full pipeline:
 * Mirror code → AST → IR → DOM → CSS Properties
 *
 * Uses jsdom environment for DOM rendering.
 * Note: jsdom doesn't compute actual flex layouts, so we verify
 * CSS properties are correctly applied (not pixel dimensions).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../src/parser/parser'
import { generateDOM } from '../../src/backends/dom'

// Container for mounting test elements
let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  container.style.width = '1000px'
  container.style.height = '800px'
  container.style.position = 'absolute'
  container.style.top = '0'
  container.style.left = '0'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

/**
 * Helper to render Mirror code and return the first component element
 * (not the mirror-root wrapper)
 */
function renderMirror(code: string): HTMLElement {
  const ast = parse(code)
  let domCode = generateDOM(ast)

  // Remove 'export' keyword for Function execution
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  // Execute the generated code
  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()

  // Mount to container
  container.appendChild(ui.root)

  // Return the first actual component (skip mirror-root wrapper)
  return ui.root.children[0] as HTMLElement
}

/**
 * Helper to get inline style value (what Mirror actually sets)
 */
function getStyle(el: HTMLElement, prop: string): string {
  // For jsdom, we check inline styles since computed styles
  // don't actually compute flex layouts
  return el.style.getPropertyValue(prop) ||
    window.getComputedStyle(el).getPropertyValue(prop)
}

// ============================================================================
// HEIGHT FULL TESTS
// ============================================================================

describe('Layout Measurement: h full', () => {

  describe('Basic h full behavior', () => {

    it('h full fills remaining vertical space in fixed container', () => {
      const root = renderMirror(`
Container: w 300, h 300
Fixed: w 50, h 50
Flexible: w 50

Container:
  Fixed
  Flexible h full

Container
`)
      const children = root.children
      expect(children).toHaveLength(2)

      // First child: fixed 50px
      expect(getStyle(children[0] as HTMLElement, 'height')).toBe('50px')

      // Second child: should fill remaining (300 - 50 = 250px)
      // Note: In jsdom, flex layout may not compute actual dimensions
      // We verify CSS properties instead
      expect(getStyle(children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
      expect(getStyle(children[1] as HTMLElement, 'min-height')).toBe('0px')
    })

    it('h full element has no explicit height set', () => {
      const root = renderMirror(`
Container: w 100, h 100
Child: w 50, h 50

Container:
  Child h full

Container
`)
      const child = root.children[0] as HTMLElement
      // h full should NOT set height: 100%
      const height = getStyle(child, 'height')
      expect(height).not.toBe('100%')
      expect(height).not.toBe('50px')  // Should not have the Child's original height
    })
  })

  describe('Multiple h full children', () => {

    it('two h full children both get flex: 1', () => {
      const root = renderMirror(`
Container: w 200, h 400

Container:
  Box h full
  Box h full

Container
`)
      const children = root.children

      expect(getStyle(children[0] as HTMLElement, 'flex')).toBe('1 1 0%')
      expect(getStyle(children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
    })

    it('three h full children all get equal flex', () => {
      const root = renderMirror(`
Container: w 200, h 300

Container:
  Box h full
  Box h full
  Box h full

Container
`)
      const children = root.children
      expect(children).toHaveLength(3)

      for (const child of children) {
        expect(getStyle(child as HTMLElement, 'flex')).toBe('1 1 0%')
      }
    })
  })

  describe('h full with fixed siblings', () => {

    it('h full with one fixed sibling before', () => {
      const root = renderMirror(`
Container: w 200, h 200

Container:
  Box h 50
  Box h full

Container
`)
      const fixed = root.children[0] as HTMLElement
      const flex = root.children[1] as HTMLElement

      expect(getStyle(fixed, 'height')).toBe('50px')
      expect(getStyle(flex, 'flex')).toBe('1 1 0%')
    })

    it('h full with one fixed sibling after', () => {
      const root = renderMirror(`
Container: w 200, h 200

Container:
  Box h full
  Box h 50

Container
`)
      const flex = root.children[0] as HTMLElement
      const fixed = root.children[1] as HTMLElement

      expect(getStyle(flex, 'flex')).toBe('1 1 0%')
      expect(getStyle(fixed, 'height')).toBe('50px')
    })

    it('h full between two fixed siblings', () => {
      const root = renderMirror(`
Container: w 200, h 300

Container:
  Box h 50
  Box h full
  Box h 100

Container
`)
      const top = root.children[0] as HTMLElement
      const middle = root.children[1] as HTMLElement
      const bottom = root.children[2] as HTMLElement

      expect(getStyle(top, 'height')).toBe('50px')
      expect(getStyle(middle, 'flex')).toBe('1 1 0%')
      expect(getStyle(bottom, 'height')).toBe('100px')
    })

    it('multiple fixed + multiple h full', () => {
      const root = renderMirror(`
Container: w 200, h 400

Container:
  Box h 40
  Box h full
  Box h 60
  Box h full

Container
`)
      expect(getStyle(root.children[0] as HTMLElement, 'height')).toBe('40px')
      expect(getStyle(root.children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
      expect(getStyle(root.children[2] as HTMLElement, 'height')).toBe('60px')
      expect(getStyle(root.children[3] as HTMLElement, 'flex')).toBe('1 1 0%')
    })
  })

  describe('Nested h full', () => {

    it('h full inside h full container', () => {
      const root = renderMirror(`
Outer as Frame:
  w 300
  h 300

Inner as Frame:
  w 100

Outer
  Inner h full
    Frame h full
`)
      const inner = root.children[0] as HTMLElement
      const innerChild = inner.children[0] as HTMLElement

      expect(getStyle(inner, 'flex')).toBe('1 1 0%')
      expect(getStyle(innerChild, 'flex')).toBe('1 1 0%')
    })

    it('deeply nested h full (3 levels)', () => {
      const root = renderMirror(`
L1 as Frame:
  w 400
  h 400

L2 as Frame:
  w 100

L3 as Frame:
  w 50

L1
  L2 h full
    L3 h full
      Frame h full
`)
      const l2 = root.children[0] as HTMLElement
      const l3 = l2.children[0] as HTMLElement
      const box = l3.children[0] as HTMLElement

      expect(getStyle(l2, 'flex')).toBe('1 1 0%')
      expect(getStyle(l3, 'flex')).toBe('1 1 0%')
      expect(getStyle(box, 'flex')).toBe('1 1 0%')
    })
  })
})

// ============================================================================
// WIDTH FULL TESTS
// ============================================================================

describe('Layout Measurement: w full', () => {

  describe('Basic w full behavior', () => {

    it('w full in horizontal container fills remaining space', () => {
      const root = renderMirror(`
Row: w 400, h 100, hor

Row:
  Box w 50
  Box w full

Row
`)
      const fixed = root.children[0] as HTMLElement
      const flex = root.children[1] as HTMLElement

      expect(getStyle(fixed, 'width')).toBe('50px')
      expect(getStyle(flex, 'flex')).toBe('1 1 0%')
      expect(getStyle(flex, 'min-width')).toBe('0px')
    })

    it('w full element has no explicit width set', () => {
      const root = renderMirror(`
Row: w 300, h 100, hor

Row:
  Box w full

Row
`)
      const child = root.children[0] as HTMLElement
      const width = getStyle(child, 'width')
      expect(width).not.toBe('100%')
    })
  })

  describe('Multiple w full children', () => {

    it('two w full children share horizontal space', () => {
      const root = renderMirror(`
Row: w 400, h 100, hor

Row:
  Box w full
  Box w full

Row
`)
      expect(getStyle(root.children[0] as HTMLElement, 'flex')).toBe('1 1 0%')
      expect(getStyle(root.children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
    })
  })

  describe('w full with fixed siblings', () => {

    it('w full between two fixed width siblings', () => {
      const root = renderMirror(`
Row: w 500, h 100, hor

Row:
  Box w 100
  Box w full
  Box w 150

Row
`)
      expect(getStyle(root.children[0] as HTMLElement, 'width')).toBe('100px')
      expect(getStyle(root.children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
      expect(getStyle(root.children[2] as HTMLElement, 'width')).toBe('150px')
    })
  })
})

// ============================================================================
// COMBINED h full + w full TESTS
// ============================================================================

describe('Layout Measurement: Combined h full and w full', () => {

  it('h full + fixed w', () => {
    const root = renderMirror(`
Container: w 300, h 300

Container:
  Box w 100 h full

Container
`)
    const child = root.children[0] as HTMLElement

    expect(getStyle(child, 'width')).toBe('100px')
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
    expect(getStyle(child, 'min-height')).toBe('0px')
  })

  it('w full + fixed h in horizontal container', () => {
    const root = renderMirror(`
Row: w 300, h 100, hor

Row:
  Box w full h 50

Row
`)
    const child = root.children[0] as HTMLElement

    expect(getStyle(child, 'height')).toBe('50px')
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
    expect(getStyle(child, 'min-width')).toBe('0px')
  })

  it('h full in vertical + w full in horizontal nested', () => {
    const root = renderMirror(`
Outer as Frame:
  w 400
  h 400

Inner as Frame:
  h 100
  hor

Outer
  Frame h 50
  Inner h full
    Frame w 50
    Frame w full
`)
    const fixed = root.children[0] as HTMLElement
    const inner = root.children[1] as HTMLElement
    const innerFixed = inner.children[0] as HTMLElement
    const innerFlex = inner.children[1] as HTMLElement

    expect(getStyle(fixed, 'height')).toBe('50px')
    expect(getStyle(inner, 'flex')).toBe('1 1 0%')  // h full
    expect(getStyle(inner, 'flex-direction')).toBe('row')  // hor
    expect(getStyle(innerFixed, 'width')).toBe('50px')
    expect(getStyle(innerFlex, 'flex')).toBe('1 1 0%')  // w full
  })
})

// ============================================================================
// CONTAINER DIRECTION TESTS
// ============================================================================

describe('Layout Measurement: Container Direction', () => {

  describe('Vertical (default) container', () => {

    it('Frame without direction is vertical', () => {
      const root = renderMirror(`
Container: w 200, h 200

Container:
  Box h 50
  Box h 50

Container
`)
      expect(getStyle(root, 'flex-direction')).toBe('column')
    })

    it('ver keyword sets vertical direction', () => {
      const root = renderMirror(`
Container: w 200, h 200, ver

Container:
  Box h 50

Container
`)
      expect(getStyle(root, 'flex-direction')).toBe('column')
    })
  })

  describe('Horizontal container', () => {

    it('hor keyword sets horizontal direction', () => {
      const root = renderMirror(`
Row: w 200, h 100, hor

Row:
  Box w 50
  Box w 50

Row
`)
      expect(getStyle(root, 'flex-direction')).toBe('row')
    })

    it('horizontal keyword sets horizontal direction', () => {
      const root = renderMirror(`
Row: w 200, h 100, horizontal

Row:
  Box w 50
  Box w 50

Row
`)
      expect(getStyle(root, 'flex-direction')).toBe('row')
    })
  })

  describe('h full in wrong direction', () => {

    it('h full in horizontal container still uses flex', () => {
      const root = renderMirror(`
Row: w 300, h 100, hor

Row:
  Box w 50
  Box h full

Row
`)
      // h full should still generate flex, but in row direction
      // it will try to fill height (cross-axis)
      const flexChild = root.children[1] as HTMLElement
      expect(getStyle(flexChild, 'flex')).toBe('1 1 0%')
    })

    it('w full in vertical container still uses flex', () => {
      const root = renderMirror(`
Container: w 300, h 300

Container:
  Box h 50
  Box w full

Container
`)
      // w full should still generate flex, but in column direction
      // it will try to fill width (cross-axis)
      const flexChild = root.children[1] as HTMLElement
      expect(getStyle(flexChild, 'flex')).toBe('1 1 0%')
    })
  })
})

// ============================================================================
// FLEX CONTAINER PROPERTIES TESTS
// ============================================================================

describe('Layout Measurement: Flex Container Properties', () => {

  it('Frame with children is flex container', () => {
    const root = renderMirror(`
Container:
  Box "a"
  Box "b"

Container
`)
    expect(getStyle(root, 'display')).toBe('flex')
  })

  it('gap property adds spacing', () => {
    const root = renderMirror(`
Container: gap 16

Container:
  Box "a"
  Box "b"

Container
`)
    expect(getStyle(root, 'gap')).toBe('16px')
  })

  it('wrap enables flex-wrap', () => {
    const root = renderMirror(`
Container: w 200, wrap

Container:
  Box w 100
  Box w 100
  Box w 100

Container
`)
    expect(getStyle(root, 'flex-wrap')).toBe('wrap')
  })
})

// ============================================================================
// ALIGNMENT TESTS
// ============================================================================

describe('Layout Measurement: Alignment', () => {

  describe('center alignment', () => {

    it('center aligns both axes', () => {
      const root = renderMirror(`
Container: w 200, h 200, center

Container:
  Box w 50, h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('center')
      expect(getStyle(root, 'align-items')).toBe('center')
    })
  })

  describe('Context-aware center', () => {

    it('top center = top + horizontal center', () => {
      const root = renderMirror(`
Container: w 200, h 200, top center

Container:
  Box w 50, h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('flex-start')
      expect(getStyle(root, 'align-items')).toBe('center')
    })

    it('bottom center = bottom + horizontal center', () => {
      const root = renderMirror(`
Container: w 200, h 200, bottom center

Container:
  Box w 50, h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('flex-end')
      expect(getStyle(root, 'align-items')).toBe('center')
    })

    it('left center = left + vertical center', () => {
      const root = renderMirror(`
Container: w 200, h 200, left center

Container:
  Box w 50, h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('center')
      expect(getStyle(root, 'align-items')).toBe('flex-start')
    })

    it('right center = right + vertical center', () => {
      const root = renderMirror(`
Container: w 200, h 200, right center

Container:
  Box w 50, h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('center')
      expect(getStyle(root, 'align-items')).toBe('flex-end')
    })
  })

  describe('spread alignment', () => {

    it('spread uses space-between', () => {
      const root = renderMirror(`
Container: w 200, h 200, spread

Container:
  Box h 50
  Box h 50
  Box h 50

Container
`)
      expect(getStyle(root, 'justify-content')).toBe('space-between')
    })
  })

  describe('Alignment in horizontal container', () => {

    it('top in hor container aligns to top', () => {
      const root = renderMirror(`
Row: w 200, h 100, hor top

Row:
  Box w 50, h 30
  Box w 50, h 30

Row
`)
      expect(getStyle(root, 'flex-direction')).toBe('row')
      expect(getStyle(root, 'align-items')).toBe('flex-start')
    })

    it('left in hor container justifies to start', () => {
      const root = renderMirror(`
Row: w 200, h 100, hor left

Row:
  Box w 50
  Box w 50

Row
`)
      expect(getStyle(root, 'justify-content')).toBe('flex-start')
    })
  })
})

// ============================================================================
// COMPONENT DEFINITION MERGING TESTS
// ============================================================================

describe('Layout Measurement: Component Merging', () => {

  it('split definition merges styles and children', () => {
    const root = renderMirror(`
Card: w 200, h 200, bg #333

Card:
  Box h 50
  Box h full

Card
`)
    // Should have styles from first definition
    expect(getStyle(root, 'width')).toBe('200px')
    expect(getStyle(root, 'height')).toBe('200px')
    expect(getStyle(root, 'background')).toContain('51')  // #333 = rgb(51,51,51)

    // Should have children from second definition
    expect(root.children).toHaveLength(2)

    // h full should work
    expect(getStyle(root.children[1] as HTMLElement, 'flex')).toBe('1 1 0%')
  })

  it('second definition can override properties', () => {
    const root = renderMirror(`
Card: w 100, bg #111

Card: w 200

Card
`)
    expect(getStyle(root, 'width')).toBe('200px')
  })
})

// ============================================================================
// h hug / w hug TESTS
// ============================================================================

describe('Layout Measurement: hug sizing', () => {

  it('h hug uses fit-content', () => {
    const root = renderMirror(`
Container: w 200, h hug

Container:
  Box h 50

Container
`)
    expect(getStyle(root, 'height')).toBe('fit-content')
  })

  it('w hug uses fit-content', () => {
    const root = renderMirror(`
Container: w hug, h 100

Container:
  Box w 50

Container
`)
    expect(getStyle(root, 'width')).toBe('fit-content')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Layout Measurement: Edge Cases', () => {

  it('empty container still gets flex', () => {
    const root = renderMirror(`
Container: w 200, h 200

Container

Container
`)
    // Frame should be flex container even without children
    expect(getStyle(root, 'display')).toBe('flex')
  })

  it('single h full child in container', () => {
    const root = renderMirror(`
Container: w 200, h 200

Container:
  Box h full

Container
`)
    const child = root.children[0] as HTMLElement
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
  })

  it('h full overrides explicit h from component', () => {
    const root = renderMirror(`
SmallBox: w 50, h 50

Container: w 200, h 200

Container:
  SmallBox h full

Container
`)
    const child = root.children[0] as HTMLElement

    // h full should override the h 50 from SmallBox definition
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
    // Should NOT have height: 50px
    expect(getStyle(child, 'height')).not.toBe('50px')
  })

  it('w full overrides explicit w from component', () => {
    const root = renderMirror(`
SmallBox: w 50, h 50

Row: w 200, h 100, hor

Row:
  SmallBox w full

Row
`)
    const child = root.children[0] as HTMLElement

    // w full should override the w 50 from SmallBox definition
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
    // Should NOT have width: 50px
    expect(getStyle(child, 'width')).not.toBe('50px')
  })

  it('padding does not affect h full calculation', () => {
    const root = renderMirror(`
Container: w 200, h 200, pad 20

Container:
  Box h full

Container
`)
    expect(getStyle(root, 'padding')).toBe('20px')
    expect(getStyle(root.children[0] as HTMLElement, 'flex')).toBe('1 1 0%')
  })

  it('border does not break h full', () => {
    const root = renderMirror(`
Container: w 200, h 200, bor 2 #333

Container:
  Box h full

Container
`)
    expect(getStyle(root.children[0] as HTMLElement, 'flex')).toBe('1 1 0%')
  })
})

// ============================================================================
// GRID LAYOUT TESTS
// ============================================================================

describe('Layout Measurement: Grid', () => {

  it('grid 2 creates 2 column grid', () => {
    const root = renderMirror(`
Grid: w 400, grid 2

Grid:
  Box "1"
  Box "2"
  Box "3"
  Box "4"

Grid
`)
    expect(getStyle(root, 'display')).toBe('grid')
    expect(getStyle(root, 'grid-template-columns')).toBe('repeat(2, 1fr)')
  })

  it('grid 3 creates 3 column grid', () => {
    const root = renderMirror(`
Grid: w 600, grid 3

Grid:
  Box "1"
  Box "2"
  Box "3"

Grid
`)
    expect(getStyle(root, 'display')).toBe('grid')
    expect(getStyle(root, 'grid-template-columns')).toBe('repeat(3, 1fr)')
  })

  it('grid with gap', () => {
    const root = renderMirror(`
Grid: w 400, grid 2, gap 16

Grid:
  Box "1"
  Box "2"

Grid
`)
    expect(getStyle(root, 'display')).toBe('grid')
    expect(getStyle(root, 'gap')).toBe('16px')
  })
})
