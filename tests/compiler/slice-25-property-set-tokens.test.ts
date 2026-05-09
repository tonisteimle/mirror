// @vitest-environment jsdom
/**
 * Slice 25 — Property-Set-Token regression suite.
 *
 * Audit: `docs/refactoring/03-slice-25-property-set-tokens.md`. The audit
 * listed 11 findings (B-1 through B-11). The original split deferred B-11
 * (React-Backend ignores Property-Sets) on the grounds that it was a
 * cross-backend issue. Follow-up work in Slice 25 brought React-Backend
 * up to parity with DOM for the property-set surface; RT-13/RT-14 lock
 * that parity here.
 *
 * Locks:
 *
 *   - RT-1  Multi-spread `$a, $b` validator-clean + both expanded
 *   - RT-2  3-level chain `c:pad 8; b:$c; a:$b; Frame $a` → padding survives
 *   - RT-3  5-level chain terminates + all properties propagate
 *   - RT-4  2-cycle `a:$b; b:$a` terminates without content-fallback
 *   - RT-5  3-cycle `a→b→c→a` terminates without content-fallback
 *   - RT-6  Self-ref `a: $a, bg #f00` emits `bg #f00` exactly once
 *   - RT-7  Undefined ref `Frame $undef` → W500, no `content` rewrite
 *   - RT-8  Empty-set: parser drops, validator W500 picks it up
 *   - RT-9  Override AFTER spread: `Frame $cs, bg #f00` → `bg #f00` wins
 *   - RT-10 Override BEFORE spread: `Frame bg #f00, $cs` → set wins
 *   - RT-11 Bare `Text $name` keeps content-rewrite (content-bearing gate)
 *   - RT-12 Component-mixin `Input ..., Field` still works (one-level)
 *   - RT-13 React-Backend expands property-sets (B-11 Cross-Backend parity)
 *   - RT-14 React-Backend supports deep chains and multi-spread
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { Validator } from '../../compiler/validator/validator'

function compileToCreateUI(source: string): string {
  return generateDOM(parse(source))
}

function validate(source: string) {
  const v = new Validator()
  return v.validate(parse(source))
}

/**
 * Find the `Object.assign(node_X.style, { ... })` block for a given node id
 * and return the entries it sets. Used to assert which CSS properties
 * survived expansion + merge.
 */
function styleAssignFor(js: string, nodeVar = 'node_1'): Record<string, string> {
  const re = new RegExp(`Object\\.assign\\(${nodeVar}\\.style,\\s*\\{([^}]*)\\}\\)`, 's')
  const m = js.match(re)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split(',')) {
    const kv = line.match(/^\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]*)['"]\s*$/)
    if (kv) out[kv[1]] = kv[2]
  }
  return out
}

describe('Slice 25 — Property-Set-Tokens', () => {
  // -------------------------------------------------------------------------
  // RT-1 — Multi-spread (B-1 fix: validator skip propset)
  // -------------------------------------------------------------------------
  describe('RT-1 — Multi-spread $a, $b is validator-clean and fully expands', () => {
    it('validator does not flag duplicate-property on parser-internal `propset`', () => {
      const result = validate(`a: pad 16
b: rad 8
Frame $a, $b`)
      const dupWarn = result.warnings.find(w => w.code === 'W110')
      expect(dupWarn).toBeUndefined()
    })

    it('both sets expand onto the consuming Frame', () => {
      const js = compileToCreateUI(`a: pad 16
b: rad 8
Frame $a, $b`)
      const styles = styleAssignFor(js)
      expect(styles['padding']).toBe('16px')
      expect(styles['border-radius']).toBe('8px')
    })
  })

  // -------------------------------------------------------------------------
  // RT-2/RT-3 — Deep chains (B-3 + B-10 fix: parser dispatch + recursive expand)
  // -------------------------------------------------------------------------
  describe('RT-2/RT-3 — Property-set chains expand to any depth', () => {
    it('3-level single-ref chain `c:pad 8; b:$c; a:$b; Frame $a` propagates pad', () => {
      const js = compileToCreateUI(`c: pad 8
b: $c
a: $b
Frame $a`)
      expect(styleAssignFor(js)['padding']).toBe('8px')
    })

    it('5-level single-ref chain terminates and propagates', () => {
      const js = compileToCreateUI(`e: pad 8
d: $e
c: $d
b: $c
a: $b
Frame $a`)
      expect(styleAssignFor(js)['padding']).toBe('8px')
    })

    it('5-level multi-prop chain merges all levels (rad 4 + bg #f00 + gap 12 + pad 8)', () => {
      const js = compileToCreateUI(`e: pad 8
d: $e, gap 12
c: $d, bg #f00
b: $c, rad 4
a: $b
Frame $a`)
      const styles = styleAssignFor(js)
      expect(styles['padding']).toBe('8px')
      expect(styles['gap']).toBe('12px')
      expect(styles['background']).toBe('#f00')
      expect(styles['border-radius']).toBe('4px')
    })
  })

  // -------------------------------------------------------------------------
  // RT-4/RT-5 — Cycles (B-4 fix: visited-stack)
  // -------------------------------------------------------------------------
  describe('RT-4/RT-5 — Cycles terminate without text-content fallback', () => {
    it('2-cycle `a:$b; b:$a` terminates and does NOT rewrite to content', () => {
      const js = compileToCreateUI(`a: $b
b: $a
Frame $a`)
      expect(js).not.toContain('formatInlineMarkdown($get("a"))')
      expect(js).not.toContain("_runtime.bindText(node_1, 'a')")
      expect(js).not.toContain('innerHTML = formatInlineMarkdown($get')
    })

    it('3-cycle `a→b→c→a` terminates without content-fallback', () => {
      const js = compileToCreateUI(`a: $b
b: $c
c: $a
Frame $a`)
      expect(js).not.toContain('formatInlineMarkdown($get("a"))')
      expect(js).not.toContain('innerHTML = formatInlineMarkdown($get')
    })
  })

  // -------------------------------------------------------------------------
  // RT-6 — Self-ref single emit (B-4 fix)
  // -------------------------------------------------------------------------
  describe('RT-6 — Self-reference `a: $a, bg #f00` emits one background', () => {
    it('background appears exactly once in the style assignment', () => {
      const js = compileToCreateUI(`a: $a, bg #f00
Frame $a`)
      const styles = styleAssignFor(js)
      expect(styles['background']).toBe('#f00')
      // Not counting whether the literal text appears 1× or 2× in the
      // serialised object literal — only that, post-deserialisation, there's
      // one entry.
      const matches = (js.match(/'background': '#f00'/g) ?? []).length
      expect(matches).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // RT-7/RT-8 — Undefined / empty (V-4 + V-5)
  // -------------------------------------------------------------------------
  describe('RT-7 — Undefined ref triggers W500 and skips content-rewrite', () => {
    it('`Frame $undefined` warns W500 and does not write innerHTML', () => {
      const result = validate('Frame $undefined')
      const undef = result.warnings.find(w => w.code === 'W500')
      expect(undef).toBeDefined()
      expect(undef?.message).toContain('$undefined')

      const js = compileToCreateUI('Frame $undefined')
      expect(js).not.toContain('innerHTML = formatInlineMarkdown($get')
    })
  })

  describe('RT-8 — Empty property-set is surfaced by validator', () => {
    it('`empty:\\nFrame $empty` triggers W500 (token undefined) on the consumer', () => {
      const result = validate(`empty:
Frame $empty`)
      const undef = result.warnings.find(w => w.code === 'W500')
      expect(undef).toBeDefined()
      expect(undef?.message).toContain('$empty')
    })
  })

  // -------------------------------------------------------------------------
  // RT-9/RT-10 — Override semantics (lock current behavior; doc-only)
  // -------------------------------------------------------------------------
  describe('RT-9/RT-10 — Override semantics is order-sensitive (last-wins)', () => {
    it('Override AFTER spread: instance value wins', () => {
      const js = compileToCreateUI(`cs: bg #1a1a1a, pad 16
Frame $cs, bg #f00`)
      expect(styleAssignFor(js)['background']).toBe('#f00')
      expect(styleAssignFor(js)['padding']).toBe('16px')
    })

    it('Override BEFORE spread: set value wins (last-wins under merge)', () => {
      const js = compileToCreateUI(`cs: bg #1a1a1a, pad 16
Frame bg #f00, $cs`)
      expect(styleAssignFor(js)['background']).toBe('#1a1a1a')
      expect(styleAssignFor(js)['padding']).toBe('16px')
    })
  })

  // -------------------------------------------------------------------------
  // RT-11 — Bare `Text $name` is not regressed by the V-5 gate
  // -------------------------------------------------------------------------
  describe('RT-11 — Bare-form `Text $name` keeps content-rewrite', () => {
    it('Text + bare $-ref still receives the content marker', () => {
      const js = compileToCreateUI(`name: "Max"
Text $name`)
      // The bare form must still substitute via the data-binding path —
      // this is the documented Bug #22 behavior, preserved for content-
      // bearing primitives only.
      expect(js).toContain('innerHTML = formatInlineMarkdown')
    })

    it('Frame + bare $-ref does NOT receive the content marker', () => {
      // Same bare form on a layout primitive must NOT inject text content.
      // Validator surfaces W500; renderer stays silent.
      const js = compileToCreateUI(`name: "Max"
Frame $name`)
      // Frame should not get innerHTML = formatInlineMarkdown(...) — the
      // gating in Phase B.2 specifically prevents content on layout
      // primitives. The Frame's first node still emits its style block,
      // just without an innerHTML assignment for the unresolved name.
      expect(js).not.toContain("innerHTML = formatInlineMarkdown($get('name'))")
      expect(js).not.toContain('innerHTML = formatInlineMarkdown($get("name"))')
    })
  })

  // -------------------------------------------------------------------------
  // RT-12 — Component-mixin path is one-level (not transitively merged)
  // -------------------------------------------------------------------------
  describe('RT-12 — Component-as-mixin (`Input …, Field`) keeps one-level semantics', () => {
    it('component-mixin spreads its top-level properties into the instance', () => {
      const js = compileToCreateUI(`Field: w full
Input placeholder "x", Field`)
      // The Input instance should receive `w full` from Field. Don't lock
      // the exact CSS keyword — different layout-resolvers map `w full` to
      // either `width: 100%` or `align-self: stretch`. Just check that
      // some width-affecting style is present.
      const styles = styleAssignFor(js)
      const widthish =
        styles['width'] || styles['align-self'] || styles['flex'] || styles['flex-basis']
      expect(widthish).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // RT-13/RT-14 — React-Backend parity (B-11 fix)
  // -------------------------------------------------------------------------
  describe('RT-13 — React-Backend expands property-sets', () => {
    it('basic `Frame $cardstyle` produces JSX with the merged style props', () => {
      const jsx = generateReact(
        parse(`cardstyle: bg #1a1a1a, pad 16, rad 8
Frame $cardstyle`)
      )
      // The DOM backend produces inline-style with all three properties; the
      // React backend should reach the same set in JSX form. We don't lock
      // exact unit-suffix or camel-vs-kebab — those are React-backend pre-
      // existing rendering quirks. Just lock that the keys are present.
      expect(jsx).toMatch(/backgroundColor:\s*'#1a1a1a'/)
      expect(jsx).toMatch(/padding:\s*'16'?/)
      expect(jsx).toMatch(/borderRadius:\s*'8'?/)
    })

    it('property-set on a Component definition propagates through React JSX', () => {
      // `Btn: $btnbase, bg #2271C1` — set referenced inside a component def.
      // Pre-fix the React backend would emit `<button />` with no styles
      // because it never expanded `$btnbase`.
      const jsx = generateReact(
        parse(`btnbase: pad 10 20, rad 6
Btn: $btnbase, bg #2271C1, col white
Btn "Save"`)
      )
      expect(jsx).toMatch(/backgroundColor:\s*'#2271C1'/)
      expect(jsx).toMatch(/color:\s*'white'/)
      expect(jsx).toMatch(/borderRadius:\s*'6'?/)
    })
  })

  describe('RT-14 — React-Backend supports deep chains and multi-spread', () => {
    it('3-level chain `c:pad 8; b:$c; a:$b; Frame $a` reaches React', () => {
      const jsx = generateReact(
        parse(`c: pad 8
b: $c
a: $b
Frame $a`)
      )
      expect(jsx).toMatch(/padding:\s*'8'?/)
    })

    it('multi-spread `Frame $a, $b` merges both sets in React', () => {
      const jsx = generateReact(
        parse(`a: pad 16
b: rad 8
Frame $a, $b`)
      )
      expect(jsx).toMatch(/padding:\s*'16'?/)
      expect(jsx).toMatch(/borderRadius:\s*'8'?/)
    })

    it('cycle `a:$b; b:$a; Frame $a` terminates and produces empty-style div', () => {
      const jsx = generateReact(
        parse(`a: $b
b: $a
Frame $a`)
      )
      // No throw, terminates, no spurious styles from a phantom expansion.
      // The Frame can have other (default) styles — just lock that the
      // cycle didn't introduce arbitrary text content or crash.
      expect(jsx).toContain('export default function App()')
      expect(jsx).not.toContain('formatInlineMarkdown')
    })
  })
})
