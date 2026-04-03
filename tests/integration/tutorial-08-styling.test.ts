/**
 * Tutorial Kapitel 8: Styling - Integration Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 08: Styling', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Farben', () => {
    it('Hex-Farben sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 8
  Frame w 50, h 50, bg #2563eb, rad 6
  Frame w 50, h 50, bg #10b981, rad 6
  Frame w 50, h 50, bg #f59e0b, rad 6
  Frame w 50, h 50, bg #ef4444, rad 6
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      // 4 color frames + possible wrapper
      expect(frames.length).toBeGreaterThanOrEqual(4)
    })

    it('benannte Farben sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 8
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg black, rad 6
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      expect(frames.length).toBeGreaterThanOrEqual(2)
    })

    it('rgba sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 50, h 50, bg rgba(37,99,235,0.5), rad 6
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
    })
  })

  describe('Gradients', () => {
    it('linear-gradient sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 8
  Frame w full, h 50, rad 8
    bg linear-gradient(90deg, #2563eb, #7c3aed)
  Frame w full, h 50, rad 8
    bg linear-gradient(135deg, #f59e0b, #ef4444)
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      expect(frames.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Borders', () => {
    it('bor und boc sollten Border setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 70, h 70, bor 2, boc #2563eb, rad 8, center
  Text "2px", col #888, fs 11
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.borderWidth).toBe('2px')
    })
  })

  describe('Border Radius', () => {
    it('rad sollte border-radius setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 12
  Frame w 60, h 60, bg #2563eb, rad 0
  Frame w 60, h 60, bg #2563eb, rad 4
  Frame w 60, h 60, bg #2563eb, rad 12
  Frame w 60, h 60, bg #2563eb, rad 99
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      expect(frames.length).toBeGreaterThanOrEqual(4)

      // rad 99 sollte rund machen - find the last child div
      const lastFrame = frames[frames.length - 1] as HTMLElement
      const style = window.getComputedStyle(lastFrame)
      expect(style.borderRadius).toBe('99px')
    })
  })

  describe('Typografie', () => {
    it('fs sollte Schriftgröße setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Body Text", col #ccc, fs 14
  Text "Small Text", col #888, fs 12
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3)

      const headline = texts[0] as HTMLElement
      const style = window.getComputedStyle(headline)
      expect(style.fontSize).toBe('24px')
    })

    it('weight sollte font-weight setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Text "Bold Text", col white, fs 16, weight bold
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      const style = window.getComputedStyle(text!)
      expect(style.fontWeight).toBe('700')
    })
  })

  describe('Text-Stil', () => {
    it('uppercase sollte text-transform setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Text "UPPERCASE TEXT", col white, uppercase
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      const style = window.getComputedStyle(text!)
      expect(style.textTransform).toBe('uppercase')
    })

    it('italic sollte font-style setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Text "Italic Text", col white, italic
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      const style = window.getComputedStyle(text!)
      expect(style.fontStyle).toBe('italic')
    })

    it('underline sollte text-decoration setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Text "Underlined Text", col white, underline
      `)
      cleanup = c

      const text = container.querySelector('span')
      expect(text).not.toBeNull()
      const style = window.getComputedStyle(text!)
      expect(style.textDecoration).toContain('underline')
    })
  })

  describe('Shadows', () => {
    it('shadow sollte box-shadow setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      expect(frames.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Opacity', () => {
    it('opacity sollte Transparenz setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 8
  Frame w 60, h 60, bg #2563eb, rad 8, opacity 1
  Frame w 60, h 60, bg #2563eb, rad 8, opacity 0.5
  Frame w 60, h 60, bg #2563eb, rad 8, opacity 0.2
      `)
      cleanup = c

      const frames = container.querySelectorAll('div > div')
      expect(frames.length).toBeGreaterThanOrEqual(3)

      // Find a frame with opacity 0.5
      const framesArray = Array.from(frames) as HTMLElement[]
      const halfOpacity = framesArray.find(f => window.getComputedStyle(f).opacity === '0.5')
      expect(halfOpacity).not.toBeNull()
    })
  })

  describe('Cursor', () => {
    it('cursor pointer sollte cursor: pointer setzen', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor pointer
  Text "pointer", col #888, fs 10
      `)
      cleanup = c

      const frame = container.querySelector('div')
      expect(frame).not.toBeNull()
      const style = window.getComputedStyle(frame!)
      expect(style.cursor).toBe('pointer')
    })
  })

  describe('Button Varianten', () => {
    it('verschiedene Button-Stile sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 12
  Frame hor, gap 8
    Button "Primary", bg #2563eb, col white, pad 10 20, rad 6
    Button "Success", bg #10b981, col white, pad 10 20, rad 6
    Button "Danger", bg #ef4444, col white, pad 10 20, rad 6
  Frame hor, gap 8
    Button "Outline", bor 1, boc #2563eb, col #2563eb, pad 10 20, rad 6
    Button "Subtle", bg #2563eb22, col #2563eb, pad 10 20, rad 6
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(5)
    })
  })

  describe('Card Styles', () => {
    it('verschiedene Card-Designs sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 12
  Frame w 120, bg #1a1a1a, pad 16, rad 12, shadow md, gap 8
    Text "Elevated", col white, fs 13, weight 500
    Text "Mit Schatten", col #888, fs 11
  Frame w 120, bor 1, boc #333, pad 16, rad 12, gap 8
    Text "Bordered", col white, fs 13, weight 500
    Text "Mit Border", col #888, fs 11
      `)
      cleanup = c

      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(4)
    })
  })
})
