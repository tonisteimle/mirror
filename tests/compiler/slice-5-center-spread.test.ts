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
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { singleAxisCenterToFlex } from '../../compiler/schema/layout-defaults'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
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
})
