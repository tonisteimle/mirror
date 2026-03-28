/**
 * Zag Forms 017: Checkbox, Switch, RadioGroup, Slider, etc. kaputt machen
 *
 * Hypothesen:
 * - Checkbox ohne Label funktioniert nicht
 * - RadioGroup Items werden nicht gruppiert
 * - Slider Range/Thumb fehlen
 * - NumberInput increment/decrement fehlen
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

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
      console.log('Checkbox node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('checkbox')
    })

    test('Checkbox mit Label', () => {
      const ir = toIR(parse(`
Checkbox
  Label "Accept terms"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Checkbox slots:', Object.keys(ir.nodes[0]?.slots || {}))
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
      console.log('Switch node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
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
      console.log('Switch slots:', Object.keys(slots || {}))
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
      console.log('RadioGroup node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
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
      console.log('RadioGroup items:', radioGroup?.items?.length)
    })

  })

  // ============================================================
  // 4. Slider
  // ============================================================
  describe('Slider', () => {

    test('Slider wird erkannt', () => {
      const ir = toIR(parse(`Slider`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Slider node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('slider')
    })

    test('Slider Slots (Track, Range, Thumb)', () => {
      const ir = toIR(parse(`Slider`))
      const slots = ir.nodes[0]?.slots
      console.log('Slider slots:', Object.keys(slots || {}))
      expect(slots?.Track).toBeDefined()
      expect(slots?.Thumb).toBeDefined()
    })

    test('RangeSlider wird erkannt', () => {
      const ir = toIR(parse(`RangeSlider`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('RangeSlider node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
    })

  })

  // ============================================================
  // 5. NumberInput
  // ============================================================
  describe('NumberInput', () => {

    test('NumberInput wird erkannt', () => {
      const ir = toIR(parse(`NumberInput`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('NumberInput node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('numberinput')
    })

    test('NumberInput Slots', () => {
      const ir = toIR(parse(`NumberInput`))
      const slots = ir.nodes[0]?.slots
      console.log('NumberInput slots:', Object.keys(slots || {}))
    })

  })

  // ============================================================
  // 6. PinInput
  // ============================================================
  describe('PinInput', () => {

    test('PinInput wird erkannt', () => {
      const ir = toIR(parse(`PinInput`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('PinInput node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('pininput')
    })

  })

  // ============================================================
  // 7. TagsInput
  // ============================================================
  describe('TagsInput', () => {

    test('TagsInput wird erkannt', () => {
      const ir = toIR(parse(`TagsInput`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('TagsInput node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('tagsinput')
    })

  })

  // ============================================================
  // 8. RatingGroup
  // ============================================================
  describe('RatingGroup', () => {

    test('RatingGroup wird erkannt', () => {
      const ir = toIR(parse(`RatingGroup`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('RatingGroup node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('ratinggroup')
    })

  })

  // ============================================================
  // 9. SegmentedControl
  // ============================================================
  describe('SegmentedControl', () => {

    test('SegmentedControl wird erkannt', () => {
      const ir = toIR(parse(`
SegmentedControl
  Item "Day"
  Item "Week"
  Item "Month"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('SegmentedControl node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
    })

  })

  // ============================================================
  // 10. ToggleGroup
  // ============================================================
  describe('ToggleGroup', () => {

    test('ToggleGroup wird erkannt', () => {
      const ir = toIR(parse(`
ToggleGroup
  Item "Bold"
  Item "Italic"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('ToggleGroup node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('togglegroup')
    })

  })

  // ============================================================
  // 11. Kombinationen
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
      console.log('Form children count:', frame?.children?.length)
      expect(frame?.children?.length).toBe(4)
    })

  })

})
