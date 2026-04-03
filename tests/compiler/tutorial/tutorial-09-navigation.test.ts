/**
 * Tutorial 09 - Navigation: HTML Output Tests
 *
 * Prüft dass die Navigation-Komponenten (Tabs, Accordion, Collapsible)
 * korrekte DOM-Strukturen erzeugen.
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

  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()

  container.appendChild(ui.root)
  return ui.root as HTMLElement
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
// ACCORDION
// ============================================================
describe('Accordion Component', () => {

  it('renders basic accordion structure', () => {
    const root = render(`
Accordion
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
`)
    const accordion = root.querySelector('[data-zag-component="accordion"]')
    expect(accordion).toBeTruthy()
  })

  it('renders correct number of items', () => {
    const root = render(`
Accordion
  AccordionItem "Item 1"
    Text "Content 1"
  AccordionItem "Item 2"
    Text "Content 2"
  AccordionItem "Item 3"
    Text "Content 3"
`)
    const items = root.querySelectorAll('[data-slot="Item"]')
    expect(items.length).toBe(3)
  })

  it('each item has trigger and content', () => {
    const root = render(`
Accordion
  AccordionItem "Test Section"
    Text "Test content"
`)
    const trigger = root.querySelector('[data-slot="ItemTrigger"]')
    const content = root.querySelector('[data-slot="ItemContent"]')
    expect(trigger).toBeTruthy()
    expect(content).toBeTruthy()
  })

  it('supports multiple prop', () => {
    const root = render(`
Accordion multiple
  AccordionItem "Section A"
    Text "Content A"
  AccordionItem "Section B"
    Text "Content B"
`)
    const accordion = root.querySelector('[data-zag-component="accordion"]') as any
    expect(accordion).toBeTruthy()
    expect(accordion._zagConfig?.machineConfig?.multiple).toBe(true)
  })

  it('supports icon prop', () => {
    const root = render(`
Accordion icon "plus"
  AccordionItem "FAQ Item"
    Text "Answer here"
`)
    const accordion = root.querySelector('[data-zag-component="accordion"]')
    expect(accordion).toBeTruthy()
    // Icon prop wird akzeptiert und kompiliert - Details prüft der Compilation-Test
  })
})

// ============================================================
// COLLAPSIBLE
// ============================================================
describe('Collapsible Component', () => {

  it('renders basic collapsible structure', () => {
    const root = render(`
Collapsible
  Trigger: Button "Toggle content"
  Content: Text "Hidden content revealed."
`)
    const collapsible = root.querySelector('[data-zag-component="collapsible"]')
    expect(collapsible).toBeTruthy()
  })

  it('has trigger and content parts', () => {
    const root = render(`
Collapsible
  Trigger: Button "Click me"
  Content: Text "Collapsible content"
`)
    const trigger = root.querySelector('[data-slot="Trigger"]')
    const content = root.querySelector('[data-slot="Content"]')
    expect(trigger).toBeTruthy()
    expect(content).toBeTruthy()
  })

  it('supports defaultOpen prop', () => {
    const root = render(`
Collapsible defaultOpen
  Trigger: Button "Toggle"
  Content: Text "Initially open content"
`)
    const collapsible = root.querySelector('[data-zag-component="collapsible"]')
    expect(collapsible).toBeTruthy()
    // defaultOpen prop wird akzeptiert und kompiliert - Details prüft der Compilation-Test
  })

  it('trigger can be styled', () => {
    const root = render(`
Collapsible
  Trigger: Frame hor, spread, pad 12, bg #1a1a1a, rad 8, cursor pointer
    Text "Filter" weight 500
    Icon "chevron-down"
  Content: Frame ver, gap 8, pad 12
    Text "Filter options here"
`)
    const trigger = root.querySelector('[data-slot="Trigger"]')
    expect(trigger).toBeTruthy()
  })
})

// ============================================================
// PRACTICAL EXAMPLES (from tutorial)
// ============================================================
describe('Practical Examples', () => {

  it('FAQ accordion with styled items compiles and renders', () => {
    const root = render(`
Accordion
  Item: bor 0 0 1 0, boc #222
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "What is Mirror?"
    Text "A DSL for rapid UI prototyping."
  AccordionItem "How do I get started?"
    Text "Install via npm and start writing."
`)
    const accordion = root.querySelector('[data-zag-component="accordion"]')
    expect(accordion).toBeTruthy()

    const items = root.querySelectorAll('[data-slot="Item"]')
    expect(items.length).toBe(2)
  })

  it('settings panel with collapsible sections compiles', () => {
    const root = render(`
Frame ver, w 350, pad 16, bg #111, rad 8, gap 12
  Text "Settings" weight bold, fs 18
  Collapsible defaultOpen
    Trigger: Frame hor, spread, cursor pointer
      Text "General" weight 500
      Icon "chevron-down"
    Content: Frame ver, gap 8, pad 8 0
      Frame hor, spread
        Text "Dark mode" fs 14
        Switch
`)
    // Frame mit Settings sollte existieren
    const settingsFrame = root.querySelector('div')
    expect(settingsFrame).toBeTruthy()

    // Collapsible sollte existieren
    const collapsible = root.querySelector('[data-zag-component="collapsible"]')
    expect(collapsible).toBeTruthy()
  })
})
