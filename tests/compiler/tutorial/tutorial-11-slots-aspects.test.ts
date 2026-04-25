/**
 * Tutorial Slots — Aspect Closure (Thema 11)
 *
 * Slots/Kind-Komponenten sind über mehrere Tutorial-Seiten verteilt
 * (`02-komponenten.html` als Kern, plus erwähnt in `04-layout.html`,
 * `13-overlays.html`). Die Basis-Aspekte (`Header:` / `Body:`,
 * Layout-Komposition `AppShell`-Stil, Multi-Element-Slots wie `Content`,
 * Komponenten-ohne-Body + Children bei Instanz) sind in
 * `tutorial-02-components-behavior.test.ts` schon abgedeckt.
 *
 * Diese Datei schließt die verbleibenden Aspekte:
 * - Verschachtelte Slots (`Footer:` mit eigenen `Status:`/`Action:` Slots)
 * - Praxis-Card mit allen Slot-Patterns (Definition aus `02-komponenten.html`
 *   "Praxisbeispiel: Card-Komponente")
 * - Slot mit `as Button` (Slot erbt von Primitive)
 * - Slot-Property-Override bei Instanz (`Title "X", col red`)
 * - Slots werden in Usage-Reihenfolge gerendert (nicht Definition-Reihenfolge)
 *
 * Verwendet `[data-mirror-name="..."]` statt `[data-slot="..."]`, weil das
 * `data-slot`-Attribut nicht konsistent für jeden Slot gesetzt wird (siehe
 * `it.todo` unten).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

// =============================================================================
// Verschachtelte Slots (Praxisbeispiel aus 02-komponenten.html, Lines 303-318)
// =============================================================================

describe('Tutorial Slots — Praxis-Card (verschachtelte Slots)', () => {
  it('Card with nested Footer-slot containing Status + Action sub-slots', () => {
    const { root } = renderWithRuntime(
      `Card: w 260, bg #1a1a1a, rad 12, clip
  Title: w full, pad 16, bg #252525, col white, weight 500
  Desc: w full, pad 16, col #888, fs 14
  Footer: w full, pad 12 16, bg #151515, hor, spread
    Status: col #666, fs 12
    Action: pad 8 16, rad 6, bg #2271C1, col white

Card
  Title "Neues Projekt"
  Desc "Erstelle ein neues Projekt."
  Footer
    Status "Schritt 1/3"
    Action "Weiter"`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()

    // All 4 top-level slots are present
    expect(card.querySelector('[data-mirror-name="Title"]')?.textContent).toBe('Neues Projekt')
    expect(card.querySelector('[data-mirror-name="Desc"]')?.textContent).toBe(
      'Erstelle ein neues Projekt.'
    )

    const footer = card.querySelector('[data-mirror-name="Footer"]') as HTMLElement
    expect(footer).toBeTruthy()

    // Sub-slots are inside Footer
    const status = footer.querySelector('[data-mirror-name="Status"]') as HTMLElement
    const action = footer.querySelector('[data-mirror-name="Action"]') as HTMLElement
    expect(status?.textContent).toBe('Schritt 1/3')
    expect(action?.textContent).toBe('Weiter')
  })

  it('data-slot attribute is consistent across all named slot definitions', () => {
    const { root } = renderWithRuntime(
      `Card: w 260, bg #1a1a1a, rad 12
  Title: w full, pad 16, col white
  Desc: w full, pad 16, col #888
  Footer: w full, pad 12 16, hor
    Status: col #666
    Action: pad 8 16, bg #2271C1

Card
  Title "T"
  Desc "D"
  Footer
    Status "S"
    Action "A"`,
      container
    )
    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    // Every slot-defined component gets data-slot
    expect(card.querySelector('[data-slot="Title"]')?.textContent).toBe('T')
    expect(card.querySelector('[data-slot="Desc"]')?.textContent).toBe('D')
    expect(card.querySelector('[data-slot="Footer"]')).toBeTruthy()
    // Sub-slots inside Footer also get data-slot
    expect(card.querySelector('[data-slot="Status"]')?.textContent).toBe('S')
    expect(card.querySelector('[data-slot="Action"]')?.textContent).toBe('A')
  })
})

// =============================================================================
// Slot-Property-Override bei Instanz
// =============================================================================

describe('Tutorial Slots — Property-Override bei Instanz', () => {
  it('Slot styles can be overridden at instance level', () => {
    const { root } = renderWithRuntime(
      `Card: pad 16, bg #1a1a1a, rad 8
  Title: fs 16, weight 500, col white

Card
  Title "Default"
Card
  Title "Override", col #ef4444`,
      container
    )

    const titles = root.querySelectorAll('[data-mirror-name="Title"]') as NodeListOf<HTMLElement>
    expect(titles.length).toBe(2)
    expect(titles[0].textContent).toBe('Default')
    expect(titles[1].textContent).toBe('Override')
    // Override turns the color into a red shade
    expect(titles[1].style.color).toMatch(/#ef4444|rgb\(239/i)
  })
})

// =============================================================================
// AppShell-Pattern (aus 02-komponenten.html "Layouts")
// =============================================================================

describe('Tutorial Slots — AppShell-Pattern', () => {
  it('AppShell with Sidebar+Main slots and nested children in each slot', () => {
    const { root } = renderWithRuntime(
      `AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18`,
      container
    )

    const shell = root.querySelector('[data-mirror-name="AppShell"]') as HTMLElement
    expect(shell).toBeTruthy()
    expect(shell.style.flexDirection).toBe('row')

    const sidebar = shell.querySelector('[data-mirror-name="Sidebar"]') as HTMLElement
    expect(sidebar).toBeTruthy()
    const sidebarTexts = Array.from(sidebar.querySelectorAll('span')).map(s => s.textContent)
    expect(sidebarTexts).toContain('Navigation')
    expect(sidebarTexts).toContain('Dashboard')
    expect(sidebarTexts).toContain('Settings')

    const main = shell.querySelector('[data-mirror-name="Main"]') as HTMLElement
    expect(main).toBeTruthy()
    const mainTexts = Array.from(main.querySelectorAll('span')).map(s => s.textContent)
    expect(mainTexts).toContain('Hauptinhalt')
  })
})

// =============================================================================
// Slot-Reihenfolge: Slots erscheinen in Usage-Order
// =============================================================================

describe('Tutorial Slots — Slot-Reihenfolge', () => {
  it('slots are rendered in usage order, not definition order', () => {
    // Reverse usage order: Desc first, Title second.
    // Both should be filled, AND they should appear in usage order in the DOM.
    const { root } = renderWithRuntime(
      `Card: pad 12, bg #222, gap 4
  Title: fs 16, col white
  Desc: col #888, fs 13

Card
  Desc "DescFirst"
  Title "TitleSecond"`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()

    // Both slots filled
    expect(card.querySelector('[data-mirror-name="Title"]')?.textContent).toBe('TitleSecond')
    expect(card.querySelector('[data-mirror-name="Desc"]')?.textContent).toBe('DescFirst')

    // Order in DOM follows usage order: Desc first, then Title
    const slots = Array.from(card.children) as HTMLElement[]
    expect(slots[0].dataset.mirrorName).toBe('Desc')
    expect(slots[1].dataset.mirrorName).toBe('Title')
  })
})

// =============================================================================
// Slot mit "as" — slot inherits behavior from primitive
// =============================================================================

describe('Tutorial Slots — Slot als Component-Variation (`as`)', () => {
  it('a slot defined as a Button primitive renders <button>', () => {
    const { root } = renderWithRuntime(
      `Card: pad 12, bg #1a1a1a
  Action as Button: pad 8 16, rad 6, bg #2271C1, col white

Card
  Action "OK"`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    const btn = card.querySelector('button') as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.textContent).toBe('OK')
  })
})
