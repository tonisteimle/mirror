/**
 * Conditionals — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft Block-`if/else` und Inline-Ternary inkl. nested, in Style-Property,
 * mit Token-Reference, im Text-Content und mit Non-ASCII-Operanden.
 *
 * Sub-Features T1-T12 aus docs/concepts/feature-test-execution-plan.md.
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

  describe('T7: nested ternary in Text', () => {
    // Bug #23 (pinned): nested ternary in Text content currently emits
    // multiple sibling DOM nodes instead of a single Text with the resolved
    // value. Pinning the IST-Stand. When fixed, flip to assert one element.
    it('PIN Bug #23: nested ternary creates multiple sibling elements', () => {
      const root = render(
        `level: 2\n\nText level == 1 ? "Beginner" : level == 2 ? "Intermediate" : "Advanced"`,
        container
      )
      // Currently produces 1 Text + 1 misnamed Frame ('level')
      const all = allByName(root, 'Text').concat(allByName(root, 'level'))
      expect(all.length).toBeGreaterThan(1)
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

  describe('T9: ternary with token references in style', () => {
    // Bug #24 (pinned): ternary where then/else are token-references
    // (e.g. `$accent`, `$danger`) currently emits NO `background` style at
    // all — neither var() nor literal. The DOM renders without color.
    // Pinning IST-Stand; flip to assert var(--accent-bg) when fixed.
    it('PIN Bug #24: ternary with $token in style produces no bg', () => {
      const root = render(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\nchange: 5\n\nFrame bg change > 0 ? $accent : $danger`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      // Today: empty background. When fixed: should contain "var(--accent-bg)"
      // or the resolved hex.
      expect(frame.style.background).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // T10: Ternary inside each-loop with __loopVar
  // ---------------------------------------------------------------------------

  describe('T10: ternary inside `each`-loop body', () => {
    it('PIN Bug #24 (loop variant): ternary with $token in loop-style produces no bg', () => {
      const root = render(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\npositions:\n  p1:\n    name: "Apple"\n    change: 2.34\n  p2:\n    name: "Tesla"\n    change: -1.5\n\neach pos in $positions\n  Frame bg pos.change > 0 ? $accent : $danger`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      expect(frames.length).toBe(2)
      // Pin: backgrounds remain empty (Bug #24 in loop context)
      for (const f of frames) {
        expect(f.style.background).toBe('')
      }
    })

    it('Texts inside each-loop with conditional render correctly', () => {
      const root = render(
        `positions:\n  p1:\n    name: "Apple"\n  p2:\n    name: "Tesla"\n\neach pos in $positions\n  Text "$pos.name"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Apple', 'Tesla'])
    })
  })

  // ---------------------------------------------------------------------------
  // T11: Ternary in Text-content with interpolation
  // ---------------------------------------------------------------------------

  describe('T11: ternary in Text content with interpolation', () => {
    // Bug #26 (pinned): `Text x > 0 ? "Items: $x" : "Empty"` produces an
    // empty Text element. The ternary's quoted-string branches with
    // $-interpolation aren't being resolved to textContent.
    it('PIN Bug #26: ternary with interpolated string-branches → empty Text', () => {
      const root = render(`count: 3\n\nText count > 0 ? "Items: $count" : "Empty"`, container)
      const text = findByName(root, 'Text')!
      expect(text.textContent?.trim()).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // T12: Non-ASCII string operand + further props on the same line
  // ---------------------------------------------------------------------------

  describe('T12: non-ASCII string in inline ternary', () => {
    // Bug #25 (pinned): `Frame bg cat == "Geschäftlich" ? #x : #y, w 100, h 50`
    // — the parser fails to recover after the inline ternary; subsequent
    // properties (w 100, h 50) get treated as a new sibling instance.
    // Result: bg becomes `var(--cat)` (just the operand), and w/h appear
    // on a phantom child element.
    it('PIN Bug #25: ternary in style + trailing props mangled', () => {
      const root = render(
        `cat: "Geschäftlich"\n\nFrame bg cat == "Geschäftlich" ? #dbeafe : #fef3c7, w 100, h 50\n  Text "$cat"`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      // Current: bg falls back to var(--cat) instead of the conditional hex
      expect(frame.style.background).toContain('var(--cat)')
    })

    // Bug #25 is broader: even without trailing props, the parser doesn't
    // resolve the ternary in style — bg falls back to `var(--cat)` (just
    // the operand variable). Pin that.
    it('PIN Bug #25 (broad): ternary in style with $variable resolves to operand-as-token', () => {
      const root = render(
        `cat: "Privat"\n\nFrame bg cat == "Privat" ? #dcfce7 : #fef3c7`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      // Today: bg becomes var(--cat). When fixed: should be the resolved hex.
      expect(frame.style.background).toContain('var(--cat)')
    })
  })
})
