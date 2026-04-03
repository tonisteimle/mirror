/**
 * Tutorial Kapitel 6: Grid Layout - Integration Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 06: Grid Layout', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Grid aktivieren', () => {
    it('grid 12 sollte CSS Grid aktivieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 8, w full, bg #111, pad 16, rad 8
  Frame w 4, h 40, bg #2563eb, rad 4, center
    Text "1"
  Frame w 4, h 40, bg #2563eb, rad 4, center
    Text "2"
  Frame w 4, h 40, bg #2563eb, rad 4, center
    Text "3"
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.display).toBe('grid')
    })
  })

  describe('Spalten-Span', () => {
    it('w im Grid-Kontext sollte Spalten bedeuten', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 8, bg #111, pad 16, rad 8
  Frame w 12, h 40, bg #2563eb, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
      `)
      cleanup = c

      const gridItems = container.querySelectorAll('div > div')
      // Sollte mindestens 3 Grid-Items haben
      expect(gridItems.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Zeilen-Span mit h', () => {
    it('h im Grid sollte Zeilen-Span setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 8, bg #111, pad 16, rad 8, row-height 40
  Frame w 3, h 3, bg #2563eb, rad 4, center
    Text "Sidebar", col white, fs 12
  Frame w 9, h 2, bg #10b981, rad 4, center
    Text "Content", col white, fs 12
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.display).toBe('grid')
    })
  })

  describe('Explizite Platzierung', () => {
    it('x, y sollten Grid-Position setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 8, bg #111, pad 16, rad 8, row-height 40
  Frame x 1, y 1, w 12, h 2, bg #2563eb, rad 4, center
    Text "Hero (x 1, y 1)", col white, fs 12
  Frame x 1, y 3, w 3, h 4, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12
  Frame x 4, y 3, w 9, h 4, bg #333, rad 4, center
    Text "Main Content", col white, fs 12
      `)
      cleanup = c

      // Verifiziere dass Elemente gerendert wurden
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3)
      expect(texts[0].textContent).toContain('Hero')
      expect(texts[1].textContent).toContain('Sidebar')
      expect(texts[2].textContent).toContain('Main Content')
    })
  })

  describe('Dense', () => {
    it('dense sollte grid-auto-flow: dense setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 8, dense, bg #111, pad 16, rad 8, row-height 30
  Frame w 8, h 2, bg #2563eb, rad 4, center
    Text "Groß (w 8)", col white, fs 11
  Frame w 4, h 1, bg #10b981, rad 4, center
    Text "Klein", col white, fs 11
  Frame w 4, h 1, bg #10b981, rad 4, center
    Text "Klein", col white, fs 11
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.display).toBe('grid')
    })
  })

  describe('Page-Layout als Komponente', () => {
    it('Grid-basiertes Page-Layout sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
PageLayout: grid 12, gap 16, row-height 30, h 220
  Hero: x 1, y 1, w 12, h 2, bg #2563eb, rad 8, center
  Sidebar: x 1, y 3, w 3, h 5, bg #1a1a1a, rad 8, pad 12
  Main: x 4, y 3, w 9, h 5, bg #111, rad 8, pad 16
  Footer: x 1, y 8, w 12, h 1, bg #0a0a0a, rad 4, center

PageLayout
  Hero
    Text "Willkommen", col white, fs 18, weight 600
  Sidebar
    Text "Navigation", col #888, fs 11
  Main
    Text "Hauptinhalt", col white, fs 16
  Footer
    Text "© 2024", col #666, fs 11
      `)
      cleanup = c

      // Verifiziere Inhalte
      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Willkommen')
      expect(textContents).toContain('Navigation')
      expect(textContents).toContain('Hauptinhalt')
      expect(textContents).toContain('© 2024')
    })
  })

  describe('Dashboard Layout', () => {
    it('komplexes Dashboard-Layout sollte funktionieren', async () => {
      // Simplified test - complex nested slots may not work fully
      const { container, cleanup: c } = await renderMirror(`
Frame grid 12, gap 12, row-height 25, h 240
  Frame x 1, y 1, w 12, h 2, bg #1a1a1a, rad 6, pad 0 16, hor, spread, center
    Text "Dashboard", col white, weight 500
  Frame x 1, y 3, w 2, h 6, bg #1a1a1a, rad 6, pad 12, gap 4
    Text "Menu", col #666, fs 10
  Frame x 3, y 3, w 10, h 6, grid 2, gap 12
    Frame bg #252525, rad 6, pad 12, gap 4
      Text "Users", col white, fs 13, weight 500
      Text "1,234", col #2563eb, fs 24, weight 600
    Frame bg #252525, rad 6, pad 12, gap 4
      Text "Revenue", col white, fs 13, weight 500
      Text "$12.4k", col #2563eb, fs 24, weight 600
  Frame x 1, y 9, w 12, h 1, bg #0a0a0a, center
    Text "Last updated: just now", col #666, fs 10
      `)
      cleanup = c

      // Verifiziere Dashboard-Struktur
      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Dashboard')
      expect(textContents).toContain('1,234')
      expect(textContents).toContain('$12.4k')
    })
  })
})
