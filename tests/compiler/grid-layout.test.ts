/**
 * @vitest-environment jsdom
 */

/**
 * Grid Layout System Tests
 *
 * Tests for context-aware x/y/w/h in grid layout.
 * In grid context, these properties generate grid positioning instead of absolute positioning.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../src/parser/parser'
import { toIR } from '../../src/ir'

describe('Grid Layout System', () => {

  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles?.find((s: any) => s.property === property)
    return style?.value
  }

  function hasStyle(node: any, property: string, value: string): boolean {
    return node.styles?.some((s: any) => s.property === property && s.value === value) || false
  }

  // ============================================================
  // BASIC GRID SETUP
  // ============================================================

  describe('Grid Container', () => {

    test('grid 3 creates 3-column grid', () => {
      const ir = toIR(parse(`Frame grid 3`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(3, 1fr)')).toBe(true)
    })

    test('grid 12 creates 12-column grid', () => {
      const ir = toIR(parse(`Frame grid 12`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
    })

    test('grid auto 250 creates auto-fill grid', () => {
      const ir = toIR(parse(`Frame grid auto 250`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(getStyle(ir.nodes[0], 'grid-template-columns')).toContain('auto-fill')
    })

  })

  // ============================================================
  // GRID POSITIONING: x IN GRID CONTEXT
  // ============================================================

  describe('x in Grid Context', () => {

    test('x in grid child generates grid-column-start', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 2
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column-start', '2')).toBe(true)
      // Should NOT have position: absolute
      expect(hasStyle(child, 'position', 'absolute')).toBe(false)
    })

    test('x 5 in grid child generates grid-column-start 5', () => {
      const ir = toIR(parse(`
Frame grid 6
  Frame x 5
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column-start')).toBe('5')
    })

  })

  // ============================================================
  // GRID POSITIONING: y IN GRID CONTEXT
  // ============================================================

  describe('y in Grid Context', () => {

    test('y in grid child generates grid-row-start', () => {
      const ir = toIR(parse(`
Frame grid 3
  Frame y 2
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-row-start', '2')).toBe(true)
      // Should NOT have position: absolute
      expect(hasStyle(child, 'position', 'absolute')).toBe(false)
    })

    test('y 3 in grid child generates grid-row-start 3', () => {
      const ir = toIR(parse(`
Frame grid 4
  Frame y 3
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-row-start')).toBe('3')
    })

  })

  // ============================================================
  // GRID SPAN: w IN GRID CONTEXT
  // ============================================================

  describe('w in Grid Context', () => {

    test('w 4 in grid child generates grid-column: span 4', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 4
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column', 'span 4')).toBe(true)
    })

    test('w 2 in grid child generates grid-column: span 2', () => {
      const ir = toIR(parse(`
Frame grid 6
  Frame w 2
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column')).toBe('span 2')
    })

  })

  // ============================================================
  // GRID SPAN: h IN GRID CONTEXT
  // ============================================================

  describe('h in Grid Context', () => {

    test('h 3 in grid child generates grid-row: span 3', () => {
      const ir = toIR(parse(`
Frame grid 4
  Frame h 3
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-row', 'span 3')).toBe(true)
    })

    test('h 2 in grid child generates grid-row: span 2', () => {
      const ir = toIR(parse(`
Frame grid 6
  Frame h 2
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-row')).toBe('span 2')
    })

  })

  // ============================================================
  // COMBINED GRID POSITIONING
  // ============================================================

  describe('Combined Grid Positioning', () => {

    test('x 2 y 3 w 4 h 2 generates all grid properties', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 2 y 3 w 4 h 2
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column-start')).toBe('2')
      expect(getStyle(child, 'grid-row-start')).toBe('3')
      expect(getStyle(child, 'grid-column')).toBe('span 4')
      expect(getStyle(child, 'grid-row')).toBe('span 2')
    })

  })

  // ============================================================
  // BACKWARD COMPATIBILITY: x/y OUTSIDE GRID
  // ============================================================

  describe('x/y Outside Grid (Backward Compatibility)', () => {

    test('x outside grid still generates position: absolute + left', () => {
      const ir = toIR(parse(`
Frame pos
  Frame x 50
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'position', 'absolute')).toBe(true)
      expect(hasStyle(child, 'left', '50px')).toBe(true)
      // Should NOT have grid-column-start
      expect(getStyle(child, 'grid-column-start')).toBeUndefined()
    })

    test('y outside grid still generates position: absolute + top', () => {
      const ir = toIR(parse(`
Frame pos
  Frame y 100
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'position', 'absolute')).toBe(true)
      expect(hasStyle(child, 'top', '100px')).toBe(true)
      // Should NOT have grid-row-start
      expect(getStyle(child, 'grid-row-start')).toBeUndefined()
    })

    test('w outside grid generates width in px', () => {
      const ir = toIR(parse(`
Frame
  Frame w 200
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'width')).toBe('200px')
      // Should NOT have grid-column
      expect(getStyle(child, 'grid-column')).toBeUndefined()
    })

  })

  // ============================================================
  // GRID AUTO-FLOW: hor/ver/dense
  // ============================================================

  describe('Grid Auto-Flow', () => {

    test('hor in grid sets grid-auto-flow: row', () => {
      const ir = toIR(parse(`Frame grid 3 hor`))
      expect(hasStyle(ir.nodes[0], 'grid-auto-flow', 'row')).toBe(true)
    })

    test('ver in grid sets grid-auto-flow: column', () => {
      const ir = toIR(parse(`Frame grid 3 ver`))
      expect(hasStyle(ir.nodes[0], 'grid-auto-flow', 'column')).toBe(true)
    })

    test('dense sets grid-auto-flow: dense', () => {
      const ir = toIR(parse(`Frame grid 3 dense`))
      expect(getStyle(ir.nodes[0], 'grid-auto-flow')).toContain('dense')
    })

    test('hor dense sets grid-auto-flow: row dense', () => {
      const ir = toIR(parse(`Frame grid 3 hor dense`))
      const flow = getStyle(ir.nodes[0], 'grid-auto-flow')
      expect(flow).toContain('row')
      expect(flow).toContain('dense')
    })

    test('ver dense sets grid-auto-flow: column dense', () => {
      const ir = toIR(parse(`Frame grid 3 ver dense`))
      const flow = getStyle(ir.nodes[0], 'grid-auto-flow')
      expect(flow).toContain('column')
      expect(flow).toContain('dense')
    })

  })

  // ============================================================
  // GAP-X / GAP-Y
  // ============================================================

  describe('Gap-x and Gap-y', () => {

    test('gap-x 16 sets column-gap', () => {
      const ir = toIR(parse(`Frame grid 3 gap-x 16`))
      expect(hasStyle(ir.nodes[0], 'column-gap', '16px')).toBe(true)
    })

    test('gap-y 24 sets row-gap', () => {
      const ir = toIR(parse(`Frame grid 3 gap-y 24`))
      expect(hasStyle(ir.nodes[0], 'row-gap', '24px')).toBe(true)
    })

    test('gx alias works', () => {
      const ir = toIR(parse(`Frame grid 3 gx 8`))
      expect(hasStyle(ir.nodes[0], 'column-gap', '8px')).toBe(true)
    })

    test('gy alias works', () => {
      const ir = toIR(parse(`Frame grid 3 gy 12`))
      expect(hasStyle(ir.nodes[0], 'row-gap', '12px')).toBe(true)
    })

    test('gap-x and gap-y together', () => {
      const ir = toIR(parse(`Frame grid 3 gap-x 16 gap-y 24`))
      expect(hasStyle(ir.nodes[0], 'column-gap', '16px')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'row-gap', '24px')).toBe(true)
    })

    test('gap-x/gap-y work in flex too', () => {
      const ir = toIR(parse(`Frame hor gap-x 8 gap-y 16`))
      expect(hasStyle(ir.nodes[0], 'column-gap', '8px')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'row-gap', '16px')).toBe(true)
    })

  })

  // ============================================================
  // ROW-HEIGHT
  // ============================================================

  describe('Row-Height', () => {

    test('row-height 100 sets grid-auto-rows', () => {
      const ir = toIR(parse(`Frame grid 3 row-height 100`))
      expect(hasStyle(ir.nodes[0], 'grid-auto-rows', '100px')).toBe(true)
    })

    test('rh alias works', () => {
      const ir = toIR(parse(`Frame grid 4 rh 80`))
      expect(hasStyle(ir.nodes[0], 'grid-auto-rows', '80px')).toBe(true)
    })

  })

  // ============================================================
  // FULL PAGE LAYOUT EXAMPLE
  // ============================================================

  describe('Full Page Layout Example', () => {

    test('12-column grid with positioned items', () => {
      const ir = toIR(parse(`
Frame grid 12 gap 16
  Frame x 1 w 3
  Frame x 4 w 6
  Frame x 10 w 3
`))
      const container = ir.nodes[0]
      expect(hasStyle(container, 'display', 'grid')).toBe(true)
      expect(hasStyle(container, 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
      expect(hasStyle(container, 'gap', '16px')).toBe(true)

      // First child: column 1, span 3
      const child1 = container.children[0]
      expect(getStyle(child1, 'grid-column-start')).toBe('1')
      expect(getStyle(child1, 'grid-column')).toBe('span 3')

      // Second child: column 4, span 6
      const child2 = container.children[1]
      expect(getStyle(child2, 'grid-column-start')).toBe('4')
      expect(getStyle(child2, 'grid-column')).toBe('span 6')

      // Third child: column 10, span 3
      const child3 = container.children[2]
      expect(getStyle(child3, 'grid-column-start')).toBe('10')
      expect(getStyle(child3, 'grid-column')).toBe('span 3')
    })

    test('dashboard-style grid layout', () => {
      const ir = toIR(parse(`
Frame grid 12 gap-x 16 gap-y 24 row-height 100
  Frame x 1 y 1 w 8 h 2
  Frame x 9 y 1 w 4 h 1
  Frame x 9 y 2 w 4 h 1
`))
      const container = ir.nodes[0]

      // Main content area: spans 8 columns, 2 rows
      const mainContent = container.children[0]
      expect(getStyle(mainContent, 'grid-column-start')).toBe('1')
      expect(getStyle(mainContent, 'grid-row-start')).toBe('1')
      expect(getStyle(mainContent, 'grid-column')).toBe('span 8')
      expect(getStyle(mainContent, 'grid-row')).toBe('span 2')

      // Side widgets
      const widget1 = container.children[1]
      expect(getStyle(widget1, 'grid-column-start')).toBe('9')
      expect(getStyle(widget1, 'grid-row-start')).toBe('1')
      expect(getStyle(widget1, 'grid-column')).toBe('span 4')
      expect(getStyle(widget1, 'grid-row')).toBe('span 1')
    })

  })

})
