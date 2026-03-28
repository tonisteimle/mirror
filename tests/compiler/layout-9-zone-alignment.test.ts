/**
 * Aggressive Test 008: 9-Zone Alignment
 *
 * top-left, top-center, top-right
 * center-left, center, center-right
 * bottom-left, bottom-center, bottom-right
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('9-Zone Alignment', () => {

  // Letzten Wert finden (CSS-Kaskade: letzter gewinnt)
  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // Obere Reihe
  // ============================================================

  test('top-left', () => {
    const ir = toIR(parse(`Frame top-left`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-start')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-start')
  })

  test('top-center (tc)', () => {
    const ir = toIR(parse(`Frame tc`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-start')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('center')
  })

  test('top-right', () => {
    const ir = toIR(parse(`Frame top-right`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-start')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-end')
  })

  // ============================================================
  // Mittlere Reihe
  // ============================================================

  test('center-left (cl)', () => {
    const ir = toIR(parse(`Frame cl`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-start')
  })

  test('center', () => {
    const ir = toIR(parse(`Frame center`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('center')
  })

  test('center-right (cr)', () => {
    const ir = toIR(parse(`Frame cr`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-end')
  })

  // ============================================================
  // Untere Reihe
  // ============================================================

  test('bottom-left (bl)', () => {
    const ir = toIR(parse(`Frame bl`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-end')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-start')
  })

  test('bottom-center (bc)', () => {
    const ir = toIR(parse(`Frame bc`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-end')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('center')
  })

  test('bottom-right (br)', () => {
    const ir = toIR(parse(`Frame br`))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('flex-end')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('flex-end')
  })

})
