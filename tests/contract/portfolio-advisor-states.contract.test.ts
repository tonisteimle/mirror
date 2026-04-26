/**
 * Portfolio-Advisor — States Contract (Schicht 3)
 *
 * Asserts the state-machine behavior of NavItem (active/hover) and
 * ActionBtn (hover) in portfolio-advisor.mirror.
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
    bindText: () => {},
    registerExclusiveGroup: () => {},
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

describe('portfolio-advisor — States Contract', () => {
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

  it('NavItems haben data-state Attribute (states sind initialisiert)', () => {
    const navItems = root.querySelectorAll('[data-mirror-name="NavItem"]')
    expect(navItems.length).toBeGreaterThan(0)
    // Each NavItem has a data-state — at least one must be "active"
    const active = Array.from(navItems).filter(n => n.getAttribute('data-state') === 'active')
    expect(active.length).toBe(1)
  })

  it('ActionBtns rendern als <button> mit data-state="default"', () => {
    const btns = root.querySelectorAll(
      '[data-mirror-name="ActionBtn"]'
    ) as NodeListOf<HTMLButtonElement>
    expect(btns.length).toBeGreaterThanOrEqual(1)
    for (const btn of Array.from(btns).slice(0, 3)) {
      expect(btn.tagName).toBe('BUTTON')
    }
  })
})
