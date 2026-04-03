/**
 * Aggressive Test 002: Zag-Komponenten (Select)
 *
 * KRITISCH: Prüft ob Geschwister-Elemente nach Select korrekt geparst werden
 * und nicht versehentlich zu Items werden.
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Select - Geschwister', () => {

  // ============================================================
  // Test 2.1: Einfacher Select mit Items
  // ============================================================
  test('2.1: Einfacher Select mit Items', () => {
    const code = `
Select placeholder "Wähle..."
  Item "Option A"
  Item "Option B"
`
    const ast = parse(code)
    const ir = toIR(ast)

    expect(ir.nodes.length).toBe(1)

    const select = ir.nodes[0] as any

    // Select wird als Zag erkannt
    expect(select.isZagComponent).toBe(true)
    expect(select.zagType).toBe('select')

    // Hat 2 Items
    expect(select.items).toHaveLength(2)
    expect(select.items[0].label).toBe('Option A')
    expect(select.items[1].label).toBe('Option B')
  })

  // ============================================================
  // Test 2.2: KRITISCH - Geschwister nach Select
  // ============================================================
  test('2.2: KRITISCH - Geschwister nach Select', () => {
    const code = `
Frame ver gap 8
  Text "Vorher"
  Select placeholder "Wähle..."
    Item "A"
    Item "B"
  Text "Nachher"
  Button "Submit"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const frame = ir.nodes[0]

    // Frame hat genau 4 Kinder
    expect(frame.children.length).toBe(4)

    // Kind 0: Text "Vorher"
    expect(frame.children[0].primitive).toBe('text')

    // Kind 1: Select
    const select = frame.children[1] as any
    expect(select.isZagComponent).toBe(true)
    expect(select.zagType).toBe('select')
    expect(select.items).toHaveLength(2)

    // Kind 2: Text "Nachher" - KRITISCH!
    expect(frame.children[2].primitive).toBe('text')

    // Kind 3: Button
    expect(frame.children[3].primitive).toBe('button')
  })

  // ============================================================
  // Test 2.3: Mehrere Selects als Geschwister
  // ============================================================
  test('2.3: Mehrere Selects als Geschwister', () => {
    const code = `
Frame ver gap 8
  Select placeholder "Select 1"
    Item "A"
    Item "B"
  Select placeholder "Select 2"
    Item "X"
    Item "Y"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const frame = ir.nodes[0]

    // Frame hat genau 2 Kinder (2 Selects)
    expect(frame.children.length).toBe(2)

    // Erstes Select
    const select1 = frame.children[0] as any
    expect(select1.isZagComponent).toBe(true)
    expect(select1.machineConfig.placeholder).toBe('Select 1')
    expect(select1.items).toHaveLength(2)
    expect(select1.items[0].label).toBe('A')
    expect(select1.items[1].label).toBe('B')

    // Zweites Select
    const select2 = frame.children[1] as any
    expect(select2.isZagComponent).toBe(true)
    expect(select2.machineConfig.placeholder).toBe('Select 2')
    expect(select2.items).toHaveLength(2)
    expect(select2.items[0].label).toBe('X')
    expect(select2.items[1].label).toBe('Y')
  })

})
