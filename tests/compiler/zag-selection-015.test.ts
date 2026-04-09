/**
 * Zag Selection 015: Select
 *
 * Tutorial Set - nur Select wird unterstützt (Combobox, Listbox entfernt)
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Selection', () => {

  function getStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // 1. Select Basis
  // ============================================================
  describe('Select Basis', () => {

    test('Select wird erkannt', () => {
      const ir = toIR(parse(`
Select
  Item "A"
  Item "B"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

    test('Select Items werden in items-Array gespeichert', () => {
      // Items werden in items-Array gespeichert, nicht als children
      // Das ist by design - Zag-Komponenten haben eine spezielle Struktur
      const ir = toIR(parse(`
Select
  Item "A"
  Item "B"
  Item "C"
`))
      const node = ir.nodes[0] as any
      expect(node?.items?.length).toBe(3)
      expect(node?.items?.[0]?.label).toBe('A')
      expect(node?.items?.[1]?.label).toBe('B')
      expect(node?.items?.[2]?.label).toBe('C')
    })

  })

  // ============================================================
  // 2. Select + Layout
  // ============================================================
  describe('Select + Layout', () => {

    test('Select mit w setzt width', () => {
      const ir = toIR(parse(`Select w 200`))
      const node = ir.nodes[0]
      const width = getStyle(node, 'width')
      expect(width).toBe('200px')
    })

    test('Select mit pad setzt padding', () => {
      const ir = toIR(parse(`Select pad 10`))
      const node = ir.nodes[0]
      const padding = getStyle(node, 'padding')
      expect(padding).toBe('10px')
    })

    test('Select mit bg setzt background', () => {
      const ir = toIR(parse(`Select bg #f00`))
      const node = ir.nodes[0]
      const bg = getStyle(node, 'background')
      expect(bg).toBe('#f00')
    })

    test('Select mit mehreren Layout-Properties', () => {
      const ir = toIR(parse(`Select w 200 pad 10 bg #f00 rad 8`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'width')).toBe('200px')
      expect(getStyle(node, 'padding')).toBe('10px')
      expect(getStyle(node, 'background')).toBe('#f00')
      expect(getStyle(node, 'border-radius')).toBe('8px')
    })

  })

  // ============================================================
  // 3. Select verschachtelt
  // ============================================================
  describe('Select verschachtelt', () => {

    test('Select in Frame', () => {
      const ir = toIR(parse(`
Frame hor gap 10
  Text "Label"
  Select w full
    Item "A"
    Item "B"
`))
      const frame = ir.nodes[0]

      // Frame sollte 2 Kinder haben: Text und Select
      expect(frame?.children?.length).toBe(2)

      const select = frame?.children?.[1]
      expect(select).toBeDefined()
    })

    test('Select in Frame in Frame (3 Ebenen)', () => {
      const ir = toIR(parse(`
Frame
  Frame
    Select
      Item "A"
`))
      const deepSelect = ir.nodes[0]?.children?.[0]?.children?.[0]
      expect(deepSelect).toBeDefined()
    })

    test('Mehrere Selects nebeneinander', () => {
      const ir = toIR(parse(`
Frame hor gap 10
  Select
    Item "A1"
  Select
    Item "B1"
  Select
    Item "C1"
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(3)
    })

  })

  // ============================================================
  // 4. Select Slots
  // ============================================================
  describe('Select Slots', () => {

    test('Select.Trigger existiert', () => {
      // Hypothese: Slots werden nicht korrekt generiert
      const ast = parse(`
Select
  Trigger "Choose..."
  Content
    Item "A"
`)
      expect(ast.instances.length).toBeGreaterThan(0)
    })

    test('Select mit expliziten Slots', () => {
      const ir = toIR(parse(`
Select
  Trigger "Choose..."
  Content
    Item "A"
    Item "B"
`))
      const node = ir.nodes[0]
      expect(node).toBeDefined()
    })

  })

  // ============================================================
  // 5. Edge Cases
  // ============================================================
  describe('Edge Cases', () => {

    test('Leerer Select', () => {
      const ir = toIR(parse(`Select`))
      expect(ir.nodes.length).toBe(1)
    })

    test('Select mit nur einem Item', () => {
      const ir = toIR(parse(`
Select
  Item "Only"
`))
      expect(ir.nodes.length).toBe(1)
    })

    test('Select Item mit Properties', () => {
      const ir = toIR(parse(`
Select
  Item "A" value "a"
  Item "B" value "b" disabled
`))
      const node = ir.nodes[0]
      expect(node).toBeDefined()
    })

  })

})
