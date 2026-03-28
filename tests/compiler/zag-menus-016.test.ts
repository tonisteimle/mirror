/**
 * Zag Menus 016: Menu, ContextMenu, NestedMenu, NavigationMenu kaputt machen
 *
 * Hypothesen:
 * - Menu Items werden nicht als Kinder erkannt
 * - ContextMenu Trigger funktioniert nicht
 * - NestedMenu Verschachtelung geht verloren
 * - NavigationMenu Submenus werden ignoriert
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Zag Menus', () => {

  function getStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // 1. Menu Basis
  // ============================================================
  describe('Menu', () => {

    test('Menu wird erkannt', () => {
      const ir = toIR(parse(`
Menu
  Item "Edit"
  Item "Copy"
  Item "Delete"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Menu node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('menu')
    })

    test('Menu in Frame', () => {
      const ir = toIR(parse(`
Frame hor gap 10
  Button "Actions"
  Menu
    Item "Edit"
    Item "Delete"
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

  })

  // ============================================================
  // 2. ContextMenu
  // ============================================================
  describe('ContextMenu', () => {

    test('ContextMenu wird erkannt', () => {
      const ir = toIR(parse(`
ContextMenu
  Item "Cut"
  Item "Copy"
  Item "Paste"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('ContextMenu node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
    })

    test('ContextMenu mit Trigger', () => {
      const ir = toIR(parse(`
ContextMenu
  Trigger
    Frame w 200 h 200 bg #eee
  Content
    Item "Cut"
    Item "Copy"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('ContextMenu with trigger:', ir.nodes[0])
    })

  })

  // ============================================================
  // 3. NestedMenu (Submenus)
  // ============================================================
  describe('NestedMenu', () => {

    test('NestedMenu wird erkannt', () => {
      const ir = toIR(parse(`
NestedMenu
  Item "File"
  Item "Edit"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('NestedMenu node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
    })

  })

  // ============================================================
  // 4. NavigationMenu
  // ============================================================
  describe('NavigationMenu', () => {

    test('NavigationMenu wird erkannt', () => {
      const ir = toIR(parse(`
NavigationMenu
  Item "Home"
  Item "Products"
  Item "About"
`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('NavigationMenu node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
    })

  })

  // ============================================================
  // 5. Menu Edge Cases
  // ============================================================
  describe('Edge Cases', () => {

    test('Leeres Menu', () => {
      const ir = toIR(parse(`Menu`))
      expect(ir.nodes.length).toBe(1)
    })

    test('Menu mit einem Item', () => {
      const ir = toIR(parse(`
Menu
  Item "Only"
`))
      expect(ir.nodes.length).toBe(1)
    })

    test('Mehrere Menus nebeneinander', () => {
      const ir = toIR(parse(`
Frame hor
  Menu
    Item "A"
  Menu
    Item "B"
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(2)
    })

  })

})
