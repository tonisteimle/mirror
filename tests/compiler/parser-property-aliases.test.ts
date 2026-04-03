/**
 * Aggressive Test 003: Properties
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Properties', () => {

  // Helper: Extrahiert Style-Wert
  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles.find((s: any) => s.property === property)
    return style?.value
  }

  // ============================================================
  // Test 3.1: Aliase sind äquivalent
  // ============================================================
  test('3.1: Aliase sind äquivalent', () => {
    const code1 = `Frame w 100`
    const code2 = `Frame width 100`

    const ir1 = toIR(parse(code1))
    const ir2 = toIR(parse(code2))

    const width1 = getStyle(ir1.nodes[0], 'width')
    const width2 = getStyle(ir2.nodes[0], 'width')

    expect(width1).toBe('100px')
    expect(width2).toBe('100px')
    expect(width1).toBe(width2)
  })

  // ============================================================
  // Test 3.2: Reihenfolge egal
  // ============================================================
  test('3.2: Reihenfolge egal', () => {
    const code1 = `Frame w 100 bg #f00`
    const code2 = `Frame bg #f00 w 100`

    const ir1 = toIR(parse(code1))
    const ir2 = toIR(parse(code2))

    // Beide haben width
    expect(getStyle(ir1.nodes[0], 'width')).toBe('100px')
    expect(getStyle(ir2.nodes[0], 'width')).toBe('100px')

    // Beide haben background
    expect(getStyle(ir1.nodes[0], 'background')).toBe('#f00')
    expect(getStyle(ir2.nodes[0], 'background')).toBe('#f00')
  })

  // ============================================================
  // Test 3.3: Kurzform und Langform gemischt
  // ============================================================
  test('3.3: Kurzform und Langform gemischt', () => {
    const code = `Frame width 100 h 200 background #f00 pad 16`

    const ir = toIR(parse(code))
    const node = ir.nodes[0]

    expect(getStyle(node, 'width')).toBe('100px')
    expect(getStyle(node, 'height')).toBe('200px')
    expect(getStyle(node, 'background')).toBe('#f00')
    expect(getStyle(node, 'padding')).toBe('16px')
  })

})
