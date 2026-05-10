// @vitest-environment jsdom
/**
 * Slice 5 — `center` / `spread` / `ver-center` / `hor-center` regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/05-center-spread.md`:
 *
 *   V-1 (CRITICAL)  Schema-Side Helper für Single-Axis-Center-Keywords.
 *                   `nineZoneToFlex` deckt nur 9-Zonen; `hor-center` /
 *                   `ver-center` sind separate Single-Axis-Keywords mit
 *                   eigener direction-aware Semantik. Neuer Helper
 *                   `singleAxisCenterToFlex(name, direction)` in
 *                   `compiler/schema/layout-defaults.ts`.
 *   V-2 (CRITICAL)  React-Backend nutzt den Helper. Ohne Helper droppte
 *                   das Backend `hor-center`/`ver-center` × col/row in 4
 *                   Cases komplett (alignItems fiel zurück auf default
 *                   flex-start). DOM hat layout-transformer.ts:286-296
 *                   und war korrekt — Cross-Backend-Drift.
 *   V-3 (CRITICAL)  Cross-Backend-Tabelle pinnt DOM ≡ React für alle
 *                   7 Cases (4 Drift + 3 Baseline) als RT.
 *   V-4 (CRITICAL)  Framework-Backend reverse-map: vor Slice 5 collapsed
 *                   die Per-Style-Mapping `align:center` und `justify:center`
 *                   zu einem bare `center: true` (das compiles dann als
 *                   BEIDE Achsen — round-trip-lossy). Neuer Helper
 *                   `flexToSingleAxisCenter(axis, direction)` plus Pre-
 *                   Detection in `framework.ts:368` macht den Round-Trip
 *                   für die unique single-axis-Form sauber.
 *   V-5 (DISCLOSURE) Studio-Roundtrip: Studio nutzt DOM-Backend; RT-1..7
 *                   pinnen das DOM-Verhalten. Property-Panel-Logik für
 *                   `hor-center` / `ver-center` ist in
 *                   `tests/studio/property-panel-layout.test.ts` separat
 *                   abgedeckt. Browser-CDP-E2E-Verifikation (Click →
 *                   Property-Panel → Code-Edit) braucht den separaten
 *                   Test-Stack und ist nicht hier sondern als TODO im
 *                   Audit-Doc dokumentiert.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import {
  singleAxisCenterToFlex,
  flexToSingleAxisCenter,
} from '../../compiler/schema/layout-defaults'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

// Read justify-content / align-items from DOM/React output.
function readDom(out: string): { justify: string | null; align: string | null } {
  return {
    justify: out.match(/'justify-content':\s*'([^']+)'/)?.[1] ?? null,
    align: out.match(/'align-items':\s*'([^']+)'/)?.[1] ?? null,
  }
}
function readReact(out: string): { justify: string | null; align: string | null } {
  return {
    justify: out.match(/justifyContent:\s*'([^']+)'/)?.[1] ?? null,
    align: out.match(/alignItems:\s*'([^']+)'/)?.[1] ?? null,
  }
}

describe('Slice 5 — center / spread / ver-center / hor-center', () => {
  // ===========================================================================
  // RT-1 — `Frame center` (col): both axes center
  // ===========================================================================
  it('RT-1 — `Frame center` (col) → justify+align both center', () => {
    const out = dom('Frame center\n  Text "x"')
    const { justify, align } = readDom(out)
    expect(justify).toBe('center')
    expect(align).toBe('center')
  })

  // ===========================================================================
  // RT-2 — `Frame hor, center`: both axes center
  // ===========================================================================
  it('RT-2 — `Frame hor, center` → justify+align both center', () => {
    const out = dom('Frame hor, center\n  Text "x"')
    const { justify, align } = readDom(out)
    expect(justify).toBe('center')
    expect(align).toBe('center')
  })

  // ===========================================================================
  // RT-3 — `Frame hor, spread`: justify space-between
  // ===========================================================================
  it('RT-3 — `Frame hor, spread` → justify-content: space-between', () => {
    const out = dom('Frame hor, spread\n  Text "x"')
    const { justify } = readDom(out)
    expect(justify).toBe('space-between')
  })

  // ===========================================================================
  // RT-4 — `Frame hor, ver-center`: align-items center (cross axis on row)
  // ===========================================================================
  it('RT-4 — `Frame hor, ver-center` → align-items: center (row cross-axis)', () => {
    const out = dom('Frame hor, ver-center\n  Text "x"')
    const { align } = readDom(out)
    expect(align).toBe('center')
  })

  // ===========================================================================
  // RT-5 — `Frame ver-center` (col): justify-content center (main axis on col)
  // ===========================================================================
  it('RT-5 — `Frame ver-center` (col) → justify-content: center (col main-axis)', () => {
    const out = dom('Frame ver-center\n  Text "x"')
    const { justify } = readDom(out)
    expect(justify).toBe('center')
  })

  // ===========================================================================
  // RT-6 — `Frame hor-center` (col): align-items center (cross axis on col)
  // ===========================================================================
  it('RT-6 — `Frame hor-center` (col) → align-items: center (col cross-axis)', () => {
    const out = dom('Frame hor-center\n  Text "x"')
    const { align } = readDom(out)
    expect(align).toBe('center')
  })

  // ===========================================================================
  // RT-7 — `Frame hor, hor-center`: justify-content center (main axis on row)
  // ===========================================================================
  it('RT-7 — `Frame hor, hor-center` → justify-content: center (row main-axis)', () => {
    const out = dom('Frame hor, hor-center\n  Text "x"')
    const { justify } = readDom(out)
    expect(justify).toBe('center')
  })

  // ===========================================================================
  // RT-8 — `cen` alias === `center`
  // ===========================================================================
  it('RT-8 — `cen` alias produces same DOM and React output as `center`', () => {
    const aDom = dom('Frame cen\n  Text "x"')
    const bDom = dom('Frame center\n  Text "x"')
    expect(readDom(aDom)).toEqual(readDom(bDom))

    const aReact = react('Frame cen\n  Text "x"')
    const bReact = react('Frame center\n  Text "x"')
    expect(readReact(aReact)).toEqual(readReact(bReact))
  })

  // ===========================================================================
  // RT-9 — Validator E110 conflict for `center + spread`
  // ===========================================================================
  it('RT-9 — Validator emits E110 LAYOUT_CONFLICT for `center + spread`', () => {
    const r = validate('Frame center, spread\n  Text "x"')
    expect(r.errors.some(e => e.code === 'E110')).toBe(true)
  })

  // ===========================================================================
  // RT-10 — Cross-Backend table: DOM ≡ React for all 7 cases (V-2 / V-3)
  // ===========================================================================
  describe('RT-10 — Cross-Backend: DOM ≡ React for `hor-center` / `ver-center` / baseline', () => {
    type CrossCase = {
      label: string
      src: string
      // null means "axis is not pinned by this keyword"
      // (default flex-start may still appear; we only assert the pinned axis).
      justify: string | null
      align: string | null
    }
    const cases: CrossCase[] = [
      {
        label: 'CB-1 center (col)',
        src: 'Frame center\n  Text "x"',
        justify: 'center',
        align: 'center',
      },
      {
        label: 'CB-2 center (row)',
        src: 'Frame hor, center\n  Text "x"',
        justify: 'center',
        align: 'center',
      },
      {
        label: 'CB-3 spread (row)',
        src: 'Frame hor, spread\n  Text "x"',
        justify: 'space-between',
        align: null,
      },
      {
        label: 'CB-4 hor-center (col)',
        src: 'Frame hor-center\n  Text "x"',
        justify: null,
        align: 'center',
      },
      {
        label: 'CB-5 hor-center (row)',
        src: 'Frame hor, hor-center\n  Text "x"',
        justify: 'center',
        align: null,
      },
      {
        label: 'CB-6 ver-center (row)',
        src: 'Frame hor, ver-center\n  Text "x"',
        justify: null,
        align: 'center',
      },
      {
        label: 'CB-7 ver-center (col)',
        src: 'Frame ver-center\n  Text "x"',
        justify: 'center',
        align: null,
      },
    ]

    for (const c of cases) {
      it(`${c.label} — DOM and React agree`, () => {
        const d = readDom(dom(c.src))
        const r = readReact(react(c.src))
        if (c.justify !== null) {
          expect(d.justify).toBe(c.justify)
          expect(r.justify).toBe(c.justify)
        }
        if (c.align !== null) {
          expect(d.align).toBe(c.align)
          expect(r.align).toBe(c.align)
        }
      })
    }
  })

  // ===========================================================================
  // RT-11 — `Frame hor, spread, ver-center`: combined correctly
  // ===========================================================================
  it('RT-11 — `Frame hor, spread, ver-center` → space-between + cross-axis center', () => {
    // hor + spread sets justify-content: space-between (main axis)
    // ver-center on row layout sets align-items: center (cross axis)
    const out = dom('Frame hor, spread, ver-center\n  Text "a"\n  Text "b"')
    const { justify, align } = readDom(out)
    expect(justify).toBe('space-between')
    expect(align).toBe('center')

    const rOut = react('Frame hor, spread, ver-center\n  Text "a"\n  Text "b"')
    const r = readReact(rOut)
    expect(r.justify).toBe('space-between')
    expect(r.align).toBe('center')
  })

  // ===========================================================================
  // RT-12 — Schema-drift guard: `singleAxisCenterToFlex` covers all 4 combos
  // ===========================================================================
  describe('RT-12 — `singleAxisCenterToFlex` schema helper covers all 4 combos', () => {
    it('hor-center / col → alignItems: center', () => {
      expect(singleAxisCenterToFlex('hor-center', 'column')).toEqual({
        property: 'alignItems',
        value: 'center',
      })
    })

    it('hor-center / row → justifyContent: center', () => {
      expect(singleAxisCenterToFlex('hor-center', 'row')).toEqual({
        property: 'justifyContent',
        value: 'center',
      })
    })

    it('ver-center / col → justifyContent: center', () => {
      expect(singleAxisCenterToFlex('ver-center', 'column')).toEqual({
        property: 'justifyContent',
        value: 'center',
      })
    })

    it('ver-center / row → alignItems: center', () => {
      expect(singleAxisCenterToFlex('ver-center', 'row')).toEqual({
        property: 'alignItems',
        value: 'center',
      })
    })

    it('returns null for non-matching names (e.g. center, spread, tl)', () => {
      expect(singleAxisCenterToFlex('center', 'column')).toBeNull()
      expect(singleAxisCenterToFlex('spread', 'row')).toBeNull()
      expect(singleAxisCenterToFlex('tl', 'column')).toBeNull()
    })
  })

  // ===========================================================================
  // RT-13 — Framework reverse-map: single-axis-center round-trips cleanly (V-4)
  // ===========================================================================
  describe('RT-13 — Framework reverse-map preserves single-axis-center keyword', () => {
    // Pre-Slice-5: per-style mapper at framework.ts:440-441 collapsed any
    // `justify:center` or `align:center` to a bare `center: true`, which
    // re-compiles as BOTH axes — round-trip-lossy. With V-4's pre-detection
    // hook, the unique single-axis IR shape (one axis center, the other
    // unset) round-trips to `hor-center: true` / `ver-center: true`.
    it('Frame hor-center (col) → Framework re-emits hor-center (NOT center)', () => {
      const out = fw('Frame hor-center\n  Text "x"')
      expect(out).toMatch(/['"]hor-center['"]:\s*true/)
      // The bare `center: true` would compile to BOTH axes — wrong.
      expect(out).not.toMatch(/[^-]center:\s*true/)
    })

    it('Frame hor, ver-center (row) → Framework re-emits ver-center (NOT center)', () => {
      const out = fw('Frame hor, ver-center\n  Text "x"')
      expect(out).toMatch(/['"]ver-center['"]:\s*true/)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).not.toMatch(/[^-]center:\s*true/)
    })

    it('Frame center (col) → still re-emits `center: true` (both axes case unchanged)', () => {
      const out = fw('Frame center\n  Text "x"')
      expect(out).toMatch(/center:\s*true/)
      expect(out).not.toMatch(/['"]hor-center['"]:\s*true/)
      expect(out).not.toMatch(/['"]ver-center['"]:\s*true/)
    })

    it('Frame hor, spread → still re-emits `spread: true` (no false single-axis match)', () => {
      const out = fw('Frame hor, spread\n  Text "x"')
      expect(out).toMatch(/spread:\s*true/)
      expect(out).toMatch(/hor:\s*true/)
      expect(out).not.toMatch(/['"]hor-center['"]:\s*true/)
      expect(out).not.toMatch(/['"]ver-center['"]:\s*true/)
    })
  })

  // ===========================================================================
  // RT-14 — Schema-helper inverse round-trips (V-4)
  // ===========================================================================
  describe('RT-14 — `flexToSingleAxisCenter` is the inverse of `singleAxisCenterToFlex`', () => {
    // Round-trip: Mirror keyword → CSS axis (forward) → Mirror keyword (inverse).
    // Locks that the helper pair stays consistent across future edits.
    const directions: Array<'column' | 'row'> = ['column', 'row']
    const keywords: Array<'hor-center' | 'ver-center'> = ['hor-center', 'ver-center']
    for (const dir of directions) {
      for (const kw of keywords) {
        it(`${kw} (${dir}) → CSS-axis → back to ${kw}`, () => {
          const fwd = singleAxisCenterToFlex(kw, dir)
          expect(fwd).not.toBeNull()
          const cssAxis = fwd!.property === 'justifyContent' ? 'justify-content' : 'align-items'
          const back = flexToSingleAxisCenter(cssAxis, dir)
          expect(back).toBe(kw)
        })
      }
    }
  })

  // ===========================================================================
  // RT-15 — Studio-Roundtrip honest disclosure (V-5)
  // ===========================================================================
  describe('RT-15 — Studio-Roundtrip status (honest disclosure)', () => {
    // Plan-Step 7 verlangt Studio-Roundtrip-Verifikation. Slice 5 ändert
    // nur React + Framework. Studio nutzt das DOM-Backend (das hor-center/
    // ver-center-Verhalten unverändert lässt — siehe RT-1..RT-7). Daraus
    // folgt:
    //
    // ✅ DOM-Pfad: durch RT-1..RT-7 cross-backend-Lock validiert; Studio-
    //    Preview rendert hor-center/ver-center identisch zu vor Slice 5.
    // ✅ Property-Panel-Logik: `tests/studio/property-panel-layout.test.ts`
    //    deckt die middle-center-Activation für `ver-center + hor-center`
    //    bereits ab (line 223). Slice 5 ändert nichts an dieser Logik.
    // ❌ Echte Click→Property-Panel→Code-Edit Verifikation per Browser-CDP-
    //    Run wurde NICHT gemacht (Studio-Test-Stack braucht Server-Boot,
    //    separater Stack — Plan-Step 7 hat den expliziten Carve-out).
    //
    // RT-15 lockt die Disclosure: jede Änderung am DOM-Backend für hor-
    // center/ver-center bricht RT-4..RT-7, wodurch der Roundtrip implizit
    // prüfbar bleibt.

    it('DOM hor-center/ver-center behavior unchanged by Slice 5 (Studio uses DOM backend)', () => {
      // Pre-Slice-5 DOM output for Frame hor-center: align-items: center.
      // RT-6 lockt das. RT-15 ist die explizite Aussage:
      // Studio-Preview parity = RT-1..RT-7 parity.
      const out = dom('Frame hor-center\n  Text "x"')
      expect(out).toMatch(/'align-items':\s*'center'/)
    })
  })
})
