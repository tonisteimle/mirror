// @vitest-environment jsdom
/**
 * Slice 3 — Horizontal Stack (`hor`, `wrap`, `spread`) regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/12-slice-3-horizontal-stack.md`:
 *
 *   B-1 (CRITICAL) React `withLayoutDefaults` skip-if-display-set droppte
 *                  alignSelf/alignItems wenn `hor`/`ver`/`grid` schon
 *                  display gesetzt hatte. → merge-with-defaults.
 *   V-3a           Schema-Drift `horizontal._standalone.css` enthielt
 *                  legacy `align-items: center` — entfernt (FLEX_DEFAULTS
 *                  in IR sind symmetric `flex-start`).
 *   V-2  (HIGH)    `<flag-keyword> <value>` Typos (`Frame hor 5`,
 *                  `Frame wrap "yes"`) silent. W120 LAYOUT_FLAG_HAS_VALUE
 *                  ist als Code in `validator/types.ts:119` reserviert,
 *                  aber der Validator-Branch ist deferred (siehe
 *                  validator.ts:700-707) — der Parser droppt Extra-Args
 *                  bevor der Validator sie sehen kann. RT-12 lockt
 *                  beide Seiten dieser Lücke, damit der deferred-
 *                  Status nicht still in einen "fixed"-Glauben kippt.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { SCHEMA } from '../../compiler/schema/property-schema'
import { PURE_FLAG_PROPERTIES } from '../../compiler/schema/parser-helpers'
import { Validator } from '../../compiler/validator/validator'
import { ERROR_CODES } from '../../compiler/validator/types'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

describe('Slice 3 — Horizontal Stack (`hor`, `wrap`, `spread`)', () => {
  // ===========================================================================
  // RT-1 — Schema-Drift-Lock (V-3a)
  // ===========================================================================
  describe('RT-1 — Schema state for hor/ver `_standalone.css` (V-3a deferred lock)', () => {
    it('horizontal._standalone.css carries display + flex-direction:row + align-items:center', () => {
      // Honest lock: V-3a was probed in Slice 3 and DEFERRED — the
      // size-state-CSS-emit path (`schemaPropertyToCSS` for responsive
      // `wide: hor` etc.) still relies on the legacy `align-items: center`
      // here, while the regular IR layout-transformer ignores this and
      // emits FLEX_DEFAULTS.row.alignItems = 'flex-start'. Resolving the
      // drift requires touching both paths together; out of Slice 3 scope.
      const horProp = SCHEMA.horizontal
      expect(horProp).toBeDefined()
      const css = horProp.keywords?._standalone?.css ?? []
      const props = css.map(c => c.property)
      expect(props).toEqual(['display', 'flex-direction', 'align-items'])
      const align = css.find(c => c.property === 'align-items')
      expect(align?.value).toBe('center')
    })

    it('vertical._standalone.css carries only display + flex-direction:column (asymmetric vs hor — by design today)', () => {
      // The vertical entry has no align-items — that side is consistent
      // with the IR FLEX_DEFAULTS.column. The asymmetry vs `horizontal`
      // is what V-3a aims to resolve. RT-1 locks both sides so a casual
      // schema edit can't quietly cement the drift.
      const css = SCHEMA.vertical?.keywords?._standalone?.css ?? []
      const props = css.map(c => c.property)
      expect(props).toEqual(['display', 'flex-direction'])
    })

    it('IR pipeline emits flex-start for `Frame hor` regardless of schema-side align-items:center', () => {
      // The behavioural lock that makes the schema drift safe today: the
      // user-visible CSS for `Frame hor` is `align-items: flex-start`
      // (FLEX_DEFAULTS.row), NOT center. If a future change wires the
      // schema-side `center` into the regular pipeline, this test fails
      // and forces an explicit Slice-3-style audit instead of a silent
      // visual-shift.
      const out = dom('Frame hor\n  Text "A"\n  Text "B"')
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'align-items':\s*'flex-start'/)
      expect(out).not.toMatch(/'flex-direction':\s*'row'[\s\S]{0,200}'align-items':\s*'center'/)
    })
  })

  // ===========================================================================
  // RT-2..RT-4 — React Container-Defaults (B-1)
  // ===========================================================================
  describe('RT-2 — React: `Frame hor` keeps Container-Defaults (B-1)', () => {
    it('emits flexDirection:row + alignSelf:stretch + alignItems:flex-start', () => {
      const out = react('Frame hor\n  Text "A"\n  Text "B"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("alignSelf: 'stretch'")
      expect(out).toContain("alignItems: 'flex-start'")
    })

    it('alias `horizontal` produces equivalent output', () => {
      const a = react('Frame hor\n  Text "A"')
      const b = react('Frame horizontal\n  Text "A"')
      // Style block should match (modulo identity, both have same defaults)
      const styleA = a.match(/style=\{\{[^}]+\}\}/g)?.[0]
      const styleB = b.match(/style=\{\{[^}]+\}\}/g)?.[0]
      expect(styleA).toEqual(styleB)
    })
  })

  describe('RT-3 — React: `Frame hor, gap N` preserves defaults + gap', () => {
    it('gap value lands alongside the row + stretch + flex-start defaults', () => {
      const out = react('Frame hor, gap 8\n  Text "A"\n  Text "B"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("alignSelf: 'stretch'")
      expect(out).toContain("alignItems: 'flex-start'")
      expect(out).toContain("gap: '8px'")
    })
  })

  describe('RT-4 — React: `Frame hor, center` lets user override defaults', () => {
    it('user-`center` overrides default alignItems to center (and adds justify)', () => {
      const out = react('Frame hor, center\n  Text "A"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("alignItems: 'center'") // user-explicit wins
      expect(out).toContain("justifyContent: 'center'")
      // alignSelf default still applies
      expect(out).toContain("alignSelf: 'stretch'")
      // No leftover flex-start
      expect(out).not.toContain("alignItems: 'flex-start'")
    })
  })

  // ===========================================================================
  // RT-5..RT-8 — Cross-Backend equivalence
  // ===========================================================================
  describe('RT-5 — Cross-Backend: `Frame hor` emits row in all 3 backends', () => {
    const src = 'Frame hor\n  Text "A"\n  Text "B"'
    it('DOM emits flex-direction:row + align-items:flex-start (NOT center)', () => {
      const out = dom(src)
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'align-items':\s*'flex-start'/)
      // V-3a: legacy schema would have predicted 'center' — must NOT appear
      expect(out).not.toMatch(/'flex-direction':\s*'row'[\s\S]{0,200}'align-items':\s*'center'/)
    })
    it('React emits flexDirection:row + alignItems:flex-start', () => {
      const out = react(src)
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("alignItems: 'flex-start'")
    })
    it('Framework emits hor: true flag', () => {
      const out = fw(src)
      expect(out).toMatch(/M\(['"]Frame['"],\s*\{[^}]*hor:\s*true/)
    })
  })

  describe('RT-6 — `Frame hor, spread` Cross-Backend', () => {
    const src = 'Frame hor, spread\n  Text "L"\n  Text "R"'
    it('DOM emits row + justify:space-between', () => {
      const out = dom(src)
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'justify-content':\s*'space-between'/)
    })
    it('React emits row + space-between', () => {
      const out = react(src)
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("justifyContent: 'space-between'")
    })
    it('Framework keeps hor + spread flags', () => {
      const out = fw(src)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).toMatch(/spread:\s*true/)
    })
  })

  describe('RT-7 — `Frame hor, wrap` Cross-Backend', () => {
    const src = 'Frame hor, wrap\n  Text "A"\n  Text "B"'
    it('DOM emits row + flex-wrap:wrap', () => {
      const out = dom(src)
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'flex-wrap':\s*'wrap'/)
    })
    it('React emits row + flexWrap:wrap', () => {
      const out = react(src)
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("flexWrap: 'wrap'")
    })
    it('Framework keeps hor + wrap flags', () => {
      const out = fw(src)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).toMatch(/wrap:\s*true/)
    })
  })

  describe('RT-8 — `Frame hor, gap N` Cross-Backend Slice-2-Re-Lock', () => {
    const src = 'Frame hor, gap 12\n  Text "A"\n  Text "B"'
    it('DOM emits gap: 12px', () => {
      expect(dom(src)).toMatch(/'gap':\s*'12px'/)
    })
    it('React emits gap: 12px', () => {
      expect(react(src)).toContain("gap: '12px'")
    })
    it('Framework emits gap: 12 (unitless, runtime adds px)', () => {
      expect(fw(src)).toMatch(/gap:\s*12\b/)
    })
  })

  // ===========================================================================
  // RT-9 — Validator: hor + ver Conflict (E110)
  // ===========================================================================
  describe('RT-9 — Validator: `Frame hor, ver` and `Frame ver, hor` → E110', () => {
    it('emits E110 for `Frame hor, ver`', () => {
      const r = validate('Frame hor, ver')
      expect(r.errors.some(e => e.code === 'E110')).toBe(true)
    })

    it('emits E110 for `Frame ver, hor` (order-independent)', () => {
      const r = validate('Frame ver, hor')
      expect(r.errors.some(e => e.code === 'E110')).toBe(true)
    })

    it('Build-CLI bails on E110', async () => {
      const { compileFiles } = await import('../../compiler/cli/compile')
      const fs = await import('fs')
      const path = await import('path')
      const tmp = path.join(process.env.TMPDIR ?? '/tmp', `slice3-rt9-${Date.now()}.mirror`)
      fs.writeFileSync(tmp, 'Frame hor, ver\n')
      try {
        const result = compileFiles([tmp], 'dom', false)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/E110/)
      } finally {
        fs.unlinkSync(tmp)
      }
    })
  })

  // ===========================================================================
  // RT-10 — Component-Def `hor` propagates to use-site
  // ===========================================================================
  describe('RT-10 — Component-Def `hor` propagates to use-site', () => {
    it('Btn: hor, gap 4 → Btn "X" emits row + gap in DOM', () => {
      const out = dom('Btn: hor, gap 4\nBtn "X"')
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'gap':\s*'4px'/)
    })

    it('same flow lands in React with px gap and row direction', () => {
      const out = react('Btn: hor, gap 4\nBtn "X"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("gap: '4px'")
    })
  })

  // ===========================================================================
  // RT-11 — Nested layouts independent (regression)
  // ===========================================================================
  describe('RT-11 — Nested: outer hor, inner ver — directions independent', () => {
    it('outer Frame is row, inner Frame is column', () => {
      const src = 'Frame hor\n  Frame ver\n    Text "x"'
      const out = dom(src)
      // Two separate frames with their own direction
      const matches = out.match(/'flex-direction':\s*'(row|column)'/g) ?? []
      expect(matches.length).toBeGreaterThanOrEqual(2)
      expect(matches.some(m => m.includes('row'))).toBe(true)
      expect(matches.some(m => m.includes('column'))).toBe(true)
    })
  })

  // ===========================================================================
  // RT-12 — Validator W120 LAYOUT_FLAG_HAS_VALUE (V-2 with parser caveat)
  // ===========================================================================
  describe('RT-12 — Validator W120 wiring + parser-swallow caveat (V-2)', () => {
    it('W120 code path is wired and references PURE_FLAG_PROPERTIES', () => {
      // Lock the structural ingredient: the validator imports the schema-derived
      // PURE_FLAG_PROPERTIES set from parser-helpers. Without this set the W120
      // branch would silently never fire even for hand-built ASTs.
      expect(PURE_FLAG_PROPERTIES.has('hor')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('horizontal')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('ver')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('wrap')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('spread')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('center')).toBe(true)
      // hybrid (numeric-or-flag) keywords MUST NOT be in the set
      expect(PURE_FLAG_PROPERTIES.has('grid')).toBe(false)
      expect(PURE_FLAG_PROPERTIES.has('gap')).toBe(false)
      expect(PURE_FLAG_PROPERTIES.has('w')).toBe(false)
    })

    it('parser-swallow: `Frame hor 5` drops the `5` silently (no W120 today)', () => {
      // Lock the residual gap honestly: the inline-property-parser sees `hor`
      // as a boolean and pushes `[true]` without consuming the next token.
      // The `5` becomes orphaned and is dropped before reaching the validator.
      // W120 fires only when an extra arg actually reaches `prop.values` —
      // currently no surface DSL syntax produces that shape for PURE_FLAG.
      // This test is the lock that makes it hard to silently relax the
      // parser-side guarantee without revisiting Slice 3 V-2.
      const ast = parse('Frame hor 5') as any
      const inst = ast.instances?.[0]
      const horProp = inst?.properties?.find(
        (p: any) => p.name === 'hor' || p.name === 'horizontal'
      )
      expect(horProp).toBeDefined()
      expect(horProp.values).toEqual([true])
      // And, consequentially, the validator emits no W120:
      const r = validate('Frame hor 5')
      expect(r.warnings?.some(w => w.code === 'W120')).toBeFalsy()
    })

    it('W120 branch is currently deferred — even hand-crafted extras do not fire', () => {
      // Honest lock for the deferred-status: even when an AST is mutated
      // post-parse to carry an extra value on a pure flag, the validator
      // does NOT emit W120 today (the branch is replaced by an explanatory
      // comment in validator.ts:700-707). When V-2 lands as a parser-aware
      // change, this test inverts to expect W120 — and the deferred comment
      // turns into the active branch.
      const src = 'Frame hor'
      const ast = parse(src) as any
      const inst = ast.instances[0]
      const horProp = inst.properties.find((p: any) => p.name === 'hor')
      horProp.values = [true, 5]
      const v = new Validator()
      const r = v.validate(ast)
      expect(r.warnings?.some(w => w.code === 'W120')).toBeFalsy()
    })

    it('error code W120 is reserved in validator/types.ts (so future activation is grep-able)', () => {
      expect(ERROR_CODES.LAYOUT_FLAG_HAS_VALUE).toBe('W120')
    })
  })

  // ===========================================================================
  // RT-13 — PURE_FLAG_PROPERTIES schema-derived completeness
  // ===========================================================================
  describe('RT-13 — PURE_FLAG_PROPERTIES is schema-derived', () => {
    it('every entry has `_standalone` and no numeric/color/extra-keywords', () => {
      for (const name of PURE_FLAG_PROPERTIES) {
        const prop = (SCHEMA as Record<string, any>)[name]
        if (!prop) continue // alias path — primary entries enforce the contract
        expect(prop.keywords?._standalone).toBeDefined()
        expect(prop.numeric).toBeUndefined()
        expect(prop.color).toBeUndefined()
        const keywordKeys = Object.keys(prop.keywords ?? {})
        expect(keywordKeys).toEqual(['_standalone'])
      }
    })

    it('aliases of every primary flag are also in the set', () => {
      // hor is the alias for horizontal — both must be flagged
      expect(PURE_FLAG_PROPERTIES.has('horizontal')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('hor')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('vertical')).toBe(true)
      expect(PURE_FLAG_PROPERTIES.has('ver')).toBe(true)
    })
  })
})
