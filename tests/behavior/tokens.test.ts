/**
 * Tokens — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft Token-Resolution-Semantik:
 *  - Single-value, property-set
 *  - Suffix-resolution (`bg $primary` → primary.bg)
 *  - Direct-match (`bg $primary-bg`)
 *  - In Component-Definition, in Conditional, in each-Loop
 *  - Token-in-Token, numeric tokens, multiple suffixes
 *
 * Sub-Features TK1-TK10 aus docs/concepts/feature-test-execution-plan.md.
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

describe('Tokens — Behavior Spec', () => {
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
  // TK1-TK4: Single, property-set, suffix-, direct-match
  // ---------------------------------------------------------------------------

  describe('TK1: single-value token', () => {
    it('`primary.bg: #2271C1` resolves `bg $primary` to var(--primary-bg)', () => {
      const root = render(`primary.bg: #2271C1\n\nFrame bg $primary`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })
  })

  describe('TK2: property-set token', () => {
    it('expands all properties of the set', () => {
      const root = render(
        `cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle\n  Text "Hi"`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(26, 26, 26)')
      expect(frame.style.padding).toBe('16px')
      expect(frame.style.borderRadius).toBe('8px')
    })
  })

  describe('TK3: suffix-resolution per property', () => {
    it('different properties use different suffixes', () => {
      const root = render(
        `primary.bg: #2271C1\nprimary.col: white\nprimary.rad: 8\n\nFrame bg $primary, col $primary, rad $primary`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
      expect(frame.style.color).toContain('var(--primary-col)')
      expect(frame.style.borderRadius).toContain('var(--primary-rad)')
    })
  })

  describe('TK4: direct-match (token name with hyphen)', () => {
    it('`$primary-bg` direct match resolves', () => {
      const root = render(`primary-bg: #2271C1\n\nFrame bg $primary-bg`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // TK5-TK6: Component, token-in-token
  // ---------------------------------------------------------------------------

  describe('TK5: token in component definition', () => {
    it('Component-Definition uses tokens, instance gets resolved styles', () => {
      const root = render(
        `primary.bg: #2271C1\ntext.col: white\n\nBtn: Button bg $primary, col $text\n\nBtn "Save"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      expect(btn.style.background).toContain('var(--primary-bg)')
      expect(btn.style.color).toContain('var(--text-col)')
    })
  })

  describe('TK6: token-in-token reference', () => {
    it('`secondary.bg: $primary` chains to primary value', () => {
      const root = render(
        `primary.bg: #2271C1\nsecondary.bg: $primary\n\nFrame bg $secondary`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      // Output uses secondary's CSS variable (which itself references primary)
      expect(frame.style.background).toContain('var(--secondary-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // TK7-TK8: In conditional, in each
  // ---------------------------------------------------------------------------

  describe('TK7: token in conditional', () => {
    it('truthy → first token resolves', () => {
      const root = render(
        `primary.bg: #2271C1\nmuted.bg: #888\n\nactive: true\n\nFrame bg active ? $primary : $muted`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })

    it('falsy → second token resolves', () => {
      const root = render(
        `primary.bg: #2271C1\nmuted.bg: #888\n\nactive: false\n\nFrame bg active ? $primary : $muted`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--muted-bg)')
    })
  })

  describe('TK8: token in each-loop body', () => {
    it('every loop-rendered Frame uses the token', () => {
      const root = render(
        `accent.bg: #10b981\n\nitems:\n  a:\n    label: "First"\n  b:\n    label: "Second"\n\neach item in $items\n  Frame bg $accent`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      expect(frames.length).toBe(2)
      for (const frame of frames) {
        expect(frame.style.background).toContain('var(--accent-bg)')
      }
    })
  })

  // ---------------------------------------------------------------------------
  // TK9-TK10: Numeric, multi-suffix
  // ---------------------------------------------------------------------------

  describe('TK9: numeric tokens', () => {
    it('numeric tokens (pad/gap/fs) resolve to var()', () => {
      const root = render(
        `space.pad: 16\nspace.gap: 12\nsize.fs: 18\n\nFrame pad $space, gap $space\n  Text "Hello", fs $size`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.padding).toContain('var(--space-pad)')
      expect(frame.style.gap).toContain('var(--space-gap)')
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.fontSize).toContain('var(--size-fs)')
    })
  })

  describe('TK10: multiple suffix-tokens on one element', () => {
    it('bg + col both resolve correctly with same `$brand` token', () => {
      const root = render(
        `brand.bg: #2271C1\nbrand.col: white\n\nFrame bg $brand, col $brand`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--brand-bg)')
      expect(frame.style.color).toContain('var(--brand-col)')
    })

    it('Bug #29 fixed: `boc $brand, bor 2` keeps token-color (no shorthand reset)', () => {
      const root = render(`brand.boc: #1a5d9c\n\nFrame boc $brand, bor 2`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.borderColor).toBe('var(--brand-boc)')
      expect(frame.style.borderWidth).toBe('2px')
      expect(frame.style.borderStyle).toBe('solid')
    })
  })

  // ---------------------------------------------------------------------------
  // Robustness: undefined token references
  // ---------------------------------------------------------------------------

  describe('Robustness: undefined token reference', () => {
    it('reference to non-existent token compiles without crash', () => {
      expect(() => render(`Frame bg $undefined`, container)).not.toThrow()
    })

    it('reference to non-existent token: bg falls back gracefully', () => {
      // Either empty bg or var(--undefined). Both acceptable.
      const root = render(`Frame bg $undefined`, container)
      // No crash, no JS error → contract satisfied.
      expect(findByName(root, 'Frame')).not.toBeNull()
    })
  })
})
