/**
 * Aggressive Test 006: Layout-System
 *
 * Eltern: ver/hor + alignment
 * Kinder: w/h, hug, full
 * Zusammenspiel mit Geschwistern
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Layout-System', () => {

  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles.find((s: any) => s.property === property)
    return style?.value
  }

  function hasStyle(node: any, property: string, value: string): boolean {
    return node.styles.some((s: any) => s.property === property && s.value === value)
  }

  // ============================================================
  // ELTERN: Richtung
  // ============================================================

  describe('Richtung (Eltern)', () => {

    test('ver = flex-direction column', () => {
      const ir = toIR(parse(`Frame ver`))
      expect(hasStyle(ir.nodes[0], 'flex-direction', 'column')).toBe(true)
    })

    test('hor = flex-direction row', () => {
      const ir = toIR(parse(`Frame hor`))
      expect(hasStyle(ir.nodes[0], 'flex-direction', 'row')).toBe(true)
    })

    test('Frame ohne Richtung = column (default)', () => {
      const ir = toIR(parse(`Frame`))
      // Frame hat default column
      expect(hasStyle(ir.nodes[0], 'flex-direction', 'column')).toBe(true)
    })

  })

  // ============================================================
  // ELTERN: Alignment
  // ============================================================

  describe('Alignment (Eltern)', () => {

    test('center = beide Achsen zentriert', () => {
      const ir = toIR(parse(`Frame center`))
      expect(hasStyle(ir.nodes[0], 'justify-content', 'center')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'align-items', 'center')).toBe(true)
    })

    test('spread = space-between', () => {
      const ir = toIR(parse(`Frame spread`))
      expect(hasStyle(ir.nodes[0], 'justify-content', 'space-between')).toBe(true)
    })

    test('hor center = horizontal, Kinder zentriert', () => {
      const ir = toIR(parse(`Frame hor center`))
      expect(hasStyle(ir.nodes[0], 'flex-direction', 'row')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'justify-content', 'center')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'align-items', 'center')).toBe(true)
    })

  })

  // ============================================================
  // KINDER: Größen
  // ============================================================

  describe('Kind-Größen', () => {

    test('w 100 = feste Breite', () => {
      const ir = toIR(parse(`
Frame
  Frame w 100
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'width')).toBe('100px')
    })

    test('w hug = fit-content', () => {
      const ir = toIR(parse(`
Frame
  Frame w hug
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'width')).toBe('fit-content')
    })

    test('w full = flex 1 (füllt Restplatz)', () => {
      const ir = toIR(parse(`
Frame
  Frame w full
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'flex', '1 1 0%')).toBe(true)
    })

  })

  // ============================================================
  // KOMBINATIONEN: Eltern + Kinder
  // ============================================================

  describe('Eltern + Kinder Kombinationen', () => {

    test('hor: drei Kinder mit fix, full, fix', () => {
      const ir = toIR(parse(`
Frame hor
  Frame w 100 bg #f00
  Frame w full bg #0f0
  Frame w 100 bg #00f
`))
      const [left, middle, right] = ir.nodes[0].children

      expect(getStyle(left, 'width')).toBe('100px')
      expect(hasStyle(middle, 'flex', '1 1 0%')).toBe(true)
      expect(getStyle(right, 'width')).toBe('100px')
    })

    test('ver: drei Kinder mit fix, full, hug', () => {
      const ir = toIR(parse(`
Frame ver h 400
  Frame h 50 bg #f00
  Frame h full bg #0f0
  Frame h hug bg #00f
`))
      const [top, middle, bottom] = ir.nodes[0].children

      expect(getStyle(top, 'height')).toBe('50px')
      expect(hasStyle(middle, 'flex', '1 1 0%')).toBe(true)
      expect(getStyle(bottom, 'height')).toBe('fit-content')
    })

    test('hor spread: Kinder verteilt', () => {
      const ir = toIR(parse(`
Frame hor spread
  Frame w 50
  Frame w 50
  Frame w 50
`))
      expect(hasStyle(ir.nodes[0], 'flex-direction', 'row')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'justify-content', 'space-between')).toBe(true)
    })

    test('mehrere full-Kinder teilen sich Platz', () => {
      const ir = toIR(parse(`
Frame hor
  Frame w full bg #f00
  Frame w full bg #0f0
  Frame w full bg #00f
`))
      const children = ir.nodes[0].children

      // Alle haben flex
      expect(hasStyle(children[0], 'flex', '1 1 0%')).toBe(true)
      expect(hasStyle(children[1], 'flex', '1 1 0%')).toBe(true)
      expect(hasStyle(children[2], 'flex', '1 1 0%')).toBe(true)
    })

  })

  // ============================================================
  // GAP
  // ============================================================

  describe('Gap', () => {

    test('gap auf Eltern', () => {
      const ir = toIR(parse(`
Frame hor gap 16
  Frame w 50
  Frame w 50
`))
      expect(getStyle(ir.nodes[0], 'gap')).toBe('16px')
    })

  })

})
