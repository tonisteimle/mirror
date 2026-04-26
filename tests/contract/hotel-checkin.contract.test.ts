/**
 * Hotel-Checkin — Contract Test (Schicht 3 der Test-Pyramide)
 *
 * Asserts the *intended* per-app behavior of `examples/hotel-checkin.mirror`
 * with focus on **Tokens**: $primary, $accent, $text, $border etc. are
 * defined as design tokens and used throughout the UI.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(join(__dirname, '..', '..', 'examples', 'hotel-checkin.mirror'), 'utf-8')

function render(container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(SRC)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  const fn = new Function(code + '\nreturn createUI();')
  const root = fn() as HTMLElement
  container.appendChild(root)
  return root
}

describe('hotel-checkin — Tokens Contract', () => {
  let container: HTMLDivElement
  let root: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = render(container)
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  describe('Token-Variables in :root CSS', () => {
    it('rendert ohne Crash mit Token-System', () => {
      expect(root).toBeTruthy()
    })

    it('emittiert :root CSS variables für definierte Tokens', () => {
      // The DOM backend emits a <style> block with :root { --primary-bg: …; … }
      const styleBlock = root.querySelector('style')?.textContent || ''
      expect(styleBlock).toContain('--primary-bg')
      expect(styleBlock).toContain('--accent-bg')
      expect(styleBlock).toContain('--text-col')
      expect(styleBlock).toContain('--border-boc')
    })

    it('Token-Werte stehen in :root', () => {
      const styleBlock = root.querySelector('style')?.textContent || ''
      // primary.bg: #1a1a1a → --primary-bg: #1a1a1a
      expect(styleBlock).toMatch(/--primary-bg:\s*#1a1a1a/)
      expect(styleBlock).toMatch(/--accent-bg:\s*#c9a961/)
    })
  })

  describe('Token-Resolution in usage sites', () => {
    it('mindestens ein Element nutzt var(--primary-bg)', () => {
      const all = root.querySelectorAll('[data-mirror-name]')
      const usesPrimary = Array.from(all).some(el =>
        (el as HTMLElement).style.background.includes('var(--primary-bg)')
      )
      expect(usesPrimary).toBe(true)
    })

    it('mindestens ein Element nutzt var(--accent-bg)', () => {
      const all = root.querySelectorAll('[data-mirror-name]')
      const usesAccent = Array.from(all).some(
        el =>
          (el as HTMLElement).style.background.includes('var(--accent-bg)') ||
          (el as HTMLElement).style.color.includes('var(--accent-col)')
      )
      expect(usesAccent).toBe(true)
    })
  })
})
