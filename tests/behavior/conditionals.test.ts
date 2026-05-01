/**
 * Conditionals — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft Block-`if/else` und Inline-Ternary inkl. nested, in Style-Property,
 * mit Token-Reference, im Text-Content und mit Non-ASCII-Operanden.
 *
 * Sub-Features T1-T12 aus docs/archive/concepts/feature-test-execution-plan.md.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
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

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

function visibleText(root: Element): string {
  const out: string[] = []
  const walk = (node: Element) => {
    if (node.tagName === 'STYLE' || node.tagName === 'SCRIPT') return
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) out.push(child.textContent ?? '')
      else if (child.nodeType === 1) walk(child as Element)
    }
  }
  walk(root)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

describe('Conditionals — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  // ---------------------------------------------------------------------------
  // T1-T2: Block if / if-else
  // ---------------------------------------------------------------------------

  describe('T1: block `if`', () => {
    it('truthy condition → block renders', () => {
      const root = render(`active: true\n\nif active\n  Text "Yes"`, container)
      expect(visibleText(root)).toContain('Yes')
    })

    it('falsy condition → block does NOT render', () => {
      const root = render(`active: false\n\nif active\n  Text "Yes"`, container)
      expect(visibleText(root)).not.toContain('Yes')
    })
  })

  describe('T2: `if/else`', () => {
    it('truthy → then-branch', () => {
      const root = render(
        `loggedIn: true\n\nif loggedIn\n  Text "Welcome"\nelse\n  Text "Login"`,
        container
      )
      expect(visibleText(root)).toContain('Welcome')
      expect(visibleText(root)).not.toContain('Login')
    })

    it('falsy → else-branch', () => {
      const root = render(
        `loggedIn: false\n\nif loggedIn\n  Text "Welcome"\nelse\n  Text "Login"`,
        container
      )
      expect(visibleText(root)).toContain('Login')
      expect(visibleText(root)).not.toContain('Welcome')
    })
  })

  // ---------------------------------------------------------------------------
  // T3-T5: Boolean ops, comparison, string-comparison
  // ---------------------------------------------------------------------------

  describe('T3: boolean operators', () => {
    it('`&&` requires both truthy', () => {
      const root = render(`a: true\nb: true\n\nif a && b\n  Text "Both"`, container)
      expect(visibleText(root)).toContain('Both')
    })

    it('`&&` falsy if one is false', () => {
      const root = render(`a: true\nb: false\n\nif a && b\n  Text "Both"`, container)
      expect(visibleText(root)).not.toContain('Both')
    })
  })

  describe('T4: comparison', () => {
    it('numeric `>` works', () => {
      const root = render(`count: 5\n\nif count > 0\n  Text "Items"`, container)
      expect(visibleText(root)).toContain('Items')
    })

    it('numeric `>` falsy when equal/less', () => {
      const root = render(`count: 0\n\nif count > 0\n  Text "Items"`, container)
      expect(visibleText(root)).not.toContain('Items')
    })
  })

  describe('T5: string-comparison (Bug #18 regression)', () => {
    it('non-ASCII string operand: `cat == "Geschäftlich"`', () => {
      const root = render(
        `cat: "Geschäftlich"\n\nif cat == "Geschäftlich"\n  Text "Match"`,
        container
      )
      expect(visibleText(root)).toContain('Match')
    })

    it('regular ASCII string match', () => {
      const root = render(`status: "active"\n\nif status == "active"\n  Text "Online"`, container)
      expect(visibleText(root)).toContain('Online')
    })

    it('string mismatch → no render', () => {
      const root = render(`status: "draft"\n\nif status == "active"\n  Text "Online"`, container)
      expect(visibleText(root)).not.toContain('Online')
    })
  })

  // ---------------------------------------------------------------------------
  // T6: Inline ternary
  // ---------------------------------------------------------------------------

  describe('T6: inline ternary', () => {
    it('truthy → then-value', () => {
      const root = render(`done: true\n\nText done ? "Ja" : "Nein"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Ja')
    })

    it('falsy → else-value', () => {
      const root = render(`done: false\n\nText done ? "Ja" : "Nein"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Nein')
    })
  })

  // ---------------------------------------------------------------------------
  // T7: Nested ternary
  // ---------------------------------------------------------------------------

  describe('T7: nested ternary in Text (Bug #23 fixed)', () => {
    it('level == 2 → "Intermediate"', () => {
      const root = render(
        `level: 2\n\nText level == 1 ? "Beginner" : level == 2 ? "Intermediate" : "Advanced"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Intermediate')
    })

    it('level == 1 → "Beginner"', () => {
      const root = render(
        `level: 1\n\nText level == 1 ? "Beginner" : level == 2 ? "Intermediate" : "Advanced"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Beginner')
    })

    it('level == 3 → "Advanced" (else of else)', () => {
      const root = render(
        `level: 3\n\nText level == 1 ? "Beginner" : level == 2 ? "Intermediate" : "Advanced"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Advanced')
    })
  })

  // ---------------------------------------------------------------------------
  // T8: Ternary in style property
  // ---------------------------------------------------------------------------

  describe('T8: ternary in style-property (literal hex values)', () => {
    it('truthy condition → first hex applied', () => {
      const root = render(`active: true\n\nFrame bg active ? #2271C1 : #333`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(34, 113, 193)')
    })

    it('falsy condition → second hex applied', () => {
      const root = render(`active: false\n\nFrame bg active ? #2271C1 : #333`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(51, 51, 51)')
    })
  })

  // ---------------------------------------------------------------------------
  // T9: Ternary with token references
  // ---------------------------------------------------------------------------

  describe('T9: ternary with token references in style (Bug #24 fixed)', () => {
    it('truthy condition → first $token resolves to var(--accent-bg)', () => {
      const root = render(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\nchange: 5\n\nFrame bg change > 0 ? $accent : $danger`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--accent-bg)')
    })

    it('falsy condition → second $token resolves to var(--danger-bg)', () => {
      const root = render(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\nchange: -5\n\nFrame bg change > 0 ? $accent : $danger`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--danger-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // T10: Ternary inside each-loop with __loopVar
  // ---------------------------------------------------------------------------

  describe('T10: ternary inside `each`-loop body', () => {
    it('Texts inside each-loop render correctly', () => {
      const root = render(
        `positions:\n  p1:\n    name: "Apple"\n  p2:\n    name: "Tesla"\n\neach pos in $positions\n  Text "$pos.name"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Apple', 'Tesla'])
    })

    it('Ternary with $token in each-loop body resolves per item (regression for Bug #24 in loop)', () => {
      const root = render(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\npositions:\n  p1:\n    name: "Apple"\n    change: 2.34\n  p2:\n    name: "Tesla"\n    change: -1.5\n\neach pos in $positions\n  Frame bg pos.change > 0 ? $accent : $danger`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      expect(frames.length).toBe(2)
      // Apple: change=2.34 > 0 → accent. Tesla: change=-1.5 → danger.
      expect(frames[0].style.background).toContain('var(--accent-bg)')
      expect(frames[1].style.background).toContain('var(--danger-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // T11: Ternary in Text-content with interpolation
  // ---------------------------------------------------------------------------

  describe('T11: ternary in Text content with interpolation (Bug #26 fixed)', () => {
    it('truthy condition → interpolated then-branch', () => {
      const root = render(`count: 3\n\nText count > 0 ? "Items: $count" : "Empty"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Items: 3')
    })

    it('falsy condition → else-branch literal', () => {
      const root = render(`count: 0\n\nText count > 0 ? "Items: $count" : "Empty"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Empty')
    })
  })

  // ---------------------------------------------------------------------------
  // T12: Non-ASCII string operand + further props on the same line
  // ---------------------------------------------------------------------------

  describe('T12: non-ASCII string in inline ternary (Bug #25 fixed)', () => {
    it('ternary with non-ASCII string operand resolves correctly', () => {
      const root = render(
        `cat: "Geschäftlich"\n\nFrame bg cat == "Geschäftlich" ? #dbeafe : #fef3c7\n  Text "$cat"`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      // Truthy → first hex
      expect(frame.style.background).toContain('rgb(219, 234, 254)')
    })

    it('ternary with non-ASCII string + trailing props', () => {
      const root = render(
        `cat: "Geschäftlich"\n\nFrame bg cat == "Geschäftlich" ? #dbeafe : #fef3c7, w 100, h 50\n  Text "$cat"`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(219, 234, 254)')
      expect(frame.style.width).toBe('100px')
      expect(frame.style.height).toBe('50px')
    })

    it('ASCII string ternary in style: truthy', () => {
      const root = render(
        `cat: "Privat"\n\nFrame bg cat == "Privat" ? #dcfce7 : #fef3c7`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(220, 252, 231)')
    })
  })
})
