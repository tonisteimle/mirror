/**
 * Zag Forms 017: Checkbox, Switch, RadioGroup, Slider
 *
 * Tutorial Set - nur diese 4 Form-Komponenten werden unterstützt
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Forms', () => {

  function getStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // 1. Checkbox
  // ============================================================
  describe('Checkbox', () => {

    test('Checkbox wird erkannt', () => {
      const ir = toIR(parse(`Checkbox`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('checkbox')
    })

    test('Checkbox mit Label', () => {
      const ir = toIR(parse(`
Checkbox
  Label "Accept terms"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

    test('Checkbox in Frame', () => {
      const ir = toIR(parse(`
Frame ver gap 10
  Checkbox
    Label "Option 1"
  Checkbox
    Label "Option 2"
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

  })

  // ============================================================
  // 2. Switch
  // ============================================================
  describe('Switch', () => {

    test('Switch wird erkannt', () => {
      const ir = toIR(parse(`Switch`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('switch')
    })

    test('Switch mit Label', () => {
      const ir = toIR(parse(`
Switch
  Label "Dark Mode"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

    test('Switch Slots vorhanden', () => {
      const ir = toIR(parse(`Switch`))
      const slots = ir.nodes[0]?.slots
      // Switch sollte Track, Thumb, Label haben
      expect(slots).toBeDefined()
    })

  })

  // ============================================================
  // 3. RadioGroup
  // ============================================================
  describe('RadioGroup', () => {

    test('RadioGroup wird erkannt', () => {
      const ir = toIR(parse(`
RadioGroup
  Item "Option A" value "a"
  Item "Option B" value "b"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('radiogroup')
    })

    test('RadioGroup Items', () => {
      const ast = parse(`
RadioGroup
  Item "A"
  Item "B"
  Item "C"
`)
      const radioGroup = ast.instances[0] as any
      expect(radioGroup).toBeDefined()
    })

  })

  // ============================================================
  // 4. Slider
  // ============================================================
  describe('Slider', () => {

    test('Slider wird erkannt', () => {
      const ir = toIR(parse(`Slider`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('slider')
    })

    test('Slider Slots (Track, Range, Thumb)', () => {
      const ir = toIR(parse(`Slider`))
      const slots = ir.nodes[0]?.slots
      expect(slots?.Track).toBeDefined()
      expect(slots?.Thumb).toBeDefined()
    })

  })

  // ============================================================
  // 5. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Form mit mehreren Controls', () => {
      const ir = toIR(parse(`
Frame ver gap 20 pad 20
  Checkbox
    Label "Subscribe"
  RadioGroup
    Item "Email"
    Item "SMS"
  Switch
    Label "Notifications"
  Slider
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(4)
    })

  })

})
