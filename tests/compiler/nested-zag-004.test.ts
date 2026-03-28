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

})
