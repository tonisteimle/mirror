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
    const { root } = renderWithRuntime(`
$primary.bg: #2563eb

Frame bg $primary, pad 16
  Text "Token Test"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Tokens werden als CSS-Variablen ausgegeben
    expect(frame.style.background).toContain('var(--')
  })

  it('Mehrere Tokens werden ausgegeben', () => {
    const { root } = renderWithRuntime(`
$card.bg: #1a1a1a
$card.rad: 12
$card.pad: 16

Frame bg $card, rad $card, pad $card
  Text "Card"
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Alle Token-Properties werden als CSS-Vars gesetzt
    expect(frame.style.background).toContain('var(--')
    expect(frame.style.borderRadius).toContain('var(--')
    expect(frame.style.padding).toContain('var(--')
  })

  it('Hierarchische Tokens', () => {
    const { root } = renderWithRuntime(`
$colors.primary.bg: #2563eb
$colors.secondary.bg: #10b981

Frame hor, gap 8
  Frame pad 16, bg $colors.primary
  Frame pad 16, bg $colors.secondary
`, container)

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
    const { root } = renderWithRuntime(`
BaseCard: pad 16, bg #1a1a1a, rad 8
ClickableCard as BaseCard: cursor pointer

ClickableCard
  Text "Click me"
`, container)

    const card = root.querySelector('[data-mirror-name="ClickableCard"]') as HTMLElement
    expect(card.style.padding).toBe('16px')
    expect(card.style.borderRadius).toBe('8px')
    expect(card.style.cursor).toBe('pointer')
  })

  it('Kind überschreibt Parent-Properties', () => {
    const { root } = renderWithRuntime(`
BaseBtn: pad 12, bg #333, rad 4
PrimaryBtn as BaseBtn: bg #2563eb

PrimaryBtn "Primary"
`, container)

    const btn = root.querySelector('[data-mirror-name="PrimaryBtn"]') as HTMLElement
    // Background wird überschrieben (Hex oder RGB)
    expect(btn.style.background).toMatch(/2563eb|rgb\(37,\s*99,\s*235\)/)
    expect(btn.style.padding).toBe('12px')  // von BaseBtn
  })

  it('Mehrstufige Vererbung', () => {
    const { root } = renderWithRuntime(`
Base: pad 8
Level1 as Base: pad 16
Level2 as Level1: pad 24

Level2
  Text "Deep"
`, container)

    const el = root.querySelector('[data-mirror-name="Level2"]') as HTMLElement
    expect(el.style.padding).toBe('24px')
  })
})

// ============================================================
// TOKENS MIT VERERBUNG
// ============================================================
describe('Tokens mit Vererbung', () => {

  it('Token in vererbter Komponente wird als CSS Var ausgegeben', () => {
    const { root } = renderWithRuntime(`
$accent.bg: #2563eb

BaseCard: pad 16, bg #1a1a1a, rad 8
AccentCard as BaseCard: bg $accent

AccentCard
  Text "Accent"
`, container)

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
    const { root } = renderWithRuntime(`
$space.sm.pad: 8
$space.md.pad: 16
$space.lg.pad: 24

$colors.surface.bg: #1a1a1a
$colors.primary.bg: #2563eb

Frame bg $colors.surface, pad $space.lg, rad 12
  Button "Action", bg $colors.primary, pad $space.md
`, container)

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame.style.padding).toContain('var(--')
  })

  it('Beispiel: Button-System mit Vererbung und Tokens', () => {
    const { root } = renderWithRuntime(`
$primary.bg: #2563eb
$danger.bg: #ef4444

BaseBtn: pad 12 24, col white, rad 8, cursor pointer
PrimaryBtn as BaseBtn: bg $primary
DangerBtn as BaseBtn: bg $danger

Frame hor, gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
`, container)

    const primary = root.querySelector('[data-mirror-name="PrimaryBtn"]') as HTMLElement
    const danger = root.querySelector('[data-mirror-name="DangerBtn"]') as HTMLElement

    // Tokens als CSS-Vars
    expect(primary.style.background).toContain('var(--')
    expect(danger.style.background).toContain('var(--')
  })
})
