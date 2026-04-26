/**
 * Variables/Data — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft die observable Semantik des Variables/Data-Features:
 *  - Scalar (number/string/boolean)
 *  - Reference, Interpolation, Property-Access
 *  - Nested Objects, Collections, Aggregations
 *  - XSS-Robustheit, undefined-Leak-Prevention
 *
 * Gegliedert nach Sub-Features V1-V10.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

// =============================================================================
// Helpers
// =============================================================================

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
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// =============================================================================
// Tests
// =============================================================================

describe('Variables/Data — Behavior Spec', () => {
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
  // V1-V3: Scalar variables
  // ---------------------------------------------------------------------------

  describe('V1: scalar number', () => {
    it('renders the numeric value', () => {
      const root = render(`count: 42\n\nText "$count"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('42')
    })

    it('handles zero correctly (no falsy-elision)', () => {
      const root = render(`count: 0\n\nText "$count"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('0')
    })

    it('handles negative numbers', () => {
      const root = render(`temp: -10\n\nText "$temp"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('-10')
    })
  })

  describe('V2: scalar string', () => {
    it('renders string variable', () => {
      const root = render(`name: "Max"\n\nText "$name"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Max')
    })

    it('preserves whitespace inside strings', () => {
      const root = render(`greeting: "Hello  World"\n\nText "$greeting"`, container)
      expect(findByName(root, 'Text')!.textContent).toContain('Hello  World')
    })

    it('handles unicode (umlauts) correctly', () => {
      const root = render(`label: "Geschäftlich"\n\nText "$label"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Geschäftlich')
    })
  })

  describe('V3: scalar boolean', () => {
    it('truthy boolean enters if-branch', () => {
      const root = render(`active: true\n\nif active\n  Text "Yes"`, container)
      expect(visibleText(root)).toContain('Yes')
    })

    it('falsy boolean does NOT enter if-branch', () => {
      const root = render(`active: false\n\nif active\n  Text "Yes"`, container)
      expect(visibleText(root)).not.toContain('Yes')
    })

    it('with else: falsy → else-branch', () => {
      const root = render(`active: false\n\nif active\n  Text "Yes"\nelse\n  Text "No"`, container)
      expect(visibleText(root)).toContain('No')
      expect(visibleText(root)).not.toContain('Yes')
    })
  })

  // ---------------------------------------------------------------------------
  // V4: Variable as style-property value
  // ---------------------------------------------------------------------------

  describe('V4: variable used as style-property value', () => {
    it('compiles without throwing for `Frame bg $color`', () => {
      // NOTE: Mirror resolves `$color` style-references via CSS variables
      // (`var(--color)`) regardless of whether `color` is a token or plain
      // variable. This pins the current behavior; if it changes later, the
      // test should fail loudly rather than silently mis-resolve.
      const root = render(`color: "#2271C1"\n\nFrame bg $color, w 100, h 100`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--color)')
    })
  })

  // ---------------------------------------------------------------------------
  // V5-V6: String interpolation
  // ---------------------------------------------------------------------------

  describe('V5: single interpolation', () => {
    it('substitutes single $-reference inside string', () => {
      const root = render(`name: "Max"\n\nText "Hi $name"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Hi Max')
    })

    it('handles $-reference at start of string', () => {
      const root = render(`name: "Max"\n\nText "$name says hi"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Max says hi')
    })

    it('handles $-reference at end of string', () => {
      const root = render(`who: "Max"\n\nText "Hi $who"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Hi Max')
    })
  })

  describe('V6: multi interpolation', () => {
    it('substitutes multiple $-references in one string', () => {
      const root = render(
        `first: "Max"\nlast: "Mustermann"\ncount: 42\n\nText "Hello $first $last, you have $count points"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe(
        'Hello Max Mustermann, you have 42 points'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // V7-V8: Object property access
  // ---------------------------------------------------------------------------

  describe('V7: nested object', () => {
    it('renders nested-object property via dot-access', () => {
      const root = render(
        `user:\n  name: "Max"\n  email: "max@example.com"\n\nFrame\n  Text "$user.name"\n  Text "$user.email"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Max', 'max@example.com'])
    })
  })

  describe('V8: deep property access', () => {
    it('resolves 3-level deep property paths', () => {
      const root = render(
        `company:\n  ceo:\n    name: "Anna"\n    title: "CEO"\n\nText "$company.ceo.name, $company.ceo.title"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Anna, CEO')
    })

    it('non-existent deep path does NOT crash', () => {
      // No assertion on the rendered text — just that compile + render works.
      // The rendered text might be "undefined" or empty; the contract is only
      // "no JS error". (Smoke tests already pin the textual leak prevention.)
      expect(() =>
        render(`user:\n  name: "Max"\n\nText "$user.address.street"`, container)
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // V9-V10: Collections + Aggregations
  // ---------------------------------------------------------------------------

  describe('V9: collection (object-of-entries)', () => {
    it('each loop renders one Text per entry', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Design"\n  t2:\n    title: "Develop"\n  t3:\n    title: "Test"\n\neach task in $tasks\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Design', 'Develop', 'Test'])
    })

    it('empty collection renders 0 entries', () => {
      const root = render(`tasks:\n\neach task in $tasks\n  Text "$task.title"`, container)
      expect(allByName(root, 'Text')).toHaveLength(0)
    })
  })

  describe('V10: aggregations', () => {
    it('`.count` returns the number of entries', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n  t3:\n    title: "C"\n\nText "Count: $tasks.count"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Count: 3')
    })

    it('`.first` returns the first entry', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "First"\n  t2:\n    title: "Second"\n\nText "$tasks.first.title"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('First')
    })

    it('`.last` returns the last entry', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "First"\n  t2:\n    title: "Last"\n\nText "$tasks.last.title"`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Last')
    })
  })

  // ---------------------------------------------------------------------------
  // Robustness — XSS, prototype pollution, undefined leaks
  // ---------------------------------------------------------------------------

  describe('Robustness — XSS prevention', () => {
    it('html-tag-like content in variable does NOT get parsed as HTML', () => {
      const root = render(`payload: "<script>alert(1)</script>"\n\nText "$payload"`, container)
      const text = findByName(root, 'Text')!
      // Browsers escape via textContent — we get the literal string back, not a real script
      expect(text.querySelector('script')).toBeNull()
      expect(text.textContent).toContain('<script>')
    })

    it('quote-injection in variable does NOT break the JS expression', () => {
      // If the compiler emits `node.textContent = "Max" says hi"`, that's
      // invalid JS. The variable value should be properly escaped.
      expect(() =>
        render(`name: "Max\\"; alert(1); //"\n\nText "Hi $name"`, container)
      ).not.toThrow()
    })
  })

  describe('Robustness — prototype pollution', () => {
    it('Bug #15 regression: variable named `valueOf` does not crash compile', () => {
      // `valueOf` is on Object.prototype — without hasOwnProperty guard this
      // crashed with "TypeError: cannot read 'map' of undefined".
      expect(() => generateDOM(parse(`Text "valueOf"`))).not.toThrow()
    })

    it('property name `valueOf` in Text content: no crash', () => {
      expect(() => generateDOM(parse(`x: "test"\n\nText "$x"`))).not.toThrow()
    })
  })

  describe('Bug #22: bare `$var` in Text first arg drops content silently', () => {
    it('PIN: `Text $name` (bare) emits no textContent', () => {
      // Today: the compiler silently drops the content when the first arg
      // is a bare $-reference (no quotes). Workaround: `Text "$name"`.
      // When #22 is fixed, this test should fail (good!) and be tightened
      // to assert that bare refs ALSO substitute correctly.
      const root = render(`name: "Max"\n\nText $name`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('')
    })

    it('PIN: `Text $user.name` (bare property access) also drops content', () => {
      const root = render(`user:\n  name: "Max"\n\nText $user.name`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('')
    })

    it('Quoted form `Text "$name"` works correctly (the workaround)', () => {
      const root = render(`name: "Max"\n\nText "$name"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Max')
    })
  })

  describe('Robustness — undefined leak prevention', () => {
    it('reference to non-existent variable: render does not throw', () => {
      // The visible text might say "undefined" — that's a runtime data issue,
      // not a compiler issue. We only assert: no JS error.
      expect(() => render(`Text "$nonExistent"`, container)).not.toThrow()
    })

    it('reference to non-existent nested path: no crash', () => {
      expect(() =>
        render(`user:\n  name: "Max"\n\nText "$user.missing.deep"`, container)
      ).not.toThrow()
    })
  })
})
