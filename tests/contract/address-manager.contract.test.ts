/**
 * Address-Manager — Contract Test (Schicht 3 der Test-Pyramide)
 *
 * Asserts the *intended* per-app behavior of `examples/address-manager.mirror`
 * with focus on **Variables/Data**: nested-object access (`$address.firstName`),
 * collections (`each address in $addresses`), interpolation in Text, and
 * non-trivial state references (`$selectedAddress.X`).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(join(__dirname, '..', '..', 'examples', 'address-manager.mirror'), 'utf-8')

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

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

function visibleText(root: Element): string {
  // Skip display:none subtrees and <style>-elements so the assertion isn't
  // fooled by (a) hidden detail-frames or (b) injected CSS keyframes.
  const out: string[] = []
  const walk = (node: Element) => {
    if (node.tagName === 'STYLE' || node.tagName === 'SCRIPT') return
    if ((node as HTMLElement).style?.display === 'none') return
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) out.push(child.textContent ?? '')
      else if (child.nodeType === 1) walk(child as Element)
    }
  }
  walk(root)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

describe('address-manager — Variable/Data Contract', () => {
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
  // Collection: 4 addresses → 4 AddressCards
  // ---------------------------------------------------------------------------

  describe('Collection rendering (V9)', () => {
    it('rendert genau 4 AddressCards (entsprechend $addresses.count == 4)', () => {
      const cards = allByName(root, 'AddressCard')
      expect(cards.length).toBe(4)
    })
  })

  // ---------------------------------------------------------------------------
  // Property access: each.firstName, each.lastName, each.city
  // ---------------------------------------------------------------------------

  describe('Property access in loop (V7-V8)', () => {
    it('zeigt firstName aller 4 Adressen', () => {
      const text = visibleText(root)
      expect(text).toContain('Max')
      expect(text).toContain('Anna')
      expect(text).toContain('Thomas')
      expect(text).toContain('Lisa')
    })

    it('zeigt lastName aller 4 Adressen', () => {
      const text = visibleText(root)
      expect(text).toContain('Mustermann')
      expect(text).toContain('Schmidt')
      expect(text).toContain('Weber')
      expect(text).toContain('Braun')
    })

    // PIN — Bug #22: `Text $address.city` (bare reference, no quotes) emits
    // NO `textContent` at all. The user-visible cities are empty. The fix
    // would be to author with quotes: `Text "$address.city"`. Until #22 is
    // fixed, this test pins the current (defective) behavior.
    it('Bug #22: Städte sind aktuell NICHT sichtbar (bare $x.y in Text)', () => {
      const text = visibleText(root)
      expect(text).not.toContain('Berlin')
      expect(text).not.toContain('München')
    })

    // PIN: Mirror renders `Text $a + " " + $b` LITERALLY: it substitutes
    // `$a` and `$b` but does NOT evaluate the `+`-concatenation. The
    // source uses this pattern; the user-visible text contains the literal
    // ` + " " + ` glue. Documenting current behavior — a future Mirror
    // version may decide to evaluate JS-style concat in Text content,
    // at which point this test would fail and prompt the rewrite.
    it('PIN: Text-Content-Konkatenation mit `+` wird NICHT evaluiert', () => {
      const text = visibleText(root)
      expect(text).toContain('Max + " " + Mustermann')
    })
  })

  // ---------------------------------------------------------------------------
  // String interpolation in conditional ternary (regression for #18)
  // ---------------------------------------------------------------------------

  describe('Conditional with non-ASCII string operand (Bug #18 regression)', () => {
    it('Badges enthalten "Geschäftlich" / "Privat" / "Familie" als Text', () => {
      const text = visibleText(root)
      expect(text).toContain('Geschäftlich')
      expect(text).toContain('Privat')
      expect(text).toContain('Familie')
    })
  })

  // ---------------------------------------------------------------------------
  // selectedAddress: null at startup → detail-card hidden
  // ---------------------------------------------------------------------------

  describe('selectedAddress null-state (V3 + undefined-Leak-Prevention)', () => {
    it('Detail-Frame ist initial unsichtbar (display: none)', () => {
      // The `if $selectedAddress` block should be hidden because selectedAddress is null
      // We can't easily assert which frame is the detail one without parsing the source,
      // but we can assert: visible text doesn't include the placeholder for non-selection
      // OR DOES include the empty-state message.
      const text = visibleText(root)
      // empty-state message: "Adresse auswählen" / "Wähle eine Adresse..."
      expect(text).toContain('Adresse auswählen')
    })

    it('rendering does not crash with selectedAddress.firstName being null/undefined', () => {
      // Pinning Bug-#21-adjacent: undefined-property-access in template should not throw
      expect(() => render(document.createElement('div'))).not.toThrow()
    })
  })
})
