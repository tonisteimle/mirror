/**
 * Compound Primitives: Shell Component Tests
 *
 * Tests for the Shell compound primitive - an app layout with
 * Header, Sidebar, Main, and Footer slots.
 */

import { describe, it, expect } from 'vitest'
import {
  isCompoundPrimitive,
  getCompoundPrimitive,
  isCompoundSlot,
  getAllCompoundSlots,
  getCompoundSlotDef,
  getParentSlot,
} from '../../src/schema/dsl'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'
import { generateDOM } from '../../src/backends/dom'

describe('Compound Primitives: Schema', () => {
  describe('isCompoundPrimitive', () => {
    it('recognizes Shell as compound primitive', () => {
      expect(isCompoundPrimitive('Shell')).toBe(true)
    })

    it('does not recognize regular primitives', () => {
      expect(isCompoundPrimitive('Frame')).toBe(false)
      expect(isCompoundPrimitive('Button')).toBe(false)
    })

    it('does not recognize Zag primitives', () => {
      expect(isCompoundPrimitive('Select')).toBe(false)
      expect(isCompoundPrimitive('Dialog')).toBe(false)
    })
  })

  describe('getCompoundPrimitive', () => {
    it('returns Shell definition', () => {
      const shell = getCompoundPrimitive('Shell')
      expect(shell).toBeDefined()
      expect(shell?.slots).toContain('Header')
      expect(shell?.slots).toContain('Sidebar')
      expect(shell?.slots).toContain('Main')
      expect(shell?.slots).toContain('Footer')
    })

    it('has nested slots defined', () => {
      const shell = getCompoundPrimitive('Shell')
      expect(shell?.nestedSlots).toBeDefined()
      expect(shell?.nestedSlots?.Header).toContain('Logo')
      expect(shell?.nestedSlots?.Header).toContain('Nav')
      expect(shell?.nestedSlots?.Header).toContain('Actions')
      expect(shell?.nestedSlots?.Sidebar).toContain('SidebarGroup')
      expect(shell?.nestedSlots?.SidebarGroup).toContain('SidebarItem')
    })

    it('has default styles', () => {
      const shell = getCompoundPrimitive('Shell')
      expect(shell?.defaultStyles?.display).toBe('grid')
      expect(shell?.defaultStyles?.height).toBe('100vh')
    })
  })

  describe('isCompoundSlot', () => {
    it('recognizes top-level slots', () => {
      expect(isCompoundSlot('Shell', 'Header')).toBe(true)
      expect(isCompoundSlot('Shell', 'Sidebar')).toBe(true)
      expect(isCompoundSlot('Shell', 'Main')).toBe(true)
      expect(isCompoundSlot('Shell', 'Footer')).toBe(true)
    })

    it('recognizes nested slots', () => {
      expect(isCompoundSlot('Shell', 'Logo')).toBe(true)
      expect(isCompoundSlot('Shell', 'Nav')).toBe(true)
      expect(isCompoundSlot('Shell', 'NavItem')).toBe(true)
      expect(isCompoundSlot('Shell', 'Actions')).toBe(true)
      expect(isCompoundSlot('Shell', 'SidebarGroup')).toBe(true)
      expect(isCompoundSlot('Shell', 'SidebarItem')).toBe(true)
    })

    it('rejects unknown slots', () => {
      expect(isCompoundSlot('Shell', 'Unknown')).toBe(false)
      expect(isCompoundSlot('Shell', 'Content')).toBe(false)
    })
  })

  describe('getAllCompoundSlots', () => {
    it('returns all slots including nested', () => {
      const slots = getAllCompoundSlots('Shell')
      expect(slots).toContain('Header')
      expect(slots).toContain('Sidebar')
      expect(slots).toContain('Main')
      expect(slots).toContain('Footer')
      expect(slots).toContain('Logo')
      expect(slots).toContain('Nav')
      expect(slots).toContain('NavItem')
      expect(slots).toContain('SidebarGroup')
      expect(slots).toContain('SidebarItem')
    })
  })

  describe('getCompoundSlotDef', () => {
    it('returns slot definition with element type', () => {
      const header = getCompoundSlotDef('Shell', 'Header')
      expect(header?.element).toBe('header')

      const sidebar = getCompoundSlotDef('Shell', 'Sidebar')
      expect(sidebar?.element).toBe('aside')

      const main = getCompoundSlotDef('Shell', 'Main')
      expect(main?.element).toBe('main')
    })

    it('returns slot definition with default styles', () => {
      const nav = getCompoundSlotDef('Shell', 'Nav')
      expect(nav?.styles?.display).toBe('flex')
      expect(nav?.styles?.gap).toBe('4px')
    })

    it('marks item containers', () => {
      const nav = getCompoundSlotDef('Shell', 'Nav')
      expect(nav?.itemContainer).toBe(true)
      expect(nav?.itemType).toBe('NavItem')

      const sidebarGroup = getCompoundSlotDef('Shell', 'SidebarGroup')
      expect(sidebarGroup?.itemContainer).toBe(true)
      expect(sidebarGroup?.itemType).toBe('SidebarItem')
    })
  })

  describe('getParentSlot', () => {
    it('returns parent for nested slots', () => {
      expect(getParentSlot('Shell', 'Logo')).toBe('Header')
      expect(getParentSlot('Shell', 'Nav')).toBe('Header')
      expect(getParentSlot('Shell', 'NavItem')).toBe('Nav')
      expect(getParentSlot('Shell', 'SidebarGroup')).toBe('Sidebar')
      expect(getParentSlot('Shell', 'SidebarItem')).toBe('SidebarGroup')
    })

    it('returns undefined for top-level slots', () => {
      expect(getParentSlot('Shell', 'Header')).toBeUndefined()
      expect(getParentSlot('Shell', 'Sidebar')).toBeUndefined()
      expect(getParentSlot('Shell', 'Main')).toBeUndefined()
    })
  })
})

describe('Compound Primitives: Shell Usage Scenarios', () => {
  it('supports minimal shell with just Main', () => {
    // Shell should work with just Main content
    const slots = getAllCompoundSlots('Shell')
    expect(slots).toContain('Main')
  })

  it('supports header with logo and nav', () => {
    // Header -> Logo, Nav -> NavItem pattern
    expect(isCompoundSlot('Shell', 'Header')).toBe(true)
    expect(isCompoundSlot('Shell', 'Logo')).toBe(true)
    expect(isCompoundSlot('Shell', 'Nav')).toBe(true)
    expect(isCompoundSlot('Shell', 'NavItem')).toBe(true)
  })

  it('supports sidebar with groups and items', () => {
    // Sidebar -> SidebarGroup -> SidebarItem pattern
    expect(isCompoundSlot('Shell', 'Sidebar')).toBe(true)
    expect(isCompoundSlot('Shell', 'SidebarGroup')).toBe(true)
    expect(isCompoundSlot('Shell', 'SidebarItem')).toBe(true)
  })
})

describe('Compound Primitives: Parser', () => {
  it('parses Shell and marks it as compound', () => {
    const code = `
Shell
  Header
    Logo "Mirror"
  Main
    Text "Content"
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    const shell = ast.instances[0]
    expect(shell.component).toBe('Shell')
    expect(shell.isCompound).toBe(true)
    expect(shell.compoundType).toBe('Shell')
  })

  it('parses Shell with all slots', () => {
    const code = `
Shell
  Header
    Logo "My App"
    Nav
      NavItem "Home"
      NavItem "About"
    Actions
      Button "Login"
  Sidebar w 280
    SidebarGroup "Menu"
      SidebarItem "Dashboard"
      SidebarItem "Settings"
  Main pad 24
    Text "Welcome"
  Footer
    Text "Copyright 2024"
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    const shell = ast.instances[0]
    expect(shell.isCompound).toBe(true)
    expect(shell.children).toHaveLength(4) // Header, Sidebar, Main, Footer
  })

  it('parses Shell slots with properties', () => {
    const code = `
Shell
  Sidebar w 240 bg #1a1a2e
    SidebarItem "Home"
  Main pad 16
    Text "Content"
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    const shell = ast.instances[0]
    const sidebar = shell.children[0]
    expect(sidebar.component).toBe('Sidebar')
    expect(sidebar.properties).toHaveLength(2) // w 240, bg #1a1a2e
  })

  it('regular components are not marked as compound', () => {
    const code = `
Frame
  Text "Hello"
`
    const ast = parse(code)
    const frame = ast.instances[0]
    expect(frame.isCompound).toBeUndefined()
    expect(frame.compoundType).toBeUndefined()
  })
})

describe('Compound Primitives: IR', () => {
  it('transforms Shell with default grid styles', () => {
    const code = `
Shell
  Header
    Logo "Mirror"
  Main
    Text "Content"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const shell = ir.nodes[0]
    expect(shell.primitive).toBe('compound')
    expect(shell.name).toBe('Shell')

    // Check default grid styles
    const displayStyle = shell.styles.find(s => s.property === 'display')
    expect(displayStyle?.value).toBe('grid')

    const heightStyle = shell.styles.find(s => s.property === 'height')
    expect(heightStyle?.value).toBe('100vh')
  })

  it('transforms slots with correct HTML elements', () => {
    const code = `
Shell
  Header
    Logo "App"
  Sidebar
    SidebarItem "Home"
  Main
    Text "Content"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const shell = ir.nodes[0]
    const header = shell.children.find(c => c.name === 'Header')
    const sidebar = shell.children.find(c => c.name === 'Sidebar')
    const main = shell.children.find(c => c.name === 'Main')

    expect(header?.tag).toBe('header')
    expect(sidebar?.tag).toBe('aside')
    expect(main?.tag).toBe('main')
  })

  it('applies slot default styles', () => {
    const code = `
Shell
  Sidebar
    SidebarItem "Dashboard"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const shell = ir.nodes[0]
    const sidebar = shell.children.find(c => c.name === 'Sidebar')

    // Sidebar should have flex-direction: column from defaults
    const flexDir = sidebar?.styles.find(s => s.property === 'flex-direction')
    expect(flexDir?.value).toBe('column')
  })

  it('user styles override default styles', () => {
    const code = `
Shell
  Sidebar w 300
    SidebarItem "Home"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const shell = ir.nodes[0]
    const sidebar = shell.children.find(c => c.name === 'Sidebar')

    // User specified w 300, should override any default width
    const widthStyle = sidebar?.styles.find(s => s.property === 'width')
    expect(widthStyle?.value).toBe('300px')
  })

  it('transforms nested slots correctly', () => {
    const code = `
Shell
  Header
    Nav
      NavItem "Home"
      NavItem "About"
`
    const ast = parse(code)
    const ir = toIR(ast)

    const shell = ir.nodes[0]
    const header = shell.children.find(c => c.name === 'Header')
    const nav = header?.children.find(c => c.name === 'Nav')

    expect(nav?.tag).toBe('nav')
    expect(nav?.children).toHaveLength(2)

    // NavItems should have correct tag
    const navItems = nav?.children.filter(c => c.name === 'NavItem')
    expect(navItems?.every(item => item.tag === 'a')).toBe(true)
  })
})

describe('Compound Primitives: Backend', () => {
  it('generates valid JavaScript for Shell', () => {
    const code = `
Shell
  Header
    Logo "Mirror"
  Main
    Text "Content"
`
    const ast = parse(code)
    const js = generateDOM(ast)

    // Should contain createElement calls for header and main
    expect(js).toContain("document.createElement('header')")
    expect(js).toContain("document.createElement('main')")
  })

  it('generates CSS Grid styles for Shell', () => {
    const code = `
Shell
  Header
    Logo "App"
  Sidebar
    SidebarItem "Home"
  Main
    Text "Content"
`
    const ast = parse(code)
    const js = generateDOM(ast)

    // Should have grid-template-areas in styles
    expect(js).toContain('grid-template-areas')
    expect(js).toContain('grid-template-columns')
  })

  it('generates semantic HTML elements for slots', () => {
    const code = `
Shell
  Header
    Nav
      NavItem "Home"
  Sidebar
    SidebarItem "Dashboard"
  Main
    Text "Welcome"
  Footer
    Text "Copyright"
`
    const ast = parse(code)
    const js = generateDOM(ast)

    // Should use semantic elements
    expect(js).toContain("document.createElement('header')")
    expect(js).toContain("document.createElement('aside')")
    expect(js).toContain("document.createElement('main')")
    expect(js).toContain("document.createElement('footer')")
    expect(js).toContain("document.createElement('nav')")
    expect(js).toContain("document.createElement('a')") // NavItem
  })

  it('applies user styles to Shell', () => {
    const code = `
Shell bg #1a1a2e
  Main
    Text "Dark theme"
`
    const ast = parse(code)
    const js = generateDOM(ast)

    // User bg color should be in output
    expect(js).toContain('#1a1a2e')
  })
})
