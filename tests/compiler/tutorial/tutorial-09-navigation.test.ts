/**
 * Tutorial 09 - Navigation: HTML Output Tests
 *
 * Prüft dass die Navigation-Komponenten (Tabs, SideNav)
 * korrekte DOM-Strukturen erzeugen.
 *
 * Tutorial Set: Tabs und SideNav
 * Entfernt: Accordion, Collapsible, Steps, Pagination, TreeView
 *
 * Selectors:
 * - [data-zag-component="X"] für Komponenten-Root
 * - [data-slot="X"] für Slot-Elemente
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../../compiler/parser'
import { generateDOM } from '../../../compiler/backends/dom'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

/**
 * Rendert Mirror-Code und gibt das Root-Element zurück
 */
function render(code: string): HTMLElement {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }

  let domCode = generateDOM(ast)
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  // Note: createUI() returns the root element directly, not an object with { root }
  const fn = new Function(domCode + '\nreturn createUI();')
  const root = fn() as HTMLElement

  container.appendChild(root)
  return root
}

// ============================================================
// TABS
// ============================================================
describe('Tabs Component', () => {

  it('renders basic tabs structure', () => {
    const root = render(`
Tabs defaultValue "home"
  Tab "Home" value "home"
    Text "Welcome to the home page"
  Tab "Profile" value "profile"
    Text "Your profile settings"
`)
    // Tabs container sollte existieren
    const tabs = root.querySelector('[data-zag-component="tabs"]')
    expect(tabs).toBeTruthy()
  })

  it('renders correct number of tab triggers', () => {
    const root = render(`
Tabs defaultValue "a"
  Tab "First" value "a"
    Text "Content A"
  Tab "Second" value "b"
    Text "Content B"
  Tab "Third" value "c"
    Text "Content C"
`)
    const triggers = root.querySelectorAll('[data-slot="Trigger"]')
    expect(triggers.length).toBe(3)
  })

  it('renders tab content panels', () => {
    const root = render(`
Tabs defaultValue "home"
  Tab "Home" value "home"
    Text "Home content"
  Tab "About" value "about"
    Text "About content"
`)
    const contents = root.querySelectorAll('[data-slot="Content"]')
    expect(contents.length).toBe(2)
  })

  it('vertical orientation stored in config', () => {
    const root = render(`
Tabs orientation "vertical", defaultValue "a"
  Tab "Tab A" value "a"
    Text "Content A"
  Tab "Tab B" value "b"
    Text "Content B"
`)
    const tabs = root.querySelector('[data-zag-component="tabs"]') as any
    expect(tabs).toBeTruthy()
    // Orientation wird in _zagConfig gespeichert
    expect(tabs._zagConfig?.machineConfig?.orientation).toBe('vertical')
  })

  it('supports List slot for styling', () => {
    const root = render(`
Tabs defaultValue "a"
  List: bg #1a1a1a, pad 4, rad 8
  Tab "Dashboard" value "a"
    Text "Dashboard content"
  Tab "Settings" value "b"
    Text "Settings content"
`)
    const list = root.querySelector('[data-slot="List"]')
    expect(list).toBeTruthy()
  })

  it('supports Indicator slot', () => {
    const root = render(`
Tabs defaultValue "a"
  Indicator: bg #4f46e5, rad 6
  Tab "Tab A" value "a"
    Text "Content A"
  Tab "Tab B" value "b"
    Text "Content B"
`)
    const indicator = root.querySelector('[data-slot="Indicator"]')
    expect(indicator).toBeTruthy()
  })
})

// ============================================================
// SIDENAV
// ============================================================
describe('SideNav Component', () => {

  it('renders basic sidenav structure', () => {
    const root = render(`
SideNav defaultValue "home"
  NavItem "Home" icon "home" value "home"
  NavItem "Settings" icon "settings" value "settings"
`)
    const sidenav = root.querySelector('[data-zag-component="sidenav"]')
    expect(sidenav).toBeTruthy()
  })

  it('renders nav items', () => {
    const root = render(`
SideNav defaultValue "home"
  NavItem "Home" icon "home" value "home"
  NavItem "Profile" icon "user" value "profile"
  NavItem "Settings" icon "settings" value "settings"
`)
    const items = root.querySelectorAll('[data-slot="Item"]')
    expect(items.length).toBe(3)
  })
})

// ============================================================
// PRACTICAL EXAMPLES (from tutorial)
// ============================================================
describe('Practical Examples', () => {

  it('Tabs with styled List compiles', () => {
    const root = render(`
Tabs defaultValue "dashboard"
  List: bg #1a1a1a, pad 4, rad 8
  Indicator: bg #4f46e5, rad 6
  Tab "Dashboard" value "dashboard"
    Text "Dashboard content"
  Tab "Settings" value "settings"
    Text "Settings content"
`)
    const tabs = root.querySelector('[data-zag-component="tabs"]')
    expect(tabs).toBeTruthy()

    const list = root.querySelector('[data-slot="List"]')
    expect(list).toBeTruthy()
  })
})
