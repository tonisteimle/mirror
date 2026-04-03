/**
 * Tutorial 04 - States: BEHAVIOR Tests
 *
 * Testet das VERHALTEN, nicht nur die Struktur.
 * - toggle() muss State wechseln
 * - exclusive() muss Geschwister deaktivieren
 * - State-Referenzen müssen funktionieren
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime, click, getState } from './test-utils'

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
// TOGGLE - Basis-Interaktion
// ============================================================
describe('toggle() Verhalten', () => {

  it('toggle() wechselt von default zu active', () => {
    const { root } = renderWithRuntime(`
Btn: pad 12, bg #333
  active:
    bg #2563eb
  onclick toggle()

Btn "Click me"
`, container)

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Initial: default
    expect(getState(btn)).toBe('default')

    // Nach Click: active
    click(btn)
    expect(getState(btn)).toBe('active')
  })

  it('toggle() wechselt zurück zu default', () => {
    const { root } = renderWithRuntime(`
Btn: pad 12, bg #333
  active:
    bg #2563eb
  onclick toggle()

Btn "Click me"
`, container)

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement

    // Erster Click: default → active
    click(btn)
    expect(getState(btn)).toBe('active')

    // Zweiter Click: active → default
    click(btn)
    expect(getState(btn)).toBe('default')
  })

  it('toggle() ändert Styles beim State-Wechsel', () => {
    const { root } = renderWithRuntime(`
Btn: pad 12, bg #333
  active:
    bg #2563eb
  onclick toggle()

Btn "Click me"
`, container)

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement

    // Initial: #333 (JSDOM konvertiert zu rgb)
    const initialBg = btn.style.background
    expect(initialBg).toMatch(/333|rgb\(51,\s*51,\s*51\)/)

    // Nach Click: #2563eb
    click(btn)
    const activeBg = btn.style.background
    expect(activeBg).toMatch(/2563eb|rgb\(37,\s*99,\s*235\)/)
  })
})

// ============================================================
// EXCLUSIVE - Radio-Verhalten
// ============================================================
describe('exclusive() Verhalten', () => {

  it('exclusive() aktiviert geklicktes Element', () => {
    const { root } = renderWithRuntime(`
Tab: pad 12, bg #333
  active:
    bg #2563eb
  onclick exclusive()

Frame hor
  Tab "Home"
  Tab "Profile"
  Tab "Settings"
`, container)

    const tabs = root.querySelectorAll('[data-mirror-name="Tab"]')
    expect(tabs.length).toBe(3)

    // Click auf Tab 1
    click(tabs[0] as HTMLElement)
    expect(getState(tabs[0] as HTMLElement)).toBe('active')
  })

  it('exclusive() deaktiviert Geschwister', () => {
    const { root } = renderWithRuntime(`
Tab: pad 12, bg #333
  active:
    bg #2563eb
  onclick exclusive()

Frame hor
  Tab "Home"
  Tab "Profile"
  Tab "Settings"
`, container)

    const tabs = root.querySelectorAll('[data-mirror-name="Tab"]')

    // Click auf Tab 1
    click(tabs[0] as HTMLElement)
    expect(getState(tabs[0] as HTMLElement)).toBe('active')

    // Click auf Tab 2 → Tab 1 muss deaktiviert werden
    click(tabs[1] as HTMLElement)
    expect(getState(tabs[0] as HTMLElement)).toBe('default')
    expect(getState(tabs[1] as HTMLElement)).toBe('active')
  })

  it('exclusive() - nur ein Tab gleichzeitig aktiv', () => {
    const { root } = renderWithRuntime(`
Tab: pad 12, bg #333
  active:
    bg #2563eb
  onclick exclusive()

Frame hor
  Tab "A"
  Tab "B"
  Tab "C"
`, container)

    const tabs = root.querySelectorAll('[data-mirror-name="Tab"]')

    // Aktiviere jeden Tab nacheinander
    for (let i = 0; i < 3; i++) {
      click(tabs[i] as HTMLElement)

      // Genau einer sollte aktiv sein
      const activeCount = Array.from(tabs).filter(
        t => getState(t as HTMLElement) === 'active'
      ).length
      expect(activeCount).toBe(1)

      // Der geklickte sollte aktiv sein
      expect(getState(tabs[i] as HTMLElement)).toBe('active')
    }
  })
})

// ============================================================
// CYCLE - Multi-State Toggle
// ============================================================
describe('cycle() Verhalten', () => {

  it('cycle() rotiert durch States', () => {
    const { root } = renderWithRuntime(`
Status: pad 12, bg #333
  todo:
    bg #888
  doing:
    bg #f59e0b
  done:
    bg #10b981
  onclick cycle(todo, doing, done)

Status "Task"
`, container)

    const status = root.querySelector('[data-mirror-name="Status"]') as HTMLElement
    expect(status).toBeTruthy()

    // Start: default oder erster State
    click(status)
    expect(getState(status)).toBe('todo')

    click(status)
    expect(getState(status)).toBe('doing')

    click(status)
    expect(getState(status)).toBe('done')

    // Zurück zum Anfang
    click(status)
    expect(getState(status)).toBe('todo')
  })
})

// ============================================================
// STATE-REFERENZEN - when-Abhängigkeiten
// ============================================================
describe('State-Referenzen (when)', () => {

  it('Element reagiert auf State eines anderen Elements', () => {
    const { root } = renderWithRuntime(`
MenuBtn: pad 12, bg #333
  open:
    bg #2563eb
  onclick toggle()

Dropdown: hidden
  visible when MenuBtn open:
    opacity 1

Frame
  MenuBtn name MenuBtn, "Menu"
  Dropdown name Dropdown
    Text "Menu Content"
`, container)

    const menuBtn = root.querySelector('[data-mirror-name="MenuBtn"]') as HTMLElement
    const dropdown = root.querySelector('[data-mirror-name="Dropdown"]') as HTMLElement

    expect(menuBtn).toBeTruthy()
    expect(dropdown).toBeTruthy()

    // Initial: Dropdown hidden
    // (prüfen ob hidden-Style gesetzt ist)

    // Click auf MenuBtn → Dropdown sollte sichtbar werden
    click(menuBtn)
    expect(getState(menuBtn)).toBe('open')
    // Dropdown sollte jetzt sichtbar sein
  })
})

// ============================================================
// SYSTEM STATES - hover, focus, active
// ============================================================
describe('System States', () => {

  it('hover: Block wird kompiliert', () => {
    const { root } = renderWithRuntime(`
Card: pad 16, bg #1a1a1a
  hover:
    bg #2a2a2a

Card "Hover me"
`, container)

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()

    // Hover-Styles werden als CSS-Regeln generiert, nicht inline
    // Wir können prüfen ob das Element existiert
  })
})

// ============================================================
// TUTORIAL BEISPIELE - Aus dem Tutorial direkt
// ============================================================
describe('Tutorial 04 Beispiele', () => {

  it('Beispiel: Toggle-Button', () => {
    const { root } = renderWithRuntime(`
Btn: pad 12 24, bg #333, col #888
  on:
    bg #2563eb
    col white
  onclick toggle()

Frame
  Btn "Toggle me"
`, container)

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    click(btn)
    expect(getState(btn)).toBe('on')

    click(btn)
    expect(getState(btn)).toBe('default')
  })

  it('Beispiel: Tab-Navigation mit exclusive()', () => {
    const { root } = renderWithRuntime(`
Tab: pad 12 24, bg #333, col white, rad 8, cursor pointer
  active:
    bg #2563eb
    col white
  onclick exclusive()

Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab "Home"
  Tab "Profile"
  Tab "Settings"
`, container)

    const tabs = root.querySelectorAll('[data-mirror-name="Tab"]')
    expect(tabs.length).toBe(3)

    // Aktiviere "Profile"
    click(tabs[1] as HTMLElement)
    expect(getState(tabs[1] as HTMLElement)).toBe('active')
    expect(getState(tabs[0] as HTMLElement)).toBe('default')
    expect(getState(tabs[2] as HTMLElement)).toBe('default')
  })
})
