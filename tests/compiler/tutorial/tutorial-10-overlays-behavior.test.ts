/**
 * Tutorial 10 - Overlays: BEHAVIOR Tests
 *
 * Testet DOM-Struktur von:
 * - Dialog
 * - Tooltip
 *
 * Tutorial Set: Dialog und Tooltip
 * Entfernt: Popover, HoverCard, Toast, FloatingPanel, Tour
 *
 * Hinweis: Zag-Interaktionen (öffnen/schließen) erfordern
 * vollständige Zag-Runtime, hier nur DOM-Struktur.
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
// DIALOG
// ============================================================
describe('Dialog Struktur', () => {

  it('Dialog hat Trigger und Content Slots', () => {
    const { root } = renderWithRuntime(`
Dialog
  Trigger: Button "Open Dialog"
  Content: w 400, pad 24, bg #1a1a1a, rad 12
    Text "Dialog Content"
`, container)

    const dialog = root.querySelector('[data-zag-component="dialog"]')
    expect(dialog).toBeTruthy()

    const trigger = root.querySelector('[data-slot="Trigger"]')
    expect(trigger).toBeTruthy()
  })

  it('Dialog mit Backdrop', () => {
    const { root } = renderWithRuntime(`
Dialog
  Trigger: Button "Open"
  Backdrop: bg rgba(0,0,0,0.5)
  Content: w 400, pad 24, bg #1a1a1a
    Text "Content"
`, container)

    const dialog = root.querySelector('[data-zag-component="dialog"]')
    expect(dialog).toBeTruthy()
  })

  it('Dialog mit CloseTrigger', () => {
    const { root } = renderWithRuntime(`
Dialog
  Trigger: Button "Open"
  Content: w 400
    Frame hor, spread
      Text "Title" weight bold
      CloseTrigger: Button "×"
    Text "Body content"
`, container)

    const dialog = root.querySelector('[data-zag-component="dialog"]')
    expect(dialog).toBeTruthy()
  })
})

// ============================================================
// TOOLTIP
// ============================================================
describe('Tooltip Struktur', () => {

  it('Tooltip hat Trigger und Content', () => {
    const { root } = renderWithRuntime(`
Tooltip
  Trigger: Button "Hover me"
  Content: pad 8 12, bg #333, rad 4
    Text "Tooltip text"
`, container)

    const tooltip = root.querySelector('[data-zag-component="tooltip"]')
    expect(tooltip).toBeTruthy()

    const trigger = root.querySelector('[data-slot="Trigger"]')
    expect(trigger).toBeTruthy()
  })

  it('Tooltip mit positioning', () => {
    const { root } = renderWithRuntime(`
Tooltip positioning "top"
  Trigger: Icon "info"
  Content: Text "Info tooltip"
`, container)

    const tooltip = root.querySelector('[data-zag-component="tooltip"]')
    expect(tooltip).toBeTruthy()
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 10 Beispiele', () => {

  it('Beispiel: Confirmation Dialog', () => {
    const { root } = renderWithRuntime(`
Dialog
  Trigger: Button "Delete", bg #ef4444
  Backdrop: bg rgba(0,0,0,0.5)
  Content: w 400, pad 24, bg #1a1a1a, rad 12
    Text "Confirm Delete" weight bold, fs 18
    Text "Are you sure?" col #888
    Frame hor, gap 8, spread
      CloseTrigger: Button "Cancel"
      Button "Delete", bg #ef4444
`, container)

    const dialog = root.querySelector('[data-zag-component="dialog"]')
    expect(dialog).toBeTruthy()
  })

  it('Beispiel: Info Tooltip', () => {
    const { root } = renderWithRuntime(`
Frame hor, gap 8
  Text "Password"
  Tooltip
    Trigger: Icon "info", is 16, ic #888
    Content: pad 8 12, bg #333, rad 4, maxw 200
      Text "Must be at least 8 characters", fs 12
`, container)

    const tooltip = root.querySelector('[data-zag-component="tooltip"]')
    expect(tooltip).toBeTruthy()
  })
})
