// @vitest-environment jsdom
/**
 * Slice 4 — 9-Positions (`tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br`)
 * regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/04-9-positions.md`:
 *
 *   V-1 (CRITICAL) React-Backend droppte 16 von 18 9-zone Aliase komplett.
 *                  Nur `center`/`cen` sowie individuelle `top`/`left`/
 *                  `right`/`bottom` waren gewired. Fix: schema-derived
 *                  `nineZoneToFlex(zone, direction)` Lookup.
 *   V-2 (CRITICAL) Framework-Backend reverse-mapper konnte nur Single-CSS-
 *                  Property → Single-Mirror-Property mappen. 9-zone
 *                  Kombinationen (`justify:flex-end + items:center` = `bc`)
 *                  wurden zu `(no props)` oder einem irreführenden
 *                  `center: true` collapsed. Fix: `flexToNineZone`
 *                  Inverse-Lookup vor dem Per-Style-Loop.
 *   V-3 (CRITICAL) `Frame grid 12, center` produzierte drei verschiedene
 *                  Backend-Outputs (DOM dropt center, React dropt grid,
 *                  Framework dropt center). E115 LAYOUT_MODE_CONFLICT
 *                  blockt jetzt die Kombination am Validator.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import {
  nineZoneToFlex,
  flexToNineZone,
  resolveNineZoneAlias,
  NINE_ZONE,
} from '../../compiler/schema/layout-defaults'
import { ZONE_ALIGNMENT_PROPS } from '../../compiler/validator/validation-config'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

const ALL_ZONES = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br'] as const

const EXPECTED_FLEX_COLUMN: Record<string, { justify: string; align: string }> = {
  tl: { justify: 'flex-start', align: 'flex-start' },
  tc: { justify: 'flex-start', align: 'center' },
  tr: { justify: 'flex-start', align: 'flex-end' },
  cl: { justify: 'center', align: 'flex-start' },
  center: { justify: 'center', align: 'center' },
  cr: { justify: 'center', align: 'flex-end' },
  bl: { justify: 'flex-end', align: 'flex-start' },
  bc: { justify: 'flex-end', align: 'center' },
  br: { justify: 'flex-end', align: 'flex-end' },
}

describe('Slice 4 — 9-Positions', () => {
  // ===========================================================================
  // RT-1 — React: alle 9 Aliase emittieren korrekte justify+align (V-1)
  // ===========================================================================
  describe('RT-1 — React: 9-zone aliases produce correct justify-content + align-items (V-1)', () => {
    for (const zone of ALL_ZONES) {
      const expected = EXPECTED_FLEX_COLUMN[zone]
      it(`Frame ${zone} → React justifyContent:'${expected.justify}', alignItems:'${expected.align}'`, () => {
        const out = react(`Frame ${zone}\n  Text "x"`)
        expect(out).toContain(`justifyContent: '${expected.justify}'`)
        expect(out).toContain(`alignItems: '${expected.align}'`)
      })
    }
  })

  // ===========================================================================
  // RT-2 — React: Long-Forms (top-left..bottom-right) ≡ short-forms
  // ===========================================================================
  describe('RT-2 — React: long-form aliases are equivalent to short-forms (V-1)', () => {
    const pairs: Array<[string, string]> = [
      ['top-left', 'tl'],
      ['top-center', 'tc'],
      ['top-right', 'tr'],
      ['center-left', 'cl'],
      ['center-right', 'cr'],
      ['bottom-left', 'bl'],
      ['bottom-center', 'bc'],
      ['bottom-right', 'br'],
      ['cen', 'center'],
    ]
    for (const [long, short] of pairs) {
      it(`Frame ${long} → identical React style to Frame ${short}`, () => {
        const a = react(`Frame ${long}\n  Text "x"`)
        const b = react(`Frame ${short}\n  Text "x"`)
        const styleA = a.match(/style=\{\{[^}]+\}\}/)?.[0]
        const styleB = b.match(/style=\{\{[^}]+\}\}/)?.[0]
        expect(styleA).toEqual(styleB)
      })
    }
  })

  // ===========================================================================
  // RT-3 — React direction-aware: hor flips axes (V-1)
  // ===========================================================================
  describe('RT-3 — React: direction-aware mapping for `hor` + 9-zone', () => {
    it('Frame hor, cr → justifyContent:flex-end + alignItems:center (axes flipped)', () => {
      const out = react('Frame hor, cr\n  Text "x"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("justifyContent: 'flex-end'")
      expect(out).toContain("alignItems: 'center'")
    })

    it('Frame hor, bc → justifyContent:center + alignItems:flex-end', () => {
      const out = react('Frame hor, bc\n  Text "x"')
      expect(out).toContain("flexDirection: 'row'")
      expect(out).toContain("justifyContent: 'center'")
      expect(out).toContain("alignItems: 'flex-end'")
    })

    it('Frame hor, tl → justify+align both flex-start (symmetric in both directions)', () => {
      const out = react('Frame hor, tl\n  Text "x"')
      expect(out).toContain("justifyContent: 'flex-start'")
      expect(out).toContain("alignItems: 'flex-start'")
    })
  })

  // ===========================================================================
  // RT-4 — Framework: 9-zone preserved as alias (V-2)
  // ===========================================================================
  describe('RT-4 — Framework: 9-zone aliases round-trip without collapse (V-2)', () => {
    for (const zone of ALL_ZONES) {
      it(`Frame ${zone} → Framework re-emits ${zone}: true`, () => {
        const out = fw(`Frame ${zone}\n  Text "x"`)
        expect(out).toMatch(new RegExp(`${zone}:\\s*true`))
      })
    }
  })

  // ===========================================================================
  // RT-5 — Framework direction-aware reverse-map (V-2)
  // ===========================================================================
  describe('RT-5 — Framework reverse-map is direction-aware', () => {
    it('Frame hor, cr → Framework re-emits cr (NOT bc — axes were flipped)', () => {
      const out = fw('Frame hor, cr\n  Text "x"')
      expect(out).toMatch(/cr:\s*true/)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).not.toMatch(/bc:\s*true/)
    })

    it('Frame hor, bc → Framework re-emits bc (NOT cr)', () => {
      const out = fw('Frame hor, bc\n  Text "x"')
      expect(out).toMatch(/bc:\s*true/)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).not.toMatch(/cr:\s*true/)
    })
  })

  // ===========================================================================
  // RT-6 — Cross-Backend: DOM ≡ React for every zone
  // ===========================================================================
  describe('RT-6 — Cross-Backend: DOM and React agree on justify+align for every zone', () => {
    for (const zone of ALL_ZONES) {
      const expected = EXPECTED_FLEX_COLUMN[zone]
      it(`${zone}: DOM and React both emit justify=${expected.justify}, align=${expected.align}`, () => {
        const domOut = dom(`Frame ${zone}\n  Text "x"`)
        const reactOut = react(`Frame ${zone}\n  Text "x"`)
        expect(domOut).toMatch(new RegExp(`'justify-content':\\s*'${expected.justify}'`))
        expect(domOut).toMatch(new RegExp(`'align-items':\\s*'${expected.align}'`))
        expect(reactOut).toContain(`justifyContent: '${expected.justify}'`)
        expect(reactOut).toContain(`alignItems: '${expected.align}'`)
      })
    }
  })

  // ===========================================================================
  // RT-7 / RT-8 — Validator E115 (V-3)
  // ===========================================================================
  describe('RT-7 — Validator E115 LAYOUT_MODE_CONFLICT for `Frame grid 12, center`', () => {
    it('emits E115 for grid + center', () => {
      const r = validate('Frame grid 12, center')
      expect(r.errors.some(e => e.code === 'E115')).toBe(true)
    })
  })

  describe('RT-8 — Validator E115 for `Frame grid 12, <9-zone>`', () => {
    for (const zone of ALL_ZONES) {
      it(`Frame grid 12, ${zone} → E115`, () => {
        const r = validate(`Frame grid 12, ${zone}`)
        expect(r.errors.some(e => e.code === 'E115')).toBe(true)
      })
    }
  })

  // ===========================================================================
  // RT-9 — Build-CLI gates on E115
  // ===========================================================================
  describe('RT-9 — Build-CLI bails on E115', () => {
    it('compileFiles fails for `Frame grid 12, center`', async () => {
      const { compileFiles } = await import('../../compiler/cli/compile')
      const fs = await import('fs')
      const path = await import('path')
      const tmp = path.join(process.env.TMPDIR ?? '/tmp', `slice4-rt9-${Date.now()}.mirror`)
      fs.writeFileSync(tmp, 'Frame grid 12, center\n')
      try {
        const result = compileFiles([tmp], 'dom', false)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/E115/)
      } finally {
        fs.unlinkSync(tmp)
      }
    })
  })

  // ===========================================================================
  // RT-10 — E110 still fires for multi-zone (regression)
  // ===========================================================================
  describe('RT-10 — E110 still catches `Frame tl, br` multi-zone (regression)', () => {
    it('Frame tl, br → E110', () => {
      const r = validate('Frame tl, br')
      expect(r.errors.some(e => e.code === 'E110')).toBe(true)
    })

    it('Frame tl, tr → E110', () => {
      const r = validate('Frame tl, tr')
      expect(r.errors.some(e => e.code === 'E110')).toBe(true)
    })
  })

  // ===========================================================================
  // RT-11 — center alias `cen` (regression)
  // ===========================================================================
  describe('RT-11 — Alias `cen` ≡ `center` cross-backend (regression)', () => {
    it('DOM identical for cen and center', () => {
      const a = dom('Frame cen\n  Text "x"')
      const b = dom('Frame center\n  Text "x"')
      const aJustify = a.match(/'justify-content':\s*'[^']+'/)?.[0]
      const bJustify = b.match(/'justify-content':\s*'[^']+'/)?.[0]
      expect(aJustify).toEqual(bJustify)
    })

    it('React identical style block', () => {
      const a = react('Frame cen\n  Text "x"').match(/style=\{\{[^}]+\}\}/)?.[0]
      const b = react('Frame center\n  Text "x"').match(/style=\{\{[^}]+\}\}/)?.[0]
      expect(a).toEqual(b)
    })

    it('Framework collapses cen to center', () => {
      expect(fw('Frame cen\n  Text "x"')).toMatch(/center:\s*true/)
    })
  })

  // ===========================================================================
  // RT-12 — Schema-derived helper unit tests
  // ===========================================================================
  describe('RT-12 — `nineZoneToFlex` and `flexToNineZone` are inverse', () => {
    it('column: round-trips every zone', () => {
      for (const zone of ALL_ZONES) {
        const flex = nineZoneToFlex(zone, 'column')!
        const back = flexToNineZone(flex.justifyContent, flex.alignItems, 'column')
        expect(back).toBe(zone)
      }
    })

    it('row: round-trips every zone (axes flip vs column)', () => {
      for (const zone of ALL_ZONES) {
        const flex = nineZoneToFlex(zone, 'row')!
        const back = flexToNineZone(flex.justifyContent, flex.alignItems, 'row')
        expect(back).toBe(zone)
      }
    })

    it('returns null for non-zone names', () => {
      expect(nineZoneToFlex('not-a-zone', 'column')).toBeNull()
      expect(resolveNineZoneAlias('not-a-zone')).toBeNull()
      expect(flexToNineZone('flex-start', 'invalid', 'column')).toBeNull()
    })

    it('NINE_ZONE keys exactly match ALL_ZONES (schema-side single-source-of-truth)', () => {
      expect(Object.keys(NINE_ZONE).sort()).toEqual([...ALL_ZONES].sort())
    })
  })

  // ===========================================================================
  // RT-13 — Component-Def 9-zone propagation (regression)
  // ===========================================================================
  describe('RT-13 — Component-Def 9-zone propagates to use-site', () => {
    it('Btn: hor, cr → Btn "X" emits cr semantics in DOM', () => {
      const out = dom('Btn: hor, cr\nBtn "X"')
      expect(out).toMatch(/'flex-direction':\s*'row'/)
      expect(out).toMatch(/'justify-content':\s*'flex-end'/)
      expect(out).toMatch(/'align-items':\s*'center'/)
    })

    it('same component-def lands in React with cr semantics', () => {
      const out = react('Btn: hor, cr\nBtn "X"')
      expect(out).toContain("justifyContent: 'flex-end'")
      expect(out).toContain("alignItems: 'center'")
    })
  })

  // ===========================================================================
  // RT-14 — Schema-Drift-Lock: validation-config zone list agrees with NINE_ZONE
  // ===========================================================================
  describe('RT-14 — Schema-Drift-Lock: ZONE_ALIGNMENT_PROPS is consistent with NINE_ZONE', () => {
    // Plan-Step 7 Schema-Drift-Grep findings:
    //
    //   * `ZONE_ALIGNMENT_PROPS` (validation-config.ts) — live, used by
    //     validator.ts:1220 for the multi-zone E110 detection. Holds 9
    //     short + 8 long forms + the `cen` alias = 18 entries.
    //
    //   * `LAYOUT_CONFLICTS` (validation-config.ts) — was a dead-code copy
    //     of the same data plus other conflict tables, never imported.
    //     Deleted in this Slice's review-pass (commit history). RT-14
    //     locks the surviving canonical list against NINE_ZONE drift.
    //
    //   * `layout-transformer.ts:213-260` — 18 hardcoded `case` statements
    //     for the same zones. Pre-existing, mirrors `nineZoneToSemantic`
    //     (the schema-side helper Slice 4 introduced). Real schema-drift
    //     surface but invasive to refactor now; left as accepted residual
    //     drift, locked behaviorally via RT-6 cross-backend equivalence.
    const expectedZoneNames = [
      ...Object.keys(NINE_ZONE),
      'top-left',
      'top-center',
      'top-right',
      'center-left',
      'center-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'cen', // alias for `center`
    ].sort()

    it('ZONE_ALIGNMENT_PROPS contains exactly the 9 short + 8 long forms + `cen` alias', () => {
      expect([...ZONE_ALIGNMENT_PROPS].sort()).toEqual(expectedZoneNames)
    })
  })

  // ===========================================================================
  // RT-15 — Cross-Slice deferred-state lock for ver-center / hor-center
  // ===========================================================================
  describe('RT-15 — Cross-Slice deferred lock: `ver-center` / `hor-center` (Slice 5 territory)', () => {
    // Plan-Step 7 Cross-Slice-Probe: V-2's flexToNineZone reverse-mapper
    // does NOT distinguish single-axis center keywords (`ver-center` /
    // `hor-center`) from two-axis 9-zone aliases. Examples surfaced by
    // /tmp/slice4-cross-slice-probe.ts:
    //
    //   `Frame ver-center` (column) → DOM justify:center, items:flex-start
    //     → Framework reverse-map sees (center, flex-start, column)
    //     → matches `cl` (center-left) per ZONE_TO_SEMANTIC, NOT `ver-center`
    //
    //   `Frame hor, hor-center` (row) → DOM justify:center, items:flex-start
    //     → Framework reverse-map sees (center, flex-start, row)
    //     → matches `tc` per row-axis-flip, NOT `hor-center`
    //
    // Both produce CSS-equivalent output to their zone counterparts but
    // lose the original Mirror-DSL keyword. Out of Slice 4 scope —
    // Slice 5 (`center / spread / ver-center / hor-center`) owns the
    // single-axis-center semantics. RT-15 locks the current behavior so
    // Slice 5 can detect the regression when it inverts these expectations.

    it('Frame ver-center → Framework re-emits cl (CSS-equivalent collapse — Slice 5 will fix)', () => {
      const out = fw('Frame ver-center\n  Text "x"')
      expect(out).toMatch(/cl:\s*true/)
      expect(out).not.toMatch(/ver-center:\s*true/) // Mirror keyword lost — known
    })

    it('Frame hor, hor-center → Framework re-emits hor + tc (CSS-equivalent collapse)', () => {
      const out = fw('Frame hor, hor-center\n  Text "x"')
      expect(out).toMatch(/hor:\s*true/)
      expect(out).toMatch(/tc:\s*true/)
      expect(out).not.toMatch(/hor-center:\s*true/) // Mirror keyword lost — known
    })

    it('Frame hor-center → Framework preserves the original keyword (passes through unchanged)', () => {
      // Single-axis center keywords pass through the framework backend
      // verbatim because the IR stores them as raw boolean properties
      // and the per-style mapper only consumes css-shape entries it
      // recognises. So `hor-center` survives — unlike `ver-center` which
      // gets reverse-mapped via flexToNineZone (justify:center +
      // align:flex-start matches `cl` in the column ZONE_TO_SEMANTIC
      // table).
      const out = fw('Frame hor-center\n  Text "x"')
      expect(out).toMatch(/['"]hor-center['"]:\s*true/)
    })

    it('React emits the single-axis CSS without zone-collapse (no inverse needed)', () => {
      // React backend doesn't reverse-map; ver-center stays single-axis CSS.
      // This is the side that's actually correct semantically — locks the
      // distinction that Slice 5 will eventually unify.
      const out = react('Frame ver-center\n  Text "x"')
      expect(out).toContain("justifyContent: 'center'")
      // alignItems comes from FLEX_DEFAULTS, not from a 2-axis spec
      expect(out).toContain("alignItems: 'flex-start'")
    })
  })

  // ===========================================================================
  // RT-16 — Studio-Roundtrip honest disclosure
  // ===========================================================================
  describe('RT-16 — Studio-Roundtrip status (honest disclosure)', () => {
    // Plan-Step 7 verlangt Studio-Roundtrip-Verifikation. Slice 4 ändert
    // nur React + Framework + Validator. Studio nutzt das DOM-Backend (das
    // 9-zone-Verhalten unverändert lässt — siehe RT-6). Daraus folgt:
    //
    // ✅ DOM-Pfad: durch RT-6 cross-backend-Lock validiert; Studio-Preview
    //    rendert 9-zone identisch zu vor Slice 4.
    // ❌ Echte Click→Property-Panel→Code-Edit Verifikation per Browser-CDP-
    //    Run wurde NICHT gemacht (Studio-Test-Stack braucht Server-Boot).
    //
    // RT-16 lockt den Status: jede Änderung am DOM-Backend für 9-zone
    // bricht RT-6, wodurch der Roundtrip implizit prüfbar bleibt. Wer
    // Studio explicit click-flow verifizieren will, muss `npm run studio`
    // + property-panel-tests/9-zone fahren (kein vitest, separater Stack).

    it('DOM 9-zone behavior unchanged by Slice 4 (Studio uses DOM backend)', () => {
      // Pre-Slice-4 DOM output for Frame center: justify:center + items:center.
      // RT-6 already locks this for all 9 zones. RT-16 is the explicit
      // statement: Studio-Preview parity = RT-6 parity.
      const out = dom('Frame center\n  Text "x"')
      expect(out).toMatch(/'justify-content':\s*'center'/)
      expect(out).toMatch(/'align-items':\s*'center'/)
    })
  })
})
