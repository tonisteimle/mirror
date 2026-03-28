/**
 * @vitest-environment jsdom
 */

/**
 * Grid Layout HTML-Output Tests
 *
 * Strategie-Ebene: HTML-Output-Tests (JSDOM)
 * Diese Tests prüfen das FINALE HTML-Output, nicht nur die IR.
 * Sie kompilieren Mirror-Code und führen ihn in JSDOM aus.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../src/parser/parser'
import { generateDOM } from '../../src/backends/dom'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

function render(code: string): HTMLElement {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }

  let domCode = generateDOM(ast)
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()

  container.appendChild(ui.root)

  const root = ui.root.firstElementChild as HTMLElement
  return root
}

function getStyle(el: HTMLElement, prop: string): string {
  const inline = el.style.getPropertyValue(prop)
  if (inline) return inline
  const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return (el.style as any)[camelProp] || ''
}

// ============================================================
// 1. GRID CONTAINER - Display und Template
// ============================================================
describe('Grid Container (HTML)', () => {

  it('grid 3 → display: grid', () => {
    const el = render(`Frame grid 3`)
    expect(getStyle(el, 'display')).toBe('grid')
  })

  it('grid 3 → grid-template-columns: repeat(3, 1fr)', () => {
    const el = render(`Frame grid 3`)
    expect(getStyle(el, 'grid-template-columns')).toBe('repeat(3, 1fr)')
  })

  it('grid 12 → repeat(12, 1fr)', () => {
    const el = render(`Frame grid 12`)
    expect(getStyle(el, 'grid-template-columns')).toBe('repeat(12, 1fr)')
  })

  it('grid auto 200 → auto-fill minmax', () => {
    const el = render(`Frame grid auto 200`)
    const gtc = getStyle(el, 'grid-template-columns')
    expect(gtc).toContain('auto-fill')
    expect(gtc).toContain('200px')
  })

})

// ============================================================
// 2. GRID POSITIONING - x/y in Grid-Kontext
// ============================================================
describe('Grid Positioning (HTML)', () => {

  it('x in Grid → grid-column-start, NICHT left', () => {
    const el = render(`
Frame grid 12
  Frame x 3
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'grid-column-start')).toBe('3')
    // NICHT absolute positioning
    expect(getStyle(child, 'position')).not.toBe('absolute')
    expect(getStyle(child, 'left')).toBe('')
  })

  it('y in Grid → grid-row-start, NICHT top', () => {
    const el = render(`
Frame grid 3
  Frame y 2
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'grid-row-start')).toBe('2')
    expect(getStyle(child, 'top')).toBe('')
  })

  it('w in Grid → grid-column: span, NICHT width in px', () => {
    const el = render(`
Frame grid 12
  Frame w 4
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'grid-column')).toBe('span 4')
    // w 4 sollte NICHT 4px sein
    expect(getStyle(child, 'width')).not.toBe('4px')
  })

  it('h in Grid → grid-row: span, NICHT height in px', () => {
    const el = render(`
Frame grid 4
  Frame h 2
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'grid-row')).toBe('span 2')
    expect(getStyle(child, 'height')).not.toBe('2px')
  })

  it('x y w h kombiniert in Grid', () => {
    const el = render(`
Frame grid 12
  Frame x 2 y 1 w 6 h 2
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'grid-column-start')).toBe('2')
    expect(getStyle(child, 'grid-row-start')).toBe('1')
    expect(getStyle(child, 'grid-column')).toBe('span 6')
    expect(getStyle(child, 'grid-row')).toBe('span 2')
  })

})

// ============================================================
// 3. BACKWARD COMPATIBILITY - x/y außerhalb Grid
// ============================================================
describe('x/y Outside Grid - Backward Compatibility (HTML)', () => {

  it('x in pos → position: absolute + left', () => {
    const el = render(`
Frame pos
  Frame x 50
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('50px')
    // NICHT grid
    expect(getStyle(child, 'grid-column-start')).toBe('')
  })

  it('y in stacked → position: absolute + top', () => {
    const el = render(`
Frame stacked
  Frame y 100
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'top')).toBe('100px')
  })

  it('w außerhalb Grid → width in px', () => {
    const el = render(`
Frame
  Frame w 200
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyle(child, 'width')).toBe('200px')
    expect(getStyle(child, 'grid-column')).toBe('')
  })

})

// ============================================================
// 4. GRID AUTO-FLOW
// ============================================================
describe('Grid Auto-Flow (HTML)', () => {

  it('hor in grid → grid-auto-flow: row', () => {
    const el = render(`Frame grid 3 hor`)
    expect(getStyle(el, 'grid-auto-flow')).toBe('row')
  })

  it('ver in grid → grid-auto-flow: column', () => {
    const el = render(`Frame grid 3 ver`)
    expect(getStyle(el, 'grid-auto-flow')).toBe('column')
  })

  it('dense → grid-auto-flow enthält "dense"', () => {
    const el = render(`Frame grid 3 dense`)
    expect(getStyle(el, 'grid-auto-flow')).toContain('dense')
  })

  it('ver dense → column dense', () => {
    const el = render(`Frame grid 3 ver dense`)
    const flow = getStyle(el, 'grid-auto-flow')
    expect(flow).toContain('column')
    expect(flow).toContain('dense')
  })

})

// ============================================================
// 5. GAP-X / GAP-Y
// ============================================================
describe('Gap-x Gap-y (HTML)', () => {

  it('gap-x 16 → column-gap: 16px', () => {
    const el = render(`Frame grid 3 gap-x 16`)
    expect(getStyle(el, 'column-gap')).toBe('16px')
  })

  it('gap-y 24 → row-gap: 24px', () => {
    const el = render(`Frame grid 3 gap-y 24`)
    expect(getStyle(el, 'row-gap')).toBe('24px')
  })

  it('gx alias → column-gap', () => {
    const el = render(`Frame grid 3 gx 8`)
    expect(getStyle(el, 'column-gap')).toBe('8px')
  })

  it('gy alias → row-gap', () => {
    const el = render(`Frame grid 3 gy 12`)
    expect(getStyle(el, 'row-gap')).toBe('12px')
  })

  it('gap-x + gap-y zusammen', () => {
    const el = render(`Frame grid 3 gap-x 16 gap-y 24`)
    expect(getStyle(el, 'column-gap')).toBe('16px')
    expect(getStyle(el, 'row-gap')).toBe('24px')
  })

  it('gap-x/gap-y in Flex funktioniert auch', () => {
    const el = render(`Frame hor wrap gap-x 8 gap-y 16`)
    expect(getStyle(el, 'column-gap')).toBe('8px')
    expect(getStyle(el, 'row-gap')).toBe('16px')
  })

})

// ============================================================
// 6. ROW-HEIGHT
// ============================================================
describe('Row-Height (HTML)', () => {

  it('row-height 100 → grid-auto-rows: 100px', () => {
    const el = render(`Frame grid 3 row-height 100`)
    expect(getStyle(el, 'grid-auto-rows')).toBe('100px')
  })

  it('rh alias → grid-auto-rows', () => {
    const el = render(`Frame grid 4 rh 80`)
    expect(getStyle(el, 'grid-auto-rows')).toBe('80px')
  })

})

// ============================================================
// 7. NESTED GRIDS - Kontext-Isolation
// ============================================================
describe('Nested Grids (HTML)', () => {

  it('Grid in Grid - innerer Grid ist Kind von äußerem', () => {
    const el = render(`
Frame grid 12
  Frame x 1 w 6 grid 3
    Frame w 2
`)
    const innerGrid = el.firstElementChild as HTMLElement
    const innerChild = innerGrid.firstElementChild as HTMLElement

    // InnerGrid ist Grid-Kind: x/w → grid positioning
    expect(getStyle(innerGrid, 'grid-column-start')).toBe('1')
    expect(getStyle(innerGrid, 'grid-column')).toBe('span 6')
    expect(getStyle(innerGrid, 'display')).toBe('grid')

    // InnerChild ist Kind des inneren Grids
    expect(getStyle(innerChild, 'grid-column')).toBe('span 2')
  })

})

// ============================================================
// 8. GRID + FLEX KONTEXT-WECHSEL
// ============================================================
describe('Grid > Flex > Element (HTML)', () => {

  it('x in Flex-Kind (innerhalb Grid) ist NICHT grid-column', () => {
    const el = render(`
Frame grid 12
  Frame x 3 w 6 hor
    Frame x 50
`)
    const flexContainer = el.firstElementChild as HTMLElement
    const flexChild = flexContainer.firstElementChild as HTMLElement

    // FlexContainer ist Grid-Kind
    expect(getStyle(flexContainer, 'grid-column-start')).toBe('3')

    // FlexChild ist NICHT in Grid - x wird anders behandelt
    expect(getStyle(flexChild, 'grid-column-start')).toBe('')
  })

})

// ============================================================
// 9. KOMBINATIONEN MIT ANDEREN PROPERTIES
// ============================================================
describe('Grid Property Combinations (HTML)', () => {

  it('grid + gap + pad zusammen', () => {
    const el = render(`Frame grid 3 gap 16 pad 20`)
    expect(getStyle(el, 'display')).toBe('grid')
    expect(getStyle(el, 'gap')).toBe('16px')
    expect(getStyle(el, 'padding')).toBe('20px')
  })

  it('grid + bg + rad zusammen', () => {
    const el = render(`Frame grid 4 bg #f0f0f0 rad 8`)
    expect(getStyle(el, 'display')).toBe('grid')
    expect(getStyle(el, 'border-radius')).toBe('8px')
  })

})

// ============================================================
// 10. REAL-WORLD PATTERNS
// ============================================================
describe('Real-World Grid Patterns (HTML)', () => {

  it('12-Spalten Dashboard Layout', () => {
    const el = render(`
Frame grid 12 gap 16
  Frame x 1 w 3 bg #eee
  Frame x 4 w 6 bg #ddd
  Frame x 10 w 3 bg #ccc
`)
    const [left, main, right] = Array.from(el.children) as HTMLElement[]

    expect(getStyle(left, 'grid-column-start')).toBe('1')
    expect(getStyle(left, 'grid-column')).toBe('span 3')

    expect(getStyle(main, 'grid-column-start')).toBe('4')
    expect(getStyle(main, 'grid-column')).toBe('span 6')

    expect(getStyle(right, 'grid-column-start')).toBe('10')
    expect(getStyle(right, 'grid-column')).toBe('span 3')
  })

  it('Grid mit unterschiedlichen Zeilen-Höhen', () => {
    const el = render(`
Frame grid 3 row-height 100 gap-x 8 gap-y 16
  Frame w 2 h 2 bg #f00
  Frame h 1 bg #0f0
  Frame h 1 bg #00f
`)
    expect(getStyle(el, 'grid-auto-rows')).toBe('100px')
    expect(getStyle(el, 'column-gap')).toBe('8px')
    expect(getStyle(el, 'row-gap')).toBe('16px')

    const bigItem = el.firstElementChild as HTMLElement
    expect(getStyle(bigItem, 'grid-column')).toBe('span 2')
    expect(getStyle(bigItem, 'grid-row')).toBe('span 2')
  })

  it('Auto-Grid Card Layout', () => {
    const el = render(`
Frame grid auto 250 gap 16
  Frame bg #fff rad 8 pad 16
  Frame bg #fff rad 8 pad 16
  Frame bg #fff rad 8 pad 16
`)
    expect(getStyle(el, 'display')).toBe('grid')
    expect(getStyle(el, 'gap')).toBe('16px')
    const gtc = getStyle(el, 'grid-template-columns')
    expect(gtc).toContain('auto-fill')
  })

})

// ============================================================
// 11. EDGE CASES
// ============================================================
describe('Grid Edge Cases (HTML)', () => {

  it('grid 1 - ein-spaltig', () => {
    const el = render(`Frame grid 1`)
    expect(getStyle(el, 'grid-template-columns')).toBe('repeat(1, 1fr)')
  })

  it('gap 0 setzt explizit gap: 0', () => {
    const el = render(`Frame grid 3 gap 0`)
    expect(getStyle(el, 'gap')).toBe('0px')
  })

  it('gap-x 0 gap-y 16 - nur row-gap', () => {
    const el = render(`Frame grid 3 gap-x 0 gap-y 16`)
    expect(getStyle(el, 'column-gap')).toBe('0px')
    expect(getStyle(el, 'row-gap')).toBe('16px')
  })

})

// ============================================================
// 12. VERERBUNG MIT GRID
// ============================================================
describe('Grid Inheritance (HTML)', () => {

  it('Definition mit Grid, Instanz mit Position', () => {
    const el = render(`
GridContainer: = Frame grid 4 gap 8

GridContainer
  Frame x 1 w 2
  Frame x 3 w 2
`)
    expect(getStyle(el, 'display')).toBe('grid')
    expect(getStyle(el, 'gap')).toBe('8px')

    const [child1, child2] = Array.from(el.children) as HTMLElement[]
    expect(getStyle(child1, 'grid-column-start')).toBe('1')
    expect(getStyle(child2, 'grid-column-start')).toBe('3')
  })

})
