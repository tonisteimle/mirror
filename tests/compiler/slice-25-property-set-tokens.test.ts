// @vitest-environment jsdom
/**
 * Slice 25 — Property-Set-Token regression suite.
 *
 * Audit: `docs/refactoring/03-slice-25-property-set-tokens.md`. The audit
 * listed 11 findings (B-1 through B-11) and five V-decisions (V-1..V-5).
 * V-6/V-7/V-8 are deferred (cross-backend / states / picker slices).
 * V-9 (Re-Def, Empty-Set, Self-Ref-Edge) was verworfen — Self-Ref-Doppel-
 * Emit collapses out of V-1's recursive cycle-guard for free.
 *
 * Locks (RT-1..RT-12 from the audit):
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
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
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
})
