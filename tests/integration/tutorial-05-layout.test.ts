/**
 * Tutorial Kapitel 5: Layout - Integration Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 05: Layout', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Vertikales Layout', () => {
    it('Elemente sollten untereinander angeordnet werden', async () => {
      const { api, container, cleanup: c } = await renderMirror(`
Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Zeile 1", col white
  Text "Zeile 2", col white
  Text "Zeile 3", col white
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3)
      expect(texts[0].textContent).toBe('Zeile 1')
      expect(texts[1].textContent).toBe('Zeile 2')
      expect(texts[2].textContent).toBe('Zeile 3')
    })
  })

  describe('Horizontales Layout', () => {
    it('Elemente sollten nebeneinander angeordnet werden', async () => {
      const { api, container, cleanup: c } = await renderMirror(`
Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
  Frame w 60, h 60, bg #2563eb, rad 6, center
    Text "1", col white
  Frame w 60, h 60, bg #10b981, rad 6, center
    Text "2", col white
  Frame w 60, h 60, bg #f59e0b, rad 6, center
    Text "3", col white
      `)
      cleanup = c

      // Elemente existieren
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3)

      // Parent hat flex-direction: row
      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.flexDirection).toBe('row')
    })
  })

  describe('Größen', () => {
    it('w mit Pixelwert sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 200, h 100, bg #1a1a1a
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.width).toBe('200px')
      expect(style.height).toBe('100px')
    })

    it('w full sollte den verfügbaren Platz füllen', async () => {
      // w full in vertical parent (Frame) is cross-axis → align-self: stretch
      const { container, cleanup: c } = await renderMirror(`
Frame w 300, bg #0a0a0a, pad 16
  Frame w full, h 40, bg #2563eb
    Text "w full", col white
      `)
      cleanup = c

      const innerFrame = container.querySelectorAll('div')[1]
      expect(innerFrame).not.toBeNull()
      const style = window.getComputedStyle(innerFrame!)
      // w full in vertical parent → align-self: stretch
      expect(style.alignSelf).toBe('stretch')
    })
  })

  describe('Zentrieren', () => {
    it('center sollte Kinder zentrieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 300, h 120, bg #1a1a1a, rad 8, center
  Frame bg #2563eb, pad 12 24, rad 6
    Text "Zentriert", col white
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.justifyContent).toBe('center')
      expect(style.alignItems).toBe('center')
    })
  })

  describe('Verteilen mit spread', () => {
    it('spread sollte Elemente verteilen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, spread, bg #1a1a1a, pad 12 16, rad 8
  Text "Logo", col white, weight 600
  Button "Login", pad 8 16, bg #2563eb, col white, rad 6
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.justifyContent).toBe('space-between')
    })
  })

  describe('9 Positionen', () => {
    it('tl sollte top-left ausrichten', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 100, h 100, bg #1a1a1a, tl
  Text "tl", col white
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      // tl = align-items: flex-start, justify-content: flex-start
      expect(style.alignItems).toBe('flex-start')
      expect(style.justifyContent).toBe('flex-start')
    })

    it('br sollte bottom-right ausrichten', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 100, h 100, bg #1a1a1a, br
  Text "br", col white
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.alignItems).toBe('flex-end')
      expect(style.justifyContent).toBe('flex-end')
    })
  })

  describe('Wrap', () => {
    it('wrap sollte flex-wrap: wrap setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, w 280
  Frame w 60, h 40, bg #2563eb
  Frame w 60, h 40, bg #2563eb
  Frame w 60, h 40, bg #2563eb
  Frame w 60, h 40, bg #2563eb
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.flexWrap).toBe('wrap')
    })
  })

  describe('App Layout', () => {
    it('Sidebar + Main Layout sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w full, h 200, hor
  Frame w 160, h full, bg #1a1a1a, pad 16, gap 4
    Text "Navigation", col #666
    Text "Dashboard", col white
    Text "Projekte", col #888

  Frame w full, h full, bg #111, pad 20
    Text "Dashboard", col white
      `)
      cleanup = c

      // 2 Haupt-Frames: Sidebar und Main
      const rootFrame = container.querySelector('div')
      expect(rootFrame).not.toBeNull()

      const children = rootFrame!.children
      expect(children.length).toBe(2)

      // Sidebar hat feste Breite
      const sidebar = children[0] as HTMLElement
      const sidebarStyle = window.getComputedStyle(sidebar)
      expect(sidebarStyle.width).toBe('160px')

      // Main füllt den Rest
      const main = children[1] as HTMLElement
      const mainStyle = window.getComputedStyle(main)
      expect(mainStyle.flexGrow).toBe('1')
    })
  })
})
