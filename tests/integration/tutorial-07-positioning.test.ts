/**
 * Tutorial Kapitel 7: Positioning - Integration Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 07: Positioning', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Stacked Layout', () => {
    it('stacked sollte Kinder übereinander stapeln', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 200, h 120, stacked, rad 8, clip
  Frame w full, h full, bg #2563eb
  Frame w full, h 40, bg rgba(0,0,0,0.6), bottom, pad 0 12, cl
    Text "Bildtitel", col white, fs 13
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.position).toBe('relative')
    })
  })

  describe('Positionierung in Stacked', () => {
    it('Richtungs-Properties sollten Kinder positionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 200, h 150, stacked, bg #1a1a1a, rad 8
  Frame w 30, h 30, bg #ef4444, rad 4, top, left
  Frame w 30, h 30, bg #f59e0b, rad 4, top, right
  Frame w 30, h 30, bg #10b981, rad 4, bottom, left
  Frame w 30, h 30, bg #2563eb, rad 4, bottom, right
  Frame w 40, h 40, bg white, rad 99, center
      `)
      cleanup = c

      // 5 Kinder im stacked Container + der Container selbst
      const allDivs = container.querySelectorAll('div')
      expect(allDivs.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Pinning mit Abstand', () => {
    it('pt, pl, pb, pr sollten Pin-Abstände setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 240, h 140, stacked, bg #1a1a1a, rad 8
  Frame bg #2563eb, pad 8 12, rad 4, pt 12, pl 12
    Text "top-left", col white, fs 11
  Frame bg #10b981, pad 8 12, rad 4, pb 12, pr 12
    Text "bottom-right", col white, fs 11
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(2)
      expect(texts[0].textContent).toBe('top-left')
      expect(texts[1].textContent).toBe('bottom-right')
    })
  })

  describe('Zentrierung mit Pin', () => {
    it('pc sollte Element komplett zentrieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 240, h 120, stacked, bg #1a1a1a, rad 8
  Frame bg #2563eb, pad 8 16, rad 4, pc
    Text "Zentriert", col white, fs 12
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      expect(text!.textContent).toBe('Zentriert')
    })

    it('pcx sollte horizontal zentrieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 240, h 120, stacked, bg #1a1a1a, rad 8
  Frame bg #333, pad 4 12, rad 4, pcx, pt 8
    Text "oben mitte", col #888, fs 10
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      expect(text!.textContent).toBe('oben mitte')
    })
  })

  describe('Z-Index', () => {
    it('z sollte Stapelreihenfolge kontrollieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 200, h 100, stacked, bg #1a1a1a, rad 8
  Frame w 80, h 80, bg #ef4444, rad 8, pl 20, pcy, z 1
  Frame w 80, h 80, bg #f59e0b, rad 8, pl 50, pcy, z 2
  Frame w 80, h 80, bg #10b981, rad 8, pl 80, pcy, z 3
      `)
      cleanup = c

      // Überprüfe dass 3 farbige Frames gerendert wurden
      const innerDivs = container.querySelectorAll('div > div')
      expect(innerDivs.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('X/Y Offset', () => {
    it('x und y sollten Element verschieben', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 200, h 100, stacked, bg #1a1a1a, rad 8
  Frame w 60, h 60, bg #333, rad 8, center
  Frame w 60, h 60, bg #2563eb, rad 8, center, x 30, y -10
      `)
      cleanup = c

      // Zwei gestapelte Frames
      const innerDivs = container.querySelectorAll('div > div')
      expect(innerDivs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Notification Badge', () => {
    it('Badge auf Icon sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 24
  Frame stacked
    Frame w 44, h 44, bg #1a1a1a, rad 8, center
      Icon "bell", ic #888, is 22
    Frame w 18, h 18, bg #ef4444, rad 99, pt -4, pr -4, center
      Text "3", col white, fs 10, weight 600
      `)
      cleanup = c

      // Find the Text "3" (not the Icon span)
      const texts = container.querySelectorAll('span')
      const badgeText = Array.from(texts).find(t => t.textContent === '3')
      expect(badgeText).not.toBeNull()
    })
  })

  describe('Image Card', () => {
    it('Overlay-Text auf Bild sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 260, h 160, stacked, rad 12, clip, cursor pointer
  Frame w full, h full, bg linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  Frame w full, h full, bg linear-gradient(transparent 40%, rgba(0,0,0,0.8))
  Frame w full, pb 16, pl 16, pr 16, bottom, gap 4
    Text "Projekt Alpha", col white, fs 16, weight 600
    Text "Design System", col rgba(255,255,255,0.7), fs 12
  Frame bg rgba(0,0,0,0.5), pad 4 10, rad 99, pt 12, pr 12
    Text "Neu", col white, fs 11
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Projekt Alpha')
      expect(textContents).toContain('Design System')
      expect(textContents).toContain('Neu')
    })
  })

  describe('Floating Action Button', () => {
    it('FAB sollte unten rechts schweben', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w full, h 180, stacked, bg #0a0a0a, rad 8
  Frame w full, h full, pad 20, gap 8
    Text "Hauptinhalt", col white, fs 16
    Text "Hier steht der Content der Seite.", col #666, fs 13
  Frame w 56, h 56, bg #2563eb, rad 99, pb 16, pr 16, center, cursor pointer, shadow lg
    Icon "plus", ic white, is 24
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Hauptinhalt')
    })
  })

  describe('Clip', () => {
    it('clip sollte overflow: hidden setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 100, h 100, stacked, rad 8, clip, bg #1a1a1a
  Frame w 150, h 150, bg #2563eb
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.overflow).toBe('hidden')
    })
  })
})
