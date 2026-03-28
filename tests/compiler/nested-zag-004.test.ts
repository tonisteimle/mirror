/**
 * Aggressive Test 004: Verschachtelte Zag-Komponenten
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Verschachtelte Zag', () => {

  // ============================================================
  // Test 4.1: Select in Frame in Frame
  // ============================================================
  test('4.1: Select in Frame in Frame', () => {
    const code = `
Frame
  Frame
    Select placeholder "..."
      Item "A"
      Item "B"
    Text "Nach Select"
`
    const ir = toIR(parse(code))

    const outer = ir.nodes[0]
    expect(outer.children.length).toBe(1)

    const inner = outer.children[0]
    expect(inner.children.length).toBe(2)

    // Erstes Kind: Select
    const select = inner.children[0] as any
    expect(select.isZagComponent).toBe(true)
    expect(select.items.length).toBe(2)

    // Zweites Kind: Text (nicht Item!)
    expect(inner.children[1].primitive).toBe('text')
  })

  // ============================================================
  // Test 4.2: Zwei Selects in verschiedenen Frames
  // ============================================================
  test('4.2: Zwei Selects in verschiedenen Frames', () => {
    const code = `
Frame
  Frame
    Select placeholder "Select 1"
      Item "A"
  Frame
    Select placeholder "Select 2"
      Item "X"
`
    const ir = toIR(parse(code))

    const outer = ir.nodes[0]
    expect(outer.children.length).toBe(2)

    // Erster Frame mit Select 1
    const frame1 = outer.children[0]
    const select1 = frame1.children[0] as any
    expect(select1.isZagComponent).toBe(true)
    expect(select1.machineConfig.placeholder).toBe('Select 1')
    expect(select1.items[0].label).toBe('A')

    // Zweiter Frame mit Select 2
    const frame2 = outer.children[1]
    const select2 = frame2.children[0] as any
    expect(select2.isZagComponent).toBe(true)
    expect(select2.machineConfig.placeholder).toBe('Select 2')
    expect(select2.items[0].label).toBe('X')
  })

  // ============================================================
  // Test 4.3: Frame nach Select auf gleicher Ebene
  // ============================================================
  test('4.3: Frame nach Select auf gleicher Ebene', () => {
    const code = `
Frame
  Select placeholder "..."
    Item "A"
  Frame
    Text "In Frame"
`
    const ir = toIR(parse(code))

    const outer = ir.nodes[0]
    expect(outer.children.length).toBe(2)

    // Select
    const select = outer.children[0] as any
    expect(select.isZagComponent).toBe(true)

    // Frame danach (nicht Teil von Select!)
    const frame = outer.children[1]
    expect(frame.primitive).toBe('frame')
    expect(frame.children.length).toBe(1)
    expect(frame.children[0].primitive).toBe('text')
  })

  // ============================================================
  // Test 4.4: 4 Ebenen tief verschachtelt
  // ============================================================
  test('4.4: 4 Ebenen tiefe Verschachtelung', () => {
    const code = `
Frame
  Frame
    Frame
      Frame
        Text "Sehr tief"
`
    const ir = toIR(parse(code))

    const level1 = ir.nodes[0]
    expect(level1.children.length).toBe(1)

    const level2 = level1.children[0]
    expect(level2.children.length).toBe(1)

    const level3 = level2.children[0]
    expect(level3.children.length).toBe(1)

    const level4 = level3.children[0]
    expect(level4.children.length).toBe(1)

    expect(level4.children[0].primitive).toBe('text')
  })

  // ============================================================
  // Test 4.5: Viele Geschwister (10+)
  // ============================================================
  test('4.5: Viele Geschwister', () => {
    const code = `
Frame
  Text "1"
  Text "2"
  Text "3"
  Text "4"
  Text "5"
  Text "6"
  Text "7"
  Text "8"
  Text "9"
  Text "10"
  Text "11"
  Text "12"
`
    const ir = toIR(parse(code))

    const parent = ir.nodes[0]
    expect(parent.children.length).toBe(12)

    // Alle sind Text-Primitive
    parent.children.forEach((child: any) => {
      expect(child.primitive).toBe('text')
    })
  })

  // ============================================================
  // Test 4.6: Mixed Primitives verschachtelt
  // ============================================================
  test('4.6: Mixed Primitives verschachtelt', () => {
    const code = `
Frame
  Button
    Text "Click"
    Icon "star"
  Input placeholder "Name"
  Text "Info"
`
    const ir = toIR(parse(code))

    const parent = ir.nodes[0]
    expect(parent.children.length).toBe(3)

    // Button mit Kindern
    const button = parent.children[0]
    expect(button.primitive).toBe('button')
    expect(button.children.length).toBe(2)
    expect(button.children[0].primitive).toBe('text')
    expect(button.children[1].primitive).toBe('icon')

    // Input
    expect(parent.children[1].primitive).toBe('input')

    // Text
    expect(parent.children[2].primitive).toBe('text')
  })

  // ============================================================
  // Test 4.7: Verschachtelte Layouts
  // ============================================================
  test('4.7: Verschachtelte Layouts', () => {
    const code = `
Frame hor gap 20
  Frame ver gap 10
    Text "A"
    Text "B"
  Frame ver gap 10
    Text "C"
    Text "D"
`
    const ir = toIR(parse(code))

    const parent = ir.nodes[0]

    function getStyle(node: any, property: string): string | undefined {
      const style = node.styles.find((s: any) => s.property === property)
      return style?.value
    }

    // Parent ist horizontal
    expect(getStyle(parent, 'flex-direction')).toBe('row')
    expect(getStyle(parent, 'gap')).toBe('20px')

    // Kinder sind vertikal
    expect(getStyle(parent.children[0], 'flex-direction')).toBe('column')
    expect(getStyle(parent.children[0], 'gap')).toBe('10px')
    expect(getStyle(parent.children[1], 'flex-direction')).toBe('column')
  })

  // ============================================================
  // Test 4.8: Vererbte Komponente verschachtelt
  // ============================================================
  test('4.8: Vererbte Komponente verschachtelt', () => {
    const code = `
Card as Frame:
  pad 16
  bg #333

Card
  Card
    Card
      Text "Tief verschachtelt"
`
    const ir = toIR(parse(code))

    const level1 = ir.nodes[0]
    expect(level1.children.length).toBe(1)

    const level2 = level1.children[0]
    expect(level2.children.length).toBe(1)

    const level3 = level2.children[0]
    expect(level3.children.length).toBe(1)
    expect(level3.children[0].primitive).toBe('text')

    // Alle haben die Card-Styles
    function getStyle(node: any, property: string): string | undefined {
      const style = node.styles.find((s: any) => s.property === property)
      return style?.value
    }

    expect(getStyle(level1, 'padding')).toBe('16px')
    expect(getStyle(level2, 'padding')).toBe('16px')
    expect(getStyle(level3, 'padding')).toBe('16px')
  })

  // ============================================================
  // Test 4.9: Zag in vererbter Komponente
  // ============================================================
  test('4.9: Zag in vererbter Komponente', () => {
    const code = `
FormField as Frame:
  ver
  gap 8

FormField
  Text "Label"
  Select placeholder "Choose..."
    Item "Option A"
    Item "Option B"
`
    const ir = toIR(parse(code))

    const field = ir.nodes[0]
    expect(field.children.length).toBe(2)

    expect(field.children[0].primitive).toBe('text')

    const select = field.children[1] as any
    expect(select.isZagComponent).toBe(true)
    expect(select.items.length).toBe(2)
  })

  // ============================================================
  // Test 4.10: Each-Loop verschachtelt
  // Each-Loop wird zu 'item' primitive transformiert
  // ============================================================
  test('4.10: Each-Loop in verschachtelter Struktur', () => {
    const code = `
Frame
  Frame
    each item in items
      Text item.name
`
    const ir = toIR(parse(code))

    const outer = ir.nodes[0]
    const inner = outer.children[0]

    // Each-Loop wird zu item-Node transformiert
    expect(inner.children.length).toBe(1)
    const eachNode = inner.children[0] as any

    // Das Kind des each ist ein Text
    expect(eachNode.children.length).toBe(1)
    expect(eachNode.children[0].primitive).toBe('text')
  })

})
