/**
 * Zag Overlays 018: Dialog, Tooltip
 *
 * Tutorial Set - nur diese 2 Overlay-Komponenten werden unterstützt
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
      expect(ir.nodes[0]?.zagType).toBe('dialog')
    })

    test('Dialog Slots vorhanden', () => {
      const ir = toIR(parse(`Dialog`))
      const slots = ir.nodes[0]?.slots
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
      expect(ir.nodes[0]?.zagType).toBe('tooltip')
    })

    test('Tooltip Slots', () => {
      const ir = toIR(parse(`Tooltip`))
      const slots = ir.nodes[0]?.slots
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
  // 3. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Mehrere Overlays mit Slots in Frame', () => {
      // FIX: Slots erfordern Doppelpunkt nach dem Slot-Namen (Trigger:)
      const ir = toIR(parse(`
Frame hor gap 10
  Tooltip
    Trigger:
      Button "T1"
  Dialog
    Trigger:
      Button "D1"
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

    test('Mehrere Overlays ohne Slots in Frame', () => {
      // Test ohne explizite Slots
      const ir = toIR(parse(`
Frame hor gap 10
  Tooltip
  Dialog
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

  })

})
