/**
 * Zag Navigation 019: Tabs, Accordion, Collapsible, Steps, etc. kaputt machen
 *
 * Hypothesen:
 * - Tabs Trigger/Content Zuordnung geht verloren
 * - Accordion Items werden nicht gruppiert
 * - Steps ohne aktiven Step
 * - TreeView Verschachtelung kaputt
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
      console.log('Tabs node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('tabs')
    })

    test('Tabs Slots', () => {
      const ir = toIR(parse(`Tabs`))
      const slots = ir.nodes[0]?.slots
      console.log('Tabs slots:', Object.keys(slots || {}))
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
  // 2. Accordion
  // ============================================================
  describe('Accordion', () => {

    test('Accordion wird erkannt', () => {
      const ir = toIR(parse(`Accordion`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Accordion node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('accordion')
    })

    test('Accordion Slots', () => {
      const ir = toIR(parse(`Accordion`))
      const slots = ir.nodes[0]?.slots
      console.log('Accordion slots:', Object.keys(slots || {}))
      expect(slots?.Item).toBeDefined()
      expect(slots?.ItemTrigger).toBeDefined()
      expect(slots?.ItemContent).toBeDefined()
    })

  })

  // ============================================================
  // 3. Collapsible
  // ============================================================
  describe('Collapsible', () => {

    test('Collapsible wird erkannt', () => {
      const ir = toIR(parse(`Collapsible`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Collapsible node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('collapsible')
    })

    test('Collapsible Slots', () => {
      const ir = toIR(parse(`Collapsible`))
      const slots = ir.nodes[0]?.slots
      console.log('Collapsible slots:', Object.keys(slots || {}))
      expect(slots?.Trigger).toBeDefined()
      expect(slots?.Content).toBeDefined()
    })

  })

  // ============================================================
  // 4. Steps
  // ============================================================
  describe('Steps', () => {

    test('Steps wird erkannt', () => {
      const ir = toIR(parse(`Steps`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Steps node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('steps')
    })

    test('Steps Slots', () => {
      const ir = toIR(parse(`Steps`))
      const slots = ir.nodes[0]?.slots
      console.log('Steps slots:', Object.keys(slots || {}))
      expect(slots?.List).toBeDefined()
      expect(slots?.Item).toBeDefined()
    })

  })

  // ============================================================
  // 5. Pagination
  // ============================================================
  describe('Pagination', () => {

    test('Pagination wird erkannt', () => {
      const ir = toIR(parse(`Pagination`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Pagination node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('pagination')
    })

  })

  // ============================================================
  // 6. TreeView
  // ============================================================
  describe('TreeView', () => {

    test('TreeView wird erkannt', () => {
      const ir = toIR(parse(`TreeView`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('TreeView node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('treeview')
    })

    test('TreeView Slots', () => {
      const ir = toIR(parse(`TreeView`))
      const slots = ir.nodes[0]?.slots
      console.log('TreeView slots:', Object.keys(slots || {}))
      expect(slots?.Tree).toBeDefined()
      expect(slots?.Branch).toBeDefined()
    })

  })

  // ============================================================
  // 7. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Navigation-Elemente nebeneinander', () => {
      const ir = toIR(parse(`
Frame ver gap 20
  Tabs
  Accordion
  Steps
`))
      const frame = ir.nodes[0]
      console.log('Frame children:', frame?.children?.length)
      expect(frame?.children?.length).toBe(3)
    })

  })

})
