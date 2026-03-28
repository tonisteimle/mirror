/**
 * Aggressive Test 001: Basis-Struktur
 *
 * Prüft ob Parser und IR die grundlegende Eltern-Kind-Struktur korrekt abbilden.
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Basis-Struktur', () => {

  // ============================================================
  // Test 1.1: Frame mit drei Text-Kindern
  // ============================================================
  test('1.1: Frame mit drei Text-Kindern', () => {
    const code = `
Frame
  Text "Eins"
  Text "Zwei"
  Text "Drei"
`
    const ast = parse(code)
    const ir = toIR(ast)

    // Genau 1 Root-Node
    expect(ir.nodes.length).toBe(1)

    const root = ir.nodes[0]

    // Root ist Frame (div) - primitive ist lowercase
    expect(root.tag).toBe('div')
    expect(root.primitive).toBe('frame')

    // Genau 3 Kinder
    expect(root.children.length).toBe(3)

    // Alle Kinder sind Text (span) - primitive ist lowercase
    expect(root.children[0].tag).toBe('span')
    expect(root.children[0].primitive).toBe('text')
    expect(root.children[1].tag).toBe('span')
    expect(root.children[1].primitive).toBe('text')
    expect(root.children[2].tag).toBe('span')
    expect(root.children[2].primitive).toBe('text')
  })

  // ============================================================
  // Test 1.2: Verschachtelte Frames
  // ============================================================
  test('1.2: Verschachtelte Frames', () => {
    const code = `
Frame
  Frame
    Text "Tief"
  Text "Flach"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const root = ir.nodes[0]

    // Root hat 2 Kinder (nicht 3!)
    expect(root.children.length).toBe(2)

    // Erstes Kind ist Frame mit 1 Kind
    expect(root.children[0].tag).toBe('div')
    expect(root.children[0].primitive).toBe('frame')
    expect(root.children[0].children.length).toBe(1)
    expect(root.children[0].children[0].primitive).toBe('text')

    // Zweites Kind ist Text (Geschwister, nicht Enkel)
    expect(root.children[1].tag).toBe('span')
    expect(root.children[1].primitive).toBe('text')
  })

  // ============================================================
  // Test 1.3: Properties auf Frame
  // ============================================================
  test('1.3: Properties auf Frame', () => {
    const code = `
Frame w 100 h 200 bg #f00
  Text "Kind"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const root = ir.nodes[0]

    // Kind ist weiterhin Kind
    expect(root.children.length).toBe(1)
    expect(root.children[0].primitive).toBe('text')

    // Properties werden zu styles
    const styleMap = new Map(root.styles.map(s => [s.property, s.value]))

    expect(styleMap.get('width')).toBe('100px')
    expect(styleMap.get('height')).toBe('200px')
    expect(styleMap.get('background')).toBe('#f00')
  })

})
