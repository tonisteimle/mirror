/**
 * @vitest-environment jsdom
 */

/**
 * Grid Layout Stress Tests
 *
 * Strategie-Ebene: Stress-Tests (Skalierbarkeit & Performance)
 * Tests für:
 * - Viele Grid-Items
 * - Tiefe Grid-Verschachtelung
 * - Performance-Benchmarks
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/parser'
import { toIR } from '../../src/ir'
import { generateDOM } from '../../src/backends/dom'

function measure<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = fn()
  const ms = performance.now() - start
  return { result, ms }
}

function hasStyle(node: any, property: string, value?: string): boolean {
  const style = node.styles?.find((s: any) => s.property === property)
  if (!style) return false
  if (value !== undefined) return style.value === value
  return true
}

// ============================================================================
// 1. VIELE GRID-ITEMS
// ============================================================================
describe('Grid Stress: Many Items', () => {

  it('100 Grid-Items parsen unter 100ms', () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      `  Frame x ${(i % 12) + 1} y ${Math.floor(i / 12) + 1} w 1 h 1`
    ).join('\n')

    const code = `Frame grid 12 gap 8\n${items}`

    const { ms } = measure(() => parse(code))
    expect(ms).toBeLessThan(100)
  })

  it('100 Grid-Items IR-Transform unter 100ms', () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      `  Frame x ${(i % 12) + 1} y ${Math.floor(i / 12) + 1}`
    ).join('\n')

    const code = `Frame grid 12\n${items}`
    const ast = parse(code)

    const { result: ir, ms } = measure(() => toIR(ast))

    expect(ms).toBeLessThan(100)
    expect(ir.nodes[0].children.length).toBe(100)
  })

  it('100 Grid-Items haben korrekte grid-column-start', () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      `  Frame x ${(i % 12) + 1}`
    ).join('\n')

    const code = `Frame grid 12\n${items}`
    const ir = toIR(parse(code))

    // Stichprobe: Items 0, 11, 50, 99
    expect(hasStyle(ir.nodes[0].children[0], 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[11], 'grid-column-start', '12')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[50], 'grid-column-start', '3')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[99], 'grid-column-start', '4')).toBe(true)
  })

  it('500 Grid-Items parsen unter 500ms', () => {
    const items = Array.from({ length: 500 }, (_, i) =>
      `  Frame w ${(i % 4) + 1}`
    ).join('\n')

    const code = `Frame grid 12 gap 8\n${items}`

    const { ms } = measure(() => parse(code))
    expect(ms).toBeLessThan(500)
  })

})

// ============================================================================
// 2. TIEFE GRID-VERSCHACHTELUNG
// ============================================================================
describe('Grid Stress: Deep Nesting', () => {

  it('5 Ebenen verschachtelte Grids', () => {
    const code = `
Frame grid 12
  Frame x 1 w 12 grid 6
    Frame x 1 w 6 grid 4
      Frame x 1 w 4 grid 3
        Frame x 1 w 3 grid 2
          Frame x 1 w 2
`
    const ir = toIR(parse(code))

    // Level 1: grid 12
    expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)

    // Level 2: in grid 12, selbst grid 6
    const l2 = ir.nodes[0].children[0]
    expect(hasStyle(l2, 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(l2, 'display', 'grid')).toBe(true)

    // Level 3: in grid 6, selbst grid 4
    const l3 = l2.children[0]
    expect(hasStyle(l3, 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(l3, 'display', 'grid')).toBe(true)

    // Level 4: in grid 4, selbst grid 3
    const l4 = l3.children[0]
    expect(hasStyle(l4, 'grid-column-start', '1')).toBe(true)

    // Level 5: in grid 3, selbst grid 2
    const l5 = l4.children[0]
    expect(hasStyle(l5, 'grid-column-start', '1')).toBe(true)
  })

  it('10 Ebenen verschachtelt unter 50ms parsen', () => {
    let code = 'Frame grid 12\n'
    for (let i = 0; i < 10; i++) {
      code += '  '.repeat(i + 1) + `Frame x 1 w ${12 - i} grid ${12 - i}\n`
    }
    code += '  '.repeat(11) + 'Frame x 1 w 1'

    const { ms } = measure(() => parse(code))
    expect(ms).toBeLessThan(50)
  })

  it('Grid > Flex > Grid > Flex Wechsel korrekt', () => {
    const code = `
Frame grid 4
  Frame x 1 w 2 hor
    Frame w 100
      Frame grid 3
        Frame x 2 w 2
`
    const ir = toIR(parse(code))

    // Outer Grid
    expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)

    // Flex in Grid
    const flex = ir.nodes[0].children[0]
    expect(hasStyle(flex, 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(flex, 'display', 'flex')).toBe(true)

    // w 100 in Flex - sollte 100px sein, nicht span
    const flexChild = flex.children[0]
    expect(hasStyle(flexChild, 'width', '100px')).toBe(true)

    // Inner Grid
    const innerGrid = flexChild.children[0]
    expect(hasStyle(innerGrid, 'display', 'grid')).toBe(true)

    // Inner Grid Child - x 2 in grid 3 context
    const innerChild = innerGrid.children[0]
    expect(hasStyle(innerChild, 'grid-column-start', '2')).toBe(true)
  })

})

// ============================================================================
// 3. GEMISCHTE LAYOUTS
// ============================================================================
describe('Grid Stress: Mixed Layouts', () => {

  it('50 verschiedene Layout-Kombinationen', () => {
    const layouts = [
      'Frame grid 3',
      'Frame grid 4 gap 8',
      'Frame grid 6 dense',
      'Frame grid 12 hor',
      'Frame grid auto 200',
      'Frame hor gap 16',
      'Frame ver gap 8',
      'Frame center',
      'Frame stacked',
      'Frame pos',
    ]

    const code = layouts.map((layout, i) =>
      `Container${i} as Frame:\n  ${layout}\n\nContainer${i}`
    ).join('\n\n')

    const { result: ast, ms: parseMs } = measure(() => parse(code))
    const { result: ir, ms: irMs } = measure(() => toIR(ast))

    expect(parseMs).toBeLessThan(100)
    expect(irMs).toBeLessThan(100)
    expect(ir.nodes.length).toBe(10)
  })

  it('Grid mit 20 verschiedenen Positionierungen', () => {
    const items = []
    for (let y = 1; y <= 4; y++) {
      for (let x = 1; x <= 5; x++) {
        items.push(`  Frame x ${x} y ${y} w 1 h 1`)
      }
    }

    const code = `Frame grid 5 gap 8\n${items.join('\n')}`
    const ir = toIR(parse(code))

    expect(ir.nodes[0].children.length).toBe(20)

    // Stichproben
    expect(hasStyle(ir.nodes[0].children[0], 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[0], 'grid-row-start', '1')).toBe(true)

    expect(hasStyle(ir.nodes[0].children[5], 'grid-column-start', '1')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[5], 'grid-row-start', '2')).toBe(true)

    expect(hasStyle(ir.nodes[0].children[19], 'grid-column-start', '5')).toBe(true)
    expect(hasStyle(ir.nodes[0].children[19], 'grid-row-start', '4')).toBe(true)
  })

})

// ============================================================================
// 4. PROPERTY KOMBINATIONEN
// ============================================================================
describe('Grid Stress: Property Combinations', () => {

  it('Alle Grid-Properties gleichzeitig', () => {
    const code = `Frame grid 12 gap 16 gap-x 8 gap-y 24 row-height 100 dense ver`
    const ir = toIR(parse(code))
    const node = ir.nodes[0]

    expect(hasStyle(node, 'display', 'grid')).toBe(true)
    expect(hasStyle(node, 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
    // gap-x sollte gap überschreiben für column
    expect(hasStyle(node, 'column-gap', '8px')).toBe(true)
    expect(hasStyle(node, 'row-gap', '24px')).toBe(true)
    expect(hasStyle(node, 'grid-auto-rows', '100px')).toBe(true)
    const flow = node.styles.find((s: any) => s.property === 'grid-auto-flow')?.value
    expect(flow).toContain('dense')
    expect(flow).toContain('column')
  })

  it('Grid-Kind mit allen Positionierungs-Properties', () => {
    const code = `
Frame grid 12
  Frame x 3 y 2 w 4 h 3 bg #f00 pad 16 rad 8
`
    const ir = toIR(parse(code))
    const child = ir.nodes[0].children[0]

    expect(hasStyle(child, 'grid-column-start', '3')).toBe(true)
    expect(hasStyle(child, 'grid-row-start', '2')).toBe(true)
    expect(hasStyle(child, 'grid-column', 'span 4')).toBe(true)
    expect(hasStyle(child, 'grid-row', 'span 3')).toBe(true)
    expect(hasStyle(child, 'padding', '16px')).toBe(true)
    expect(hasStyle(child, 'border-radius', '8px')).toBe(true)
  })

})

// ============================================================================
// 5. CODE-GENERATION STRESS
// ============================================================================
describe('Grid Stress: Code Generation', () => {

  it('50 Grid-Items generieren valides JavaScript', () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      `  Frame x ${(i % 6) + 1} w 1 bg #${String(i * 5).padStart(6, '0')}`
    ).join('\n')

    const code = `Frame grid 6 gap 8\n${items}`
    const ast = parse(code)

    const { result: domCode, ms } = measure(() => generateDOM(ast))

    expect(ms).toBeLessThan(100)
    expect(domCode).toContain('grid')
    expect(domCode).toContain('grid-column-start')

    // Code sollte ausführbar sein
    const fn = new Function(domCode.replace(/^export\s+function/gm, 'function') + '\nreturn createUI;')
    expect(typeof fn()).toBe('function')
  })

})

// ============================================================================
// 6. EXTREME WERTE
// ============================================================================
describe('Grid Stress: Extreme Values', () => {

  it('grid 100 - sehr viele Spalten', () => {
    const ir = toIR(parse(`Frame grid 100`))
    expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(100, 1fr)')).toBe(true)
  })

  it('x 50 y 50 - weit außerhalb', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 50 y 50
`))
    const child = ir.nodes[0].children[0]
    expect(hasStyle(child, 'grid-column-start', '50')).toBe(true)
    expect(hasStyle(child, 'grid-row-start', '50')).toBe(true)
  })

  it('w 100 h 100 - große Spans', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame w 100 h 100
`))
    const child = ir.nodes[0].children[0]
    expect(hasStyle(child, 'grid-column', 'span 100')).toBe(true)
    expect(hasStyle(child, 'grid-row', 'span 100')).toBe(true)
  })

  it('gap-x 1000 gap-y 1000 - große Gaps', () => {
    const ir = toIR(parse(`Frame grid 3 gap-x 1000 gap-y 1000`))
    expect(hasStyle(ir.nodes[0], 'column-gap', '1000px')).toBe(true)
    expect(hasStyle(ir.nodes[0], 'row-gap', '1000px')).toBe(true)
  })

})
