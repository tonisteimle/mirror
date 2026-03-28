/**
 * Aggressive Test 007: Layout-Konflikte
 *
 * Was passiert bei widersprüchlichen Layout-Properties?
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Layout-Konflikte', () => {

  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles.find((s: any) => s.property === property)
    return style?.value
  }

  // ============================================================
  // Test 7.1: hor und ver gleichzeitig
  // ============================================================
  test('7.1: hor und ver gleichzeitig - wer gewinnt?', () => {
    const ir = toIR(parse(`Frame hor ver`))
    const direction = getStyle(ir.nodes[0], 'flex-direction')

    // Einer muss gewinnen - welcher?
    expect(['row', 'column']).toContain(direction)
    console.log('hor ver → flex-direction:', direction)
  })

  // ============================================================
  // Test 7.2: ver und hor (andere Reihenfolge)
  // ============================================================
  test('7.2: ver und hor - Reihenfolge relevant?', () => {
    const ir1 = toIR(parse(`Frame hor ver`))
    const ir2 = toIR(parse(`Frame ver hor`))

    const dir1 = getStyle(ir1.nodes[0], 'flex-direction')
    const dir2 = getStyle(ir2.nodes[0], 'flex-direction')

    console.log('hor ver →', dir1)
    console.log('ver hor →', dir2)

    // Dokumentieren was passiert
    expect(dir1).toBeDefined()
    expect(dir2).toBeDefined()
  })

  // ============================================================
  // Test 7.3: center und spread gleichzeitig
  // ============================================================
  test('7.3: center und spread gleichzeitig', () => {
    const ir = toIR(parse(`Frame center spread`))
    const justify = getStyle(ir.nodes[0], 'justify-content')

    console.log('center spread → justify-content:', justify)
    expect(justify).toBeDefined()
  })

  // ============================================================
  // Test 7.4: left und right gleichzeitig
  // ============================================================
  test('7.4: left und right gleichzeitig', () => {
    const ir = toIR(parse(`Frame left right`))
    const align = getStyle(ir.nodes[0], 'align-items')

    console.log('left right → align-items:', align)
    expect(align).toBeDefined()
  })

  // ============================================================
  // Test 7.5: w full und w 100 gleichzeitig
  // ============================================================
  test('7.5: w full und w 100 - wer gewinnt?', () => {
    const ir = toIR(parse(`
Frame
  Frame w full w 100
`))
    const child = ir.nodes[0].children[0]
    const width = getStyle(child, 'width')
    const flex = getStyle(child, 'flex')

    console.log('w full w 100 → width:', width, 'flex:', flex)

    // Einer muss gewinnen
    expect(width || flex).toBeDefined()
  })

})
