/**
 * Slice 21 — Komponenten-Definition & -Verwendung Iter-2 RTs.
 *
 * Iter-1 implemented Phase A:
 *   V-2 — E002 + Pascal-Case suggestion when lowercase use matches a defined
 *         PascalCase component (validator.ts:1090–1112)
 *   V-6 — E603 duplicate component-definition (validator.ts:161 area)
 *   V-7 — W504 empty component-definition (validator.ts:166–188)
 *
 * Iter-1 deferred V-1 (compile-strict undefined component), V-3 (self-
 * recursion explicit diagnose), V-4 (nested-def parser-reject) to dedicated
 * successor slices.
 *
 * Iter-2 RTs lock the Phase A surface AND the cross-slice surface that
 * downstream slices depend on:
 *   RT-A1..A3 — Phase A diagnostic emit
 *   RT-B     — Cross-Slice with Slice 22 (`as Button`)
 *   RT-C     — Cross-Slice with Slice 25 (property-set inside Component-Def)
 *   RT-D     — V-3 deferred-state lock (DOM marker for self-recursion)
 *
 * RT-D documents the *deferred* state — it locks the current behaviour so
 * the dedicated Slice-21b (build-time-strict) re-open can re-baseline.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { Validator } from '../../compiler/validator/validator'

describe('Slice 21 Iter-2 / Phase A diagnostic emit (V-2/V-6/V-7)', () => {
  // RT-A1 — V-2 Pascal-Case suggestion
  it('RT-A1 — lowercase use of PascalCase-defined component → E002 + suggestion', () => {
    const v = new Validator()
    const result = v.validate(parse(`Btn: bg #2271C1, col white\nbtn "Save"`))
    const e = result.errors.find(e => e.code === 'E002')
    expect(e).toBeDefined()
    expect(e?.message).toContain('btn')
    // Suggestion exists either via similarity match or via Pascal-Case branch.
    expect((e as any)?.suggestion).toBeDefined()
    expect((e as any)?.suggestion).toMatch(/Btn/)
  })

  // RT-A2 — V-6 Duplicate-definition error
  it('RT-A2 — duplicate component definition → E603 with last-wins runtime', () => {
    const v = new Validator()
    const result = v.validate(parse(`Btn: bg #f00\nBtn: bg #0f0\nBtn "X"`))
    const e = result.errors.find(e => e.code === 'E603')
    expect(e).toBeDefined()
    expect(e?.message).toContain('Btn')
    // Last-wins runtime: the second definition's bg should reach DOM.
    const dom = generateDOM(parse(`Btn: bg #f00\nBtn: bg #0f0\nBtn "X"`), {
      skipPrelude: true,
    } as any)
    expect(dom).toContain('#0f0')
    expect(dom).not.toContain("background': '#f00'")
  })

  // RT-A3 — V-7 Empty-definition warning
  it('RT-A3 — empty component definition → W504', () => {
    const v = new Validator()
    const result = v.validate(parse(`Btn:\nBtn "X"`))
    const w = result.warnings.find(w => w.code === 'W504')
    expect(w).toBeDefined()
    expect(w?.message).toContain('Btn')
    expect((w as any)?.suggestion).toBeDefined()
  })
})

describe('Slice 21 Iter-2 / Cross-Slice surface', () => {
  // RT-B — Slice 22 boundary: as-Inheritance integrates with component-resolver
  it('RT-B — `PrimaryBtn as Button` resolves through component-resolver to <button>', () => {
    const dom = generateDOM(
      parse(`PrimaryBtn as Button: bg #2271C1, col white, pad 10 20\nPrimaryBtn "Click"`),
      { skipPrelude: true } as any
    )
    // The instance should render as a <button> element (Slice 22 contract).
    expect(dom).toMatch(/createElement\(['"]button['"]\)|document\.createElement\(['"]button['"]\)/)
    expect(dom).toContain('#2271C1')
    expect(dom).toContain('10px 20px')
  })

  // RT-C — Slice 25 boundary: property-set inside Component-Def
  it('RT-C — `Btn: $btnbase, bg #2271C1` expands the property-set', () => {
    const dom = generateDOM(
      parse(`btnbase: pad 10 20, rad 6\nBtn: $btnbase, bg #2271C1, col white\nBtn "Save"`),
      { skipPrelude: true } as any
    )
    // All three sources land on the Btn instance: btnbase (pad+rad),
    // direct overrides (bg+col).
    expect(dom).toContain("'padding': '10px 20px'")
    expect(dom).toContain("'border-radius': '6px'")
    expect(dom).toContain('#2271C1')
  })
})

describe('Slice 21 Iter-2 / Deferred-state locks', () => {
  // RT-D — V-3 self-recursion deferred-state lock
  // Re-Open-Trigger: dedicated Slice-21b (build-time-strict) — currently
  // self-recursion terminates silently at depth 2 via Unknown-fallback.
  // This RT locks the current behaviour so the future strict-mode work
  // has a stable baseline to diff against.
  it('RT-D — self-recursion terminates without throw (deferred-state V-3)', () => {
    const dom = generateDOM(parse(`Tree: bg #f00\n  Tree\nTree`), {
      skipPrelude: true,
    } as any)
    // Termination: emission completes without exception. Bg from Tree
    // emerges on the rendered instance. The recursion stops; the final
    // emit form is locked at "no exception, content emitted" not at any
    // specific marker shape (V-3 will re-baseline if/when implemented).
    expect(dom).toContain('#f00')
    expect(dom.length).toBeGreaterThan(100)
  })
})
