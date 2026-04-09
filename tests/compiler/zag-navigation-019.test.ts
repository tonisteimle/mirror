/**
 * Zag Navigation 019: Tabs, SideNav
 *
 * Tutorial Set - nur diese 2 Navigation-Komponenten werden unterstützt
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Navigation', () => {

  // ============================================================
  // 1. Tabs
  // ============================================================
  describe('Tabs', () => {

    test('Tabs wird erkannt', () => {
      const ir = toIR(parse(`Tabs`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('tabs')
    })

    test('Tabs Slots', () => {
      const ir = toIR(parse(`Tabs`))
      const slots = ir.nodes[0]?.slots
      expect(slots?.List).toBeDefined()
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

    test('Tabs mit Items', () => {
      const ir = toIR(parse(`
Tabs
  List
    Trigger "Tab 1"
    Trigger "Tab 2"
  Content
    Frame
      Text "Content 1"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
    })

  })

  // ============================================================
  // 2. SideNav
  // ============================================================
  describe('SideNav', () => {

    test('SideNav wird erkannt', () => {
      const ir = toIR(parse(`SideNav`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0]?.zagType).toBe('sidenav')
    })

    test('SideNav Slots', () => {
      const ir = toIR(parse(`SideNav`))
      const slots = ir.nodes[0]?.slots
      expect(slots?.Root).toBeDefined()
      expect(slots?.Header).toBeDefined()
      expect(slots?.Footer).toBeDefined()
    })

  })

  // ============================================================
  // 3. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Navigation-Elemente nebeneinander', () => {
      const ir = toIR(parse(`
Frame ver gap 20
  Tabs
  SideNav
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

  })

})
