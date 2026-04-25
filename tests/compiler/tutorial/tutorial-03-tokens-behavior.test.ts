/**
 * Tutorial 03 - Tokens: BEHAVIOR Tests
 *
 * Testet:
 * - Token-Definition mit Suffix
 * - Token-Verwendung als CSS Variable
 * - Vererbung mit as
 *
 * HINWEIS: Tokens werden als CSS-Variablen (var(--name)) ausgegeben,
 * nicht als aufgelöste Werte. Das ist korrektes Verhalten.
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
// TOKEN-DEFINITION & VERWENDUNG
// ============================================================
describe('Token-Definition & Verwendung', () => {
  it('Token wird als CSS Variable ausgegeben', () => {
    const { root } = renderWithRuntime(
      `
$primary.bg: #2563eb

Frame bg $primary, pad 16
  Text "Token Test"
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Tokens werden als CSS-Variablen ausgegeben
    expect(frame.style.background).toContain('var(--')
  })

  it('Mehrere Tokens werden ausgegeben', () => {
    const { root } = renderWithRuntime(
      `
$card.bg: #1a1a1a
$card.rad: 12
$card.pad: 16

Frame bg $card, rad $card, pad $card
  Text "Card"
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Alle Token-Properties werden als CSS-Vars gesetzt
    expect(frame.style.background).toContain('var(--')
    expect(frame.style.borderRadius).toContain('var(--')
    expect(frame.style.padding).toContain('var(--')
  })

  it('Hierarchische Tokens', () => {
    const { root } = renderWithRuntime(
      `
$colors.primary.bg: #2563eb
$colors.secondary.bg: #10b981

Frame hor, gap 8
  Frame pad 16, bg $colors.primary
  Frame pad 16, bg $colors.secondary
`,
      container
    )

    const frames = root.querySelectorAll('[data-mirror-name="Frame"] > [data-mirror-name="Frame"]')
    expect(frames.length).toBe(2)
    // Hierarchische Tokens werden zu CSS-Vars mit Bindestrichen
    expect((frames[0] as HTMLElement).style.background).toContain('var(--')
  })
})

// ============================================================
// VERERBUNG (as)
// ============================================================
describe('Vererbung (as)', () => {
  it('as erbt Properties', () => {
    const { root } = renderWithRuntime(
      `
BaseCard: pad 16, bg #1a1a1a, rad 8
ClickableCard as BaseCard: cursor pointer

ClickableCard
  Text "Click me"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="ClickableCard"]') as HTMLElement
    expect(card.style.padding).toBe('16px')
    expect(card.style.borderRadius).toBe('8px')
    expect(card.style.cursor).toBe('pointer')
  })

  it('Kind überschreibt Parent-Properties', () => {
    const { root } = renderWithRuntime(
      `
BaseBtn: pad 12, bg #333, rad 4
PrimaryBtn as BaseBtn: bg #2563eb

PrimaryBtn "Primary"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="PrimaryBtn"]') as HTMLElement
    // Background wird überschrieben (Hex oder RGB)
    expect(btn.style.background).toMatch(/2563eb|rgb\(37,\s*99,\s*235\)/)
    expect(btn.style.padding).toBe('12px') // von BaseBtn
  })

  it('Mehrstufige Vererbung', () => {
    const { root } = renderWithRuntime(
      `
Base: pad 8
Level1 as Base: pad 16
Level2 as Level1: pad 24

Level2
  Text "Deep"
`,
      container
    )

    const el = root.querySelector('[data-mirror-name="Level2"]') as HTMLElement
    expect(el.style.padding).toBe('24px')
  })
})

// ============================================================
// TOKENS MIT VERERBUNG
// ============================================================
describe('Tokens mit Vererbung', () => {
  it('Token in vererbter Komponente wird als CSS Var ausgegeben', () => {
    const { root } = renderWithRuntime(
      `
$accent.bg: #2563eb

BaseCard: pad 16, bg #1a1a1a, rad 8
AccentCard as BaseCard: bg $accent

AccentCard
  Text "Accent"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="AccentCard"]') as HTMLElement
    // Token wird als CSS-Variable ausgegeben
    expect(card.style.background).toContain('var(--')
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 03 Beispiele', () => {
  it('Beispiel: Design System Tokens als CSS Vars', () => {
    const { root } = renderWithRuntime(
      `
$space.sm.pad: 8
$space.md.pad: 16
$space.lg.pad: 24

$colors.surface.bg: #1a1a1a
$colors.primary.bg: #2563eb

Frame bg $colors.surface, pad $space.lg, rad 12
  Button "Action", bg $colors.primary, pad $space.md
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.padding).toContain('var(--')
  })

  it('Beispiel: Button-System mit Vererbung und Tokens', () => {
    const { root } = renderWithRuntime(
      `
$primary.bg: #2563eb
$danger.bg: #ef4444

BaseBtn: pad 12 24, col white, rad 8, cursor pointer
PrimaryBtn as BaseBtn: bg $primary
DangerBtn as BaseBtn: bg $danger

Frame hor, gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
`,
      container
    )

    const primary = root.querySelector('[data-mirror-name="PrimaryBtn"]') as HTMLElement
    const danger = root.querySelector('[data-mirror-name="DangerBtn"]') as HTMLElement

    // Tokens als CSS-Vars
    expect(primary.style.background).toContain('var(--')
    expect(danger.style.background).toContain('var(--')
  })
})

// =============================================================================
// Tutorial 03 Aspekt-Closure (Iter 2, added 2026-04-25)
// =============================================================================

describe('Tutorial 03 Aspekte: Property Sets (Style-Bündel)', () => {
  it('Property Set is expanded into multiple properties on the target', () => {
    const { root } = renderWithRuntime(
      `cardstyle: bg #1a1a1a, pad 16, rad 8

Frame $cardstyle
  Text "Inhalt"`,
      container
    )
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    expect(frame.style.background).toMatch(/1a1a1a|rgb\(26/)
    expect(frame.style.padding).toBe('16px')
    expect(frame.style.borderRadius).toBe('8px')
  })

  it('Property Set with layout direction expands correctly', () => {
    const { root } = renderWithRuntime(
      `centeredrow: hor, center, gap 12

Frame $centeredrow
  Text "A"
  Text "B"`,
      container
    )
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.flexDirection).toBe('row')
    expect(frame.style.gap).toBe('12px')
  })
})

describe('Tutorial 03 Aspekte: Property Set + Override on instance', () => {
  it('Frame $cardstyle with extra inline override merges (instance wins)', () => {
    const { root } = renderWithRuntime(
      `cardstyle: bg #1a1a1a, pad 16, rad 8

Frame $cardstyle, bg #f00
  Text "Override"`,
      container
    )
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // bg overridden, pad + rad still come from the property-set
    expect(frame.style.background).toMatch(/#f00|rgb\(255,\s*0,\s*0\)/i)
    expect(frame.style.padding).toBe('16px')
    expect(frame.style.borderRadius).toBe('8px')
  })
})

describe('Tutorial 03 Aspekte: Property Set kombiniert mit Tokens', () => {
  it('Property set referencing a token resolves both layers correctly', () => {
    const { root } = renderWithRuntime(
      `primary.bg: #2271C1
card.bg: #1a1a1a

primarybutton: bg $primary, col white, pad 10 20, rad 6
cardbase: bg $card, pad 16, rad 8, gap 8

Frame $cardbase
  Frame $primarybutton
    Text "Button"`,
      container
    )
    const frames = root.querySelectorAll('[data-mirror-name="Frame"]')
    const cardFrame = frames[0] as HTMLElement
    const buttonFrame = frames[1] as HTMLElement
    // Card uses $card token via the property-set
    expect(cardFrame.style.background).toMatch(/var\(--card-bg\)|#1a1a1a|rgb\(26/)
    expect(cardFrame.style.padding).toBe('16px')
    // Button uses $primary token via the property-set
    expect(buttonFrame.style.background).toMatch(/var\(--primary-bg\)|#2271c1|rgb\(34/i)
    expect(buttonFrame.style.color).toMatch(/white|rgb\(255,\s*255,\s*255\)/)
  })
})
