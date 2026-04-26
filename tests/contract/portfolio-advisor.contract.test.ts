/**
 * Portfolio-Advisor — Contract Test (Schicht 3 der Test-Pyramide)
 *
 * Asserts the *intended* per-app behavior of `examples/portfolio-advisor.mirror`
 * with focus on **Components**: StatCard, PositionRow, ActionBtn, NavItem.
 *
 * Catches integration bugs that are invisible to the lower-tier behavior
 * tests because they involve specific data + component interactions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'examples', 'portfolio-advisor.mirror'),
  'utf-8'
)

function render(container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(SRC)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
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

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('portfolio-advisor — Component Contract', () => {
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

  // ---------------------------------------------------------------------------
  // StatCard — Stat-Card im KPI-Header
  // ---------------------------------------------------------------------------

  describe('StatCard', () => {
    it('rendert genau 4 StatCards im KPI-Header', () => {
      const cards = allByName(root, 'StatCard')
      expect(cards.length).toBe(4)
    })

    it('jede StatCard hat einen Label-Slot, Value-Slot und Change-Slot', () => {
      const card = allByName(root, 'StatCard')[0]
      expect(card.querySelector('[data-mirror-name="Label"]')).not.toBeNull()
      expect(card.querySelector('[data-mirror-name="Value"]')).not.toBeNull()
      expect(card.querySelector('[data-mirror-name="Change"]')).not.toBeNull()
    })

    it('StatCards haben `grow` Override (Layout-Override aus Instance)', () => {
      const card = allByName(root, 'StatCard')[0] as HTMLElement
      // grow = flex-grow: 1
      expect(card.style.flexGrow).toBe('1')
    })

    it('StatCard hat surface-secondary Hintergrund (aus Definition)', () => {
      const card = allByName(root, 'StatCard')[0] as HTMLElement
      expect(card.style.background).toContain('var(--surface-secondary-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // PositionRow — eine Row pro Portfolio-Position
  // ---------------------------------------------------------------------------

  describe('PositionRow', () => {
    it('rendert genau eine Row pro Position (6 Stück)', () => {
      const rows = allByName(root, 'PositionRow')
      expect(rows.length).toBe(6)
    })

    it('jede PositionRow hat Asset- und Data-Slot', () => {
      const row = allByName(root, 'PositionRow')[0]
      expect(row.querySelector('[data-mirror-name="Asset"]')).not.toBeNull()
      expect(row.querySelector('[data-mirror-name="Data"]')).not.toBeNull()
    })

    it('Asset-Slot hat verschachtelte Logo + Info Slots', () => {
      const row = allByName(root, 'PositionRow')[0]
      const asset = row.querySelector('[data-mirror-name="Asset"]')!
      expect(asset.querySelector('[data-mirror-name="Logo"]')).not.toBeNull()
      expect(asset.querySelector('[data-mirror-name="Info"]')).not.toBeNull()
    })

    it('Info-Slot hat Name + Type Sub-Slots', () => {
      const row = allByName(root, 'PositionRow')[0]
      const info = row.querySelector('[data-mirror-name="Info"]')!
      expect(info.querySelector('[data-mirror-name="Name"]')).not.toBeNull()
      expect(info.querySelector('[data-mirror-name="Type"]')).not.toBeNull()
    })

    it('Position-Daten erscheinen im Output (Apple Inc.)', () => {
      const row = allByName(root, 'PositionRow')[0]
      // First position is Apple
      expect(row.textContent).toContain('Apple Inc.')
    })
  })

  // ---------------------------------------------------------------------------
  // ActionBtn — mit Property-Overrides pro Instance
  // ---------------------------------------------------------------------------

  describe('ActionBtn', () => {
    it('rendert mehrere ActionBtns mit unterschiedlichen Hintergründen', () => {
      const btns = allByName(root, 'ActionBtn') as HTMLElement[]
      expect(btns.length).toBeGreaterThanOrEqual(2)
      // ActionBtn-Definition hat KEIN bg → Instance-Override-bg sollte sichtbar sein
      const bgs = new Set(btns.map(b => b.style.background))
      // Mindestens zwei unterschiedliche bg-Varianten
      expect(bgs.size).toBeGreaterThanOrEqual(2)
    })

    it('ActionBtn rendert als <button> (Button-Primitive über Definition)', () => {
      const btn = allByName(root, 'ActionBtn')[0]
      expect(btn.tagName).toBe('BUTTON')
    })

    it('ActionBtn hat Border-Radius 8px (aus Definition)', () => {
      const btn = allByName(root, 'ActionBtn')[0] as HTMLElement
      expect(btn.style.borderRadius).toBe('8px')
    })
  })

  // ---------------------------------------------------------------------------
  // NavItem — Sidebar-Navigation mit aktivem Eintrag
  // ---------------------------------------------------------------------------

  describe('NavItem', () => {
    it('rendert 6 NavItems in der Sidebar', () => {
      const items = allByName(root, 'NavItem')
      expect(items.length).toBe(6)
    })

    it('genau ein NavItem hat den `active`-State initial', () => {
      const items = allByName(root, 'NavItem') as HTMLElement[]
      const active = items.filter(i => i.getAttribute('data-state') === 'active')
      expect(active.length).toBe(1)
    })

    it('NavItem ist horizontal layoutet mit gap 12', () => {
      const item = allByName(root, 'NavItem')[0] as HTMLElement
      expect(item.style.flexDirection).toBe('row')
      expect(item.style.gap).toBe('12px')
    })
  })
})
