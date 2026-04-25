/**
 * Tutorial 02 - Components: BEHAVIOR Tests
 *
 * Testet:
 * - Komponenten-Definition mit :
 * - Instanziierung ohne :
 * - Property-Überschreibung
 * - Slots
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

// ============================================================
// KOMPONENTEN-DEFINITION
// ============================================================
describe('Komponenten-Definition', () => {
  it('Komponente wird korrekt instanziiert', () => {
    const { root } = renderWithRuntime(
      `
Card: pad 16, bg #1a1a1a, rad 8

Card
  Text "Card Content"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(card.style.padding).toBe('16px')
    expect(card.style.borderRadius).toBe('8px')
  })

  it('Mehrere Instanzen möglich', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12 24, bg #333, rad 8

Frame hor, gap 8
  Btn "Save"
  Btn "Cancel"
  Btn "Delete"
`,
      container
    )

    const btns = root.querySelectorAll('[data-mirror-name="Btn"]')
    expect(btns.length).toBe(3)
  })

  it('Properties werden angewendet', () => {
    const { root } = renderWithRuntime(
      `
Badge: pad 4 8, bg #2563eb, col white, rad 999, fs 12

Badge "NEW"
`,
      container
    )

    const badge = root.querySelector('[data-mirror-name="Badge"]') as HTMLElement
    expect(badge.style.borderRadius).toBe('999px')
    expect(badge.style.fontSize).toBe('12px')
  })
})

// ============================================================
// PROPERTY-ÜBERSCHREIBUNG
// ============================================================
describe('Property-Überschreibung', () => {
  it('Instanz kann Properties überschreiben', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333

Frame hor, gap 8
  Btn "Normal"
  Btn "Primary", bg #2563eb
`,
      container
    )

    const btns = root.querySelectorAll('[data-mirror-name="Btn"]')
    expect((btns[0] as HTMLElement).style.background).toMatch(/333|rgb\(51/)
    expect((btns[1] as HTMLElement).style.background).toMatch(/2563eb|rgb\(37/)
  })

  it('Text-Content kann bei Instanz gesetzt werden', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333

Btn "Click Me"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn.textContent).toContain('Click Me')
  })
})

// ============================================================
// SLOTS
// ============================================================
describe('Slots', () => {
  it('Slot-Definition und -Verwendung', () => {
    const { root } = renderWithRuntime(
      `
Card: pad 16, bg #1a1a1a, rad 8, ver, gap 12
  Header: fs 18, weight bold
  Body: col #888

Card
  Header "Title"
  Body "Description text"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()

    const header = card.querySelector('[data-mirror-name="Header"]')
    expect(header).toBeTruthy()
    expect(header?.textContent).toContain('Title')

    const body = card.querySelector('[data-mirror-name="Body"]')
    expect(body).toBeTruthy()
  })

  it('Layout mit Slots', () => {
    const { root } = renderWithRuntime(
      `
SidebarLayout: hor, w full, h full
  Sidebar: w 240, h full, bg #1a1a1a, pad 16
  Main: w full, h full, pad 24

SidebarLayout
  Sidebar
    Text "Navigation"
  Main
    Text "Content"
`,
      container
    )

    const layout = root.querySelector('[data-mirror-name="SidebarLayout"]') as HTMLElement
    expect(layout).toBeTruthy()
    expect(layout.style.flexDirection).toBe('row')

    const sidebar = layout.querySelector('[data-mirror-name="Sidebar"]')
    expect(sidebar).toBeTruthy()

    const main = layout.querySelector('[data-mirror-name="Main"]')
    expect(main).toBeTruthy()
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 02 Beispiele', () => {
  it('Beispiel: Button-Varianten', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12 24, bg #333, col white, rad 8, cursor pointer

Frame hor, gap 8
  Btn "Default"
  Btn "Primary", bg #2563eb
  Btn "Danger", bg #ef4444
`,
      container
    )

    const btns = root.querySelectorAll('[data-mirror-name="Btn"]')
    expect(btns.length).toBe(3)
  })

  it('Beispiel: Card mit Slots', () => {
    const { root } = renderWithRuntime(
      `
Card: pad 0, bg #1a1a1a, rad 12, ver, clip
  Image: w full, h 150
  Content: pad 16, ver, gap 8
    Title: fs 18, weight bold
    Description: col #888, fs 14

Card
  Image src "https://example.com/img.jpg"
  Content
    Title "Product Name"
    Description "A great product description."
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(card.style.borderRadius).toBe('12px')
  })
})

// =============================================================================
// Tutorial 02 Aspekt-Closure (Iter 2, added 2026-04-25)
// =============================================================================

describe('Tutorial 02 Aspekte: Definition without body + children at instance', () => {
  it('Card definition without body accepts children at instance level', () => {
    const { root } = renderWithRuntime(
      `Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Title"
  Text "Description"
  Button "Action"`,
      container
    )
    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    // The instance-level children must reach the DOM
    const texts = Array.from(card.querySelectorAll('span')).map(s => s.textContent)
    expect(texts).toContain('Title')
    expect(texts).toContain('Description')
    const button = card.querySelector('button')
    expect(button?.textContent).toBe('Action')
  })
})

describe('Tutorial 02 Aspekte: Komplexe Komponenten (nested children in definition)', () => {
  it('Footer with nested Frame + multiple Text children renders all of them', () => {
    const { root } = renderWithRuntime(
      `Footer: w full, pad 20, bg #0a0a0a, hor, spread
  Text "© 2024 Meine App", col #666, fs 12
  Frame hor, gap 16
    Text "Impressum", col #888, fs 12
    Text "Datenschutz", col #888, fs 12
    Text "Kontakt", col #888, fs 12

Frame
  Footer`,
      container
    )
    const footer = root.querySelector('[data-mirror-name="Footer"]') as HTMLElement
    expect(footer).toBeTruthy()
    const texts = Array.from(footer.querySelectorAll('span')).map(s => s.textContent)
    // All 4 texts (1 copyright + 3 links) must be present
    expect(texts).toContain('© 2024 Meine App')
    expect(texts).toContain('Impressum')
    expect(texts).toContain('Datenschutz')
    expect(texts).toContain('Kontakt')
  })
})

describe('Tutorial 02 Aspekte: Slots with multiple elements', () => {
  it('Content slot can hold multiple child elements at instance level', () => {
    const { root } = renderWithRuntime(
      `Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Title: fs 16, weight 500, col white
  Content: gap 8

Card
  Title "Benutzer"
  Content
    Text "Max Mustermann", col white, fs 14
    Text "max@example.com", col #888, fs 12
    Button "Profil", pad 8 16, rad 6, bg #333, col white`,
      container
    )
    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    // Title slot is rendered as a styled <div> (not <span>) — query via slot.
    const titleSlot = card.querySelector('[data-slot="Title"]') as HTMLElement
    expect(titleSlot?.textContent).toBe('Benutzer')
    // Content slot holds the multi-children
    const contentSlot = card.querySelector('[data-slot="Content"]') as HTMLElement
    expect(contentSlot).toBeTruthy()
    const contentTexts = Array.from(contentSlot.querySelectorAll('span')).map(s => s.textContent)
    expect(contentTexts).toContain('Max Mustermann')
    expect(contentTexts).toContain('max@example.com')
    const profileBtn = contentSlot.querySelector('button')
    expect(profileBtn?.textContent).toBe('Profil')
  })
})
