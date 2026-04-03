/**
 * Zag Overlays 018: Dialog, Tooltip, Popover, HoverCard, etc. kaputt machen
 *
 * Hypothesen:
 * - Dialog Backdrop fehlt
 * - Tooltip Positioner nicht korrekt
 * - Popover Content verliert Kinder
 * - Portal-Slots werden nicht erkannt
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Overlays', () => {

  // ============================================================
  // 1. Dialog
  // ============================================================
  describe('Dialog', () => {

    test('Dialog wird erkannt', () => {
      const ir = toIR(parse(`Dialog`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Dialog node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('dialog')
    })

    test('Dialog Slots vorhanden', () => {
      const ir = toIR(parse(`Dialog`))
      const slots = ir.nodes[0]?.slots
      console.log('Dialog slots:', Object.keys(slots || {}))
      // Dialog sollte Trigger, Backdrop, Positioner, Content haben
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Backdrop).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

    test('Dialog mit Content', () => {
      const ir = toIR(parse(`
Dialog
  Trigger
    Button "Open"
  Content
    Text "Dialog content"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

  })

  // ============================================================
  // 2. Tooltip
  // ============================================================
  describe('Tooltip', () => {

    test('Tooltip wird erkannt', () => {
      const ir = toIR(parse(`Tooltip`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Tooltip node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('tooltip')
    })

    test('Tooltip Slots', () => {
      const ir = toIR(parse(`Tooltip`))
      const slots = ir.nodes[0]?.slots
      console.log('Tooltip slots:', Object.keys(slots || {}))
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

    test('Tooltip mit Trigger und Content', () => {
      const ir = toIR(parse(`
Tooltip
  Trigger
    Button "Hover me"
  Content
    Text "Tooltip text"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

  })

  // ============================================================
  // 3. Popover
  // ============================================================
  describe('Popover', () => {

    test('Popover wird erkannt', () => {
      const ir = toIR(parse(`Popover`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Popover node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('popover')
    })

    test('Popover Slots', () => {
      const ir = toIR(parse(`Popover`))
      const slots = ir.nodes[0]?.slots
      console.log('Popover slots:', Object.keys(slots || {}))
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

  })

  // ============================================================
  // 4. HoverCard
  // ============================================================
  describe('HoverCard', () => {

    test('HoverCard wird erkannt', () => {
      const ir = toIR(parse(`HoverCard`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('HoverCard node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('hovercard')
    })

    test('HoverCard Slots', () => {
      const ir = toIR(parse(`HoverCard`))
      const slots = ir.nodes[0]?.slots
      console.log('HoverCard slots:', Object.keys(slots || {}))
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

  })

  // ============================================================
  // 5. Toast
  // ============================================================
  describe('Toast', () => {

    test('Toast wird erkannt', () => {
      const ir = toIR(parse(`Toast`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Toast node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('toast')
    })

  })

  // ============================================================
  // 6. FloatingPanel
  // ============================================================
  describe('FloatingPanel', () => {

    test('FloatingPanel wird erkannt', () => {
      const ir = toIR(parse(`FloatingPanel`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('FloatingPanel node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('floatingpanel')
    })

  })

  // ============================================================
  // 7. Tour
  // ============================================================
  describe('Tour', () => {

    test('Tour wird erkannt', () => {
      const ir = toIR(parse(`Tour`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Tour node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('tour')
    })

  })

  // ============================================================
  // 8. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Mehrere Overlays mit Slots in Frame', () => {
      // FIX: Slots erfordern Doppelpunkt nach dem Slot-Namen (Trigger:)
      const ir = toIR(parse(`
Frame hor gap 10
  Tooltip
    Trigger:
      Button "T1"
  Popover
    Trigger:
      Button "P1"
  Dialog
    Trigger:
      Button "D1"
`))
      const frame = ir.nodes[0]
      console.log('Frame children:', frame?.children?.length)
      expect(frame?.children?.length).toBe(3)
    })

    test('Mehrere Overlays ohne Slots in Frame', () => {
      // Test ohne explizite Slots
      const ir = toIR(parse(`
Frame hor gap 10
  Tooltip
  Popover
  Dialog
`))
      const frame = ir.nodes[0]
      console.log('Frame children (no slots):', frame?.children?.length)
      expect(frame?.children?.length).toBe(3)
    })

  })

})
