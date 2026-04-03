/**
 * SideNav Component Tests
 *
 * Tests for the SideNav Zag component:
 * - NavItem with icon, badge, arrow, shows
 * - NavGroup with collapsible support
 * - Header/Footer slots
 * - Keyboard navigation
 * - Selection logic
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

describe('SideNav Component', () => {
  describe('IR Transformation', () => {
    it('transforms minimal SideNav with NavItems', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard"
  NavItem "Settings", value "settings"
`)
      const ir = toIR(ast)

      expect(ir.nodes.length).toBe(1)

      const sidenav = ir.nodes[0] as any
      expect(sidenav.isZagComponent).toBe(true)
      expect(sidenav.zagType).toBe('sidenav')
      expect(sidenav.items).toHaveLength(2)
      expect(sidenav.items[0].label).toBe('Dashboard')
      expect(sidenav.items[0].value).toBe('dashboard')
    })

    it('transforms SideNav with defaultValue', () => {
      const ast = parse(`
SideNav defaultValue "settings"
  NavItem "Dashboard", value "dashboard"
  NavItem "Settings", value "settings"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.machineConfig.defaultValue).toBe('settings')
    })

    it('transforms SideNav with collapsed mode', () => {
      const ast = parse(`
SideNav collapsed
  NavItem "Dashboard", value "dashboard", icon "home"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.machineConfig.collapsed).toBe(true)
    })

    it('transforms NavItem with icon', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard", icon "home"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].icon).toBe('home')
    })

    it('transforms NavItem with badge', () => {
      const ast = parse(`
SideNav
  NavItem "Inbox", value "inbox", badge "5"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].badge).toBe('5')
    })

    it('transforms NavItem with arrow', () => {
      const ast = parse(`
SideNav
  NavItem "Projects", value "projects", arrow
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].arrow).toBe(true)
    })

    it('transforms NavItem with shows attribute', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard", shows DashboardView
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].shows).toBe('DashboardView')
    })

    it('transforms NavItem with disabled state', () => {
      const ast = parse(`
SideNav
  NavItem "Disabled", value "disabled", disabled
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].disabled).toBe(true)
    })

    it('transforms NavGroup with items', () => {
      const ast = parse(`
SideNav
  NavGroup "Settings"
    NavItem "General", value "general"
    NavItem "Security", value "security"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items).toHaveLength(1)
      expect(sidenav.items[0].type).toBe('group')
      expect(sidenav.items[0].label).toBe('Settings')
      expect(sidenav.items[0].items).toHaveLength(2)
    })

    it('transforms collapsible NavGroup', () => {
      const ast = parse(`
SideNav
  NavGroup "Settings", collapsible
    NavItem "General", value "general"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].collapsible).toBe(true)
    })

    it('transforms collapsible NavGroup with defaultOpen', () => {
      const ast = parse(`
SideNav
  NavGroup "Settings", collapsible, defaultOpen
    NavItem "General", value "general"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      expect(sidenav.items[0].collapsible).toBe(true)
      expect(sidenav.items[0].defaultOpen).toBe(true)
    })
  })

  describe('DOM Generation', () => {
    it('generates SideNav component with data attributes', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard"
  NavItem "Settings", value "settings"
`)
      const js = generateDOM(ast)

      // Dataset properties become data-* attributes in HTML
      expect(js).toContain('zagComponent')
      expect(js).toContain('sidenav')
      expect(js).toContain("dataset.slot = 'ItemList'")
      expect(js).toContain("dataset.slot = 'Item'")
    })

    it('generates NavItem with icon slot', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard", icon "home"
`)
      const js = generateDOM(ast)

      expect(js).toContain('ItemIcon')
      expect(js).toContain('home')
    })

    it('generates NavItem with badge slot', () => {
      const ast = parse(`
SideNav
  NavItem "Inbox", value "inbox", badge "5"
`)
      const js = generateDOM(ast)

      expect(js).toContain('ItemBadge')
    })

    it('generates NavItem with arrow slot', () => {
      const ast = parse(`
SideNav
  NavItem "Projects", value "projects", arrow
`)
      const js = generateDOM(ast)

      expect(js).toContain('ItemArrow')
    })

    it('generates NavItem with shows data attribute', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard", shows DashboardView
`)
      const js = generateDOM(ast)

      // Dataset properties become data-* attributes in HTML
      expect(js).toContain('dataset.shows')
      expect(js).toContain('DashboardView')
    })

    it('generates NavGroup structure', () => {
      const ast = parse(`
SideNav
  NavGroup "Settings"
    NavItem "General", value "general"
`)
      const js = generateDOM(ast)

      expect(js).toContain('Group')
      expect(js).toContain('GroupLabel')
      expect(js).toContain('GroupContent')
    })

    it('generates collapsible NavGroup with arrow', () => {
      const ast = parse(`
SideNav
  NavGroup "Settings", collapsible
    NavItem "General", value "general"
`)
      const js = generateDOM(ast)

      expect(js).toContain('GroupArrow')
      expect(js).toContain('data-collapsible')
    })

    it('generates Header slot', () => {
      const ast = parse(`
SideNav
  Header:
    Text "Navigation"
  NavItem "Dashboard", value "dashboard"
`)
      const js = generateDOM(ast)

      expect(js).toContain('Header')
    })

    it('generates Footer slot', () => {
      const ast = parse(`
SideNav
  NavItem "Dashboard", value "dashboard"
  Footer:
    Text "Version 1.0"
`)
      const js = generateDOM(ast)

      expect(js).toContain('Footer')
    })

    it('generates SideNav with collapsed mode', () => {
      const ast = parse(`
SideNav collapsed
  NavItem "Dashboard", value "dashboard", icon "home"
`)
      const js = generateDOM(ast)

      expect(js).toContain('data-collapsed')
    })

    it('initializes SideNav runtime', () => {
      const ast = parse(`
SideNav defaultValue "dashboard"
  NavItem "Dashboard", value "dashboard"
  NavItem "Settings", value "settings"
`)
      const js = generateDOM(ast)

      expect(js).toContain('initSideNavComponent')
    })
  })

  describe('Complex Structures', () => {
    it('handles full navigation structure', () => {
      const ast = parse(`
SideNav defaultValue "dashboard"
  Header:
    Frame hor, gap 8
      Icon "menu", is 24
      Text "MyApp"

  NavItem "Dashboard", value "dashboard", icon "home"
  NavItem "Projects", value "projects", icon "folder", badge "3"

  NavGroup "Settings", collapsible, defaultOpen
    NavItem "General", value "general", icon "settings"
    NavItem "Security", value "security", icon "shield"

  Footer:
    NavItem "Logout", value "logout", icon "log-out"
`)
      const ir = toIR(ast)
      const sidenav = ir.nodes[0] as any

      // Has Header and Footer slots
      expect(sidenav.slots).toBeDefined()

      // Has 3 top-level items: Dashboard, Projects, Settings group
      // + Footer item
      expect(sidenav.items.length).toBeGreaterThanOrEqual(3)

      // Settings group has 2 items
      const settingsGroup = sidenav.items.find((i: any) => i.type === 'group')
      expect(settingsGroup).toBeDefined()
      expect(settingsGroup.items).toHaveLength(2)
    })

    it('handles view switching with shows', () => {
      const ast = parse(`
Frame hor
  SideNav defaultValue "home"
    NavItem "Home", value "home", icon "home", shows HomeView
    NavItem "Settings", value "settings", icon "settings", shows SettingsView

  Frame w full
    HomeView: Frame name HomeView
      Text "Home Content"
    SettingsView: Frame name SettingsView, hidden
      Text "Settings Content"
`)
      const ir = toIR(ast)
      const frame = ir.nodes[0]

      // Frame has 2 children: SideNav and content Frame
      expect(frame.children.length).toBe(2)

      const sidenav = frame.children[0] as any
      expect(sidenav.isZagComponent).toBe(true)
      expect(sidenav.items[0].shows).toBe('HomeView')
      expect(sidenav.items[1].shows).toBe('SettingsView')
    })
  })
})
