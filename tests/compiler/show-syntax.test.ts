/**
 * Show Syntax Tests
 *
 * Tests for the "show X" and "show X from Y" syntax for content referencing:
 * - show ViewName → local element or ViewName.mirror file
 * - show ViewName from FileName → element from FileName.mirror
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'
import type { ZagNode } from '../../compiler/parser/ast'

describe('Show Syntax', () => {

  describe('Parser: AST', () => {

    test('Tab with "show X" sets shows property', () => {
      const ast = parse(`
Tabs
  Tab "Home", show HomeView
`)
      const tabs = ast.instances[0] as ZagNode
      const tab = tabs.items[0]
      expect(tab.shows).toBe('HomeView')
      expect(tab.showsFrom).toBeUndefined()
    })

    test('Tab with "show X from Y" sets shows and showsFrom', () => {
      const ast = parse(`
Tabs
  Tab "Settings", show SettingsView from Content
`)
      const tabs = ast.instances[0] as ZagNode
      const tab = tabs.items[0]
      expect(tab.shows).toBe('SettingsView')
      expect(tab.showsFrom).toBe('Content')
    })

    test('NavItem with "show X" sets shows property', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", show DashboardView
`)
      const sidenav = ast.instances[0] as ZagNode
      const item = sidenav.items[0]
      expect(item.shows).toBe('DashboardView')
      expect(item.showsFrom).toBeUndefined()
    })

    test('NavItem with "show X from Y" sets shows and showsFrom', () => {
      const ast = parse(`
SideNav
  NavItem "Settings", show SettingsView from Pages
`)
      const sidenav = ast.instances[0] as ZagNode
      const item = sidenav.items[0]
      expect(item.shows).toBe('SettingsView')
      expect(item.showsFrom).toBe('Pages')
    })

  })

  describe('IR Transformation', () => {

    test('Tab "show X" transforms to IR item with shows', () => {
      const ir = toIR(parse(`
Tabs
  Tab "Home", show HomeView
  Tab "Settings", show SettingsView
`))
      const tabs = ir.nodes[0] as any
      expect(tabs.items[0].shows).toBe('HomeView')
      expect(tabs.items[0].showsFrom).toBeUndefined()
      expect(tabs.items[1].shows).toBe('SettingsView')
    })

    test('Tab "show X from Y" transforms to IR item with shows and showsFrom', () => {
      const ir = toIR(parse(`
Tabs
  Tab "Home", show HomeView from Content
  Tab "Settings", show SettingsView from Content
`))
      const tabs = ir.nodes[0] as any
      expect(tabs.items[0].shows).toBe('HomeView')
      expect(tabs.items[0].showsFrom).toBe('Content')
      expect(tabs.items[1].shows).toBe('SettingsView')
      expect(tabs.items[1].showsFrom).toBe('Content')
    })

    test('NavItem "show X" transforms to IR item with shows', () => {
      const ir = toIR(parse(`
SideNav
  NavItem "Dashboard", show DashboardView
`))
      const sidenav = ir.nodes[0] as any
      expect(sidenav.items[0].shows).toBe('DashboardView')
      expect(sidenav.items[0].showsFrom).toBeUndefined()
    })

    test('NavItem "show X from Y" transforms to IR item with shows and showsFrom', () => {
      const ir = toIR(parse(`
SideNav
  NavItem "Settings", show SettingsView from Pages
`))
      const sidenav = ir.nodes[0] as any
      expect(sidenav.items[0].shows).toBe('SettingsView')
      expect(sidenav.items[0].showsFrom).toBe('Pages')
    })

    test('Mixed: some tabs with show, some with inline content', () => {
      const ir = toIR(parse(`
Tabs defaultValue "inline"
  Tab "Inline"
    Text "This is inline content"
  Tab "External", show ExternalView
  Tab "From File", show SettingsView from Pages
`))
      const tabs = ir.nodes[0] as any

      // Inline tab has children, no shows
      expect(tabs.items[0].children).toBeDefined()
      expect(tabs.items[0].shows).toBeUndefined()

      // External tab has shows, no children
      expect(tabs.items[1].shows).toBe('ExternalView')
      expect(tabs.items[1].showsFrom).toBeUndefined()

      // From File tab has shows and showsFrom
      expect(tabs.items[2].shows).toBe('SettingsView')
      expect(tabs.items[2].showsFrom).toBe('Pages')
    })

  })

  describe('DOM Generation', () => {

    test('Tab "show X" generates data-shows attribute', () => {
      const js = generateDOM(parse(`
Tabs
  Tab "Home", show HomeView
`))
      expect(js).toContain("dataset.shows = 'HomeView'")
      // Should not set showsFrom to a specific value
      expect(js).not.toMatch(/dataset\.showsFrom = '[A-Z]/)
    })

    test('Tab "show X from Y" generates data-shows and data-shows-from', () => {
      const js = generateDOM(parse(`
Tabs
  Tab "Settings", show SettingsView from Content
`))
      expect(js).toContain("dataset.shows = 'SettingsView'")
      expect(js).toContain("dataset.showsFrom = 'Content'")
    })

    test('NavItem "show X" generates data-shows attribute', () => {
      const js = generateDOM(parse(`
SideNav
  NavItem "Dashboard", show DashboardView
`))
      expect(js).toContain("dataset.shows = 'DashboardView'")
      // Should not set showsFrom to a specific value
      expect(js).not.toMatch(/dataset\.showsFrom = '[A-Z]/)
    })

    test('NavItem "show X from Y" generates data-shows and data-shows-from', () => {
      const js = generateDOM(parse(`
SideNav
  NavItem "Settings", show SettingsView from Pages
`))
      expect(js).toContain("dataset.shows = 'SettingsView'")
      expect(js).toContain("dataset.showsFrom = 'Pages'")
    })

  })

  describe('Edge Cases', () => {

    test('show with PascalCase name', () => {
      const ast = parse(`
Tabs
  Tab "Test", show MyComplexViewName
`)
      const tabs = ast.instances[0] as ZagNode
      expect(tabs.items[0].shows).toBe('MyComplexViewName')
    })

    test('show from with PascalCase names', () => {
      const ast = parse(`
Tabs
  Tab "Test", show MyView from MyComponents
`)
      const tabs = ast.instances[0] as ZagNode
      const tab = tabs.items[0]
      expect(tab.shows).toBe('MyView')
      expect(tab.showsFrom).toBe('MyComponents')
    })

    test('show combined with other properties', () => {
      const ast = parse(`
Tabs
  Tab "Home", icon "home", show HomeView
`)
      const tabs = ast.instances[0] as ZagNode
      const tab = tabs.items[0]
      expect(tab.shows).toBe('HomeView')
      expect(tab.icon).toBe('home')
    })

    test('show from combined with other properties', () => {
      const ast = parse(`
SideNav
  NavItem "Settings", icon "settings", show SettingsView from Pages, badge "3"
`)
      const sidenav = ast.instances[0] as ZagNode
      const item = sidenav.items[0]
      expect(item.shows).toBe('SettingsView')
      expect(item.showsFrom).toBe('Pages')
      expect(item.icon).toBe('settings')
    })

  })

})
