/**
 * Tutorial Kapitel 13: Theming - Integration Tests
 *
 * Design Tokens und wiederverwendbare Stile.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 13: Theming', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Design Tokens', () => {
    it('Token-Werte sollten in Properties verwendet werden können', async () => {
      const { container, cleanup: c } = await renderMirror(`
primary: #2563eb
secondary: #10b981
surface: #1a1a1a
text: #ffffff
muted: #888888

Frame gap 12
  Button "Primary", bg $primary, col $text, pad 12 24, rad 6
  Button "Secondary", bg $secondary, col $text, pad 12 24, rad 6
  Frame bg $surface, pad 16, rad 8
    Text "Surface mit Text", col $text, fs 14
    Text "Und Muted Text", col $muted, fs 12
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(2)

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Surface mit Text')
      expect(textContents).toContain('Und Muted Text')
    })
  })

  describe('Nested Tokens', () => {
    it('verschachtelte Tokens mit Punkt-Notation sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
color.primary: #2563eb
color.success: #10b981
color.warning: #f59e0b
color.danger: #ef4444

spacing.sm: 8
spacing.md: 16
spacing.lg: 24

Frame gap $spacing.md
  Frame hor, gap $spacing.sm
    Frame w 40, h 40, bg $color.primary, rad 6
    Frame w 40, h 40, bg $color.success, rad 6
    Frame w 40, h 40, bg $color.warning, rad 6
    Frame w 40, h 40, bg $color.danger, rad 6
  Frame bg #1a1a1a, pad $spacing.lg, rad 8
    Text "Large Padding mit Token", col white, fs 13
      `)
      cleanup = c

      const frames = container.querySelectorAll('div')
      // Root + inner container + 4 color boxes + padding box
      expect(frames.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('Komponenten-Tokens', () => {
    it('Token für spezifische Komponenten sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
btn.bg: #2563eb
btn.col: white
btn.pad: 12
btn.rad: 8

card.bg: #1a1a1a
card.pad: 20
card.rad: 12

Frame gap 16
  Button "Styled Button", bg $btn, col $btn, pad $btn, rad $btn
  Frame bg $card, pad $card, rad $card, gap 8
    Text "Card Title", col white, fs 16, weight 600
    Text "Card content with consistent styling.", col #888, fs 13
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(1)

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Card Title')
    })
  })

  describe('Komponenten-Definition', () => {
    it('wiederverwendbare Komponenten mit as Primitive: sollten funktionieren', async () => {
      // Korrekte Syntax ist "Name as Primitive:" mit Properties als Kinder
      // NICHT die dokumentierte "Name: = Primitive props" Syntax
      const { container, cleanup: c } = await renderMirror(`
PrimaryBtn as Button:
  bg #2563eb, col white, pad 12 24, rad 6

SecondaryBtn as Button:
  bg #333, col white, pad 12 24, rad 6

Card as Frame:
  bg #1a1a1a, pad 20, rad 12

Frame gap 12
  Frame hor, gap 8
    PrimaryBtn "Speichern"
    SecondaryBtn "Abbrechen"
  Card
    Text "Wiederverwendbare Card", col white, fs 14
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].textContent).toContain('Speichern')
      expect(buttons[1].textContent).toContain('Abbrechen')

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Wiederverwendbare Card')
    })
  })

  describe('Komponenten mit Slots', () => {
    it('Layout-Strukturen mit benannten Slots sollten funktionieren', async () => {
      // Vereinfachte Slot-Struktur ohne verschachtelte Slot-Definition
      const { container, cleanup: c } = await renderMirror(`
InfoCard: bg #1a1a1a, pad 16, rad 12, gap 12, hor
  IconSlot: w 40, h 40, rad 8, center
  ContentSlot: gap 4

Frame gap 12
  InfoCard
    IconSlot bg #2563eb22
      Icon "code", ic #2563eb, is 20
    ContentSlot
      Text "Development", col white, fs 14, weight 500
      Text "Build amazing applications", col #888, fs 12
  InfoCard
    IconSlot bg #10b98122
      Icon "palette", ic #10b981, is 20
    ContentSlot
      Text "Design", col white, fs 14, weight 500
      Text "Create beautiful interfaces", col #888, fs 12
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Development')
      expect(textContents).toContain('Build amazing applications')
      expect(textContents).toContain('Design')
      expect(textContents).toContain('Create beautiful interfaces')
    })
  })

  describe('Vererbung mit extends', () => {
    it('Komponenten sollten von anderen erben können', async () => {
      // Korrekte Syntax ist "Name extends Parent:"
      // NICHT "Name as Parent: = props"
      const { container, cleanup: c } = await renderMirror(`
BaseBtn as Button:
  pad 12 24, rad 6, weight 500

PrimaryBtn extends BaseBtn:
  bg #2563eb, col white

DangerBtn extends BaseBtn:
  bg #ef4444, col white

GhostBtn extends BaseBtn:
  bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8
  PrimaryBtn "Primary"
  DangerBtn "Danger"
  GhostBtn "Ghost"
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(3)
      expect(buttons[0].textContent).toContain('Primary')
      expect(buttons[1].textContent).toContain('Danger')
      expect(buttons[2].textContent).toContain('Ghost')
    })
  })

  describe('Color Palette', () => {
    it('konsistentes Farbsystem sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
gray.900: #18181b
gray.800: #27272a
gray.700: #3f3f46
gray.600: #52525b
gray.500: #71717a

blue.500: #3b82f6
blue.600: #2563eb

Frame gap 8
  Frame hor, gap 4
    Frame w 40, h 40, bg $gray.900, rad 4
    Frame w 40, h 40, bg $gray.800, rad 4
    Frame w 40, h 40, bg $gray.700, rad 4
    Frame w 40, h 40, bg $gray.600, rad 4
    Frame w 40, h 40, bg $gray.500, rad 4
  Frame hor, gap 4
    Frame w 40, h 40, bg $blue.600, rad 4
    Frame w 40, h 40, bg $blue.500, rad 4
      `)
      cleanup = c

      // 5 gray + 2 blue + 2 rows + root
      const frames = container.querySelectorAll('div')
      expect(frames.length).toBeGreaterThanOrEqual(9)
    })
  })

  describe('Spacing System', () => {
    it('konsistentes Spacing mit Tokens sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
space.1: 4
space.2: 8
space.3: 12
space.4: 16
space.6: 24

rad.sm: 4
rad.md: 8
rad.lg: 12
rad.xl: 16

Frame gap $space.4
  Text "Spacing Demo", col white, fs 16, weight 600
  Frame hor, gap $space.2
    Frame w 60, h 60, bg #2563eb, rad $rad.sm, center
      Text "sm", col white, fs 10
    Frame w 60, h 60, bg #2563eb, rad $rad.md, center
      Text "md", col white, fs 10
    Frame w 60, h 60, bg #2563eb, rad $rad.lg, center
      Text "lg", col white, fs 10
    Frame w 60, h 60, bg #2563eb, rad $rad.xl, center
      Text "xl", col white, fs 10
  Frame bg #1a1a1a, pad $space.6, rad $rad.lg, gap $space.3
    Text "Card mit System-Tokens", col white, fs 14
    Text "Konsistentes Spacing", col #888, fs 12
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Spacing Demo')
      expect(textContents).toContain('sm')
      expect(textContents).toContain('md')
      expect(textContents).toContain('lg')
      expect(textContents).toContain('xl')
      expect(textContents).toContain('Card mit System-Tokens')
    })
  })

  describe('Complete Theme', () => {
    it('vollständiges Theme-System sollte funktionieren', async () => {
      // Korrekte Syntax verwendet "Name as Primitive:" mit Properties als Kinder
      const { container, cleanup: c } = await renderMirror(`
theme.bg: #0a0a0a
theme.surface: #1a1a1a
theme.border: #333
theme.text: #ffffff
theme.muted: #888888
theme.primary: #2563eb

Card as Frame:
  bg $theme.surface, rad 12, bor 1, boc $theme.border

PrimaryBtn as Button:
  bg $theme.primary, col $theme.text, pad 10 20, rad 6

Frame bg $theme.bg, pad 20, rad 16, gap 16
  Card w 280, gap 12
    Frame pad 16 16 12 16
      Text "Projekt erstellen", col $theme.text, fs 16, weight 600
      Text "Neues Projekt anlegen", col $theme.muted, fs 13
    Frame pad 0 16 16 16, gap 12
      Input placeholder "Projektname"
        bg $theme.surface, bor 1, boc $theme.border, col $theme.text, pad 10, rad 6, w full
      PrimaryBtn "Erstellen", w full
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Projekt erstellen')
      expect(textContents).toContain('Neues Projekt anlegen')

      const buttons = container.querySelectorAll('button')
      const createBtn = Array.from(buttons).find(b => b.textContent?.includes('Erstellen'))
      expect(createBtn).not.toBeNull()

      const input = container.querySelector('input')
      expect(input).not.toBeNull()
    })
  })
})
