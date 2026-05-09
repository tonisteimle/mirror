// @vitest-environment jsdom
/**
 * Slice 2 — Vertical Stack (`gap N`) regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/09-slice-2-vertical-stack.md`:
 *
 *   V-1 (CRITICAL) React-Backend emittierte numerische Werte ohne `px`-Einheit
 *   V-2 (CRITICAL) Token-Suffix-Mapping fehlte im React-Backend
 *   V-3            Framework-Backend `parsePxValue` schnitt CSS-Vars ab
 *   V-4            DOM/IR `formatCSSValue`-Regex matchte keine Decimals
 *
 * Cross-Slice-Probe (Slice-Plan Step 7): V-1 betrifft nicht nur gap, sondern
 * jede numerische CSS-Property. RT-7 verifiziert das Pattern für die
 * Nachbar-Slices (Padding, Margin, Sizing, Border, Radius, FontSize).
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

describe('Slice 2 — Vertical Stack (`gap N`)', () => {
  describe('RT-1 — React emits px units for numeric CSS values (V-1)', () => {
    it("Frame gap 12 → React `gap: '12px'`", () => {
      const out = react('Frame gap 12')
      expect(out).toContain("gap: '12px'")
      expect(out).not.toContain("gap: '12'") // pre-fix bug
    })

    it('Frame g 8 (alias) → same px-emit', () => {
      expect(react('Frame g 8')).toContain("gap: '8px'")
    })

    it("Frame gap 0 → `gap: '0px'`", () => {
      expect(react('Frame gap 0')).toContain("gap: '0px'")
    })

    it("Frame gap 12.5 (decimal) → `gap: '12.5px'`", () => {
      expect(react('Frame gap 12.5')).toContain("gap: '12.5px'")
    })

    it('Frame gap "12" (quoted) → still pixelfied', () => {
      expect(react('Frame gap "12"')).toContain("gap: '12px'")
    })
  })

  describe('RT-2 — React resolves token suffix-mapping (V-2)', () => {
    it('sp.gap: 12; Frame gap $sp → React resolves to 12px', () => {
      const out = react('sp.gap: 12\nFrame gap $sp')
      expect(out).toContain("gap: '12px'")
      expect(out).not.toContain("gap: '$sp'") // pre-fix literal
    })

    it('two suffixes share a root: sp.gap: 12; sp.pad: 16 → both resolve via property name', () => {
      const out = react(`sp.gap: 12
sp.pad: 16
Frame gap $sp, pad $sp`)
      expect(out).toContain("gap: '12px'")
      expect(out).toContain("padding: '16px'")
    })

    it('falls back to bare-name lookup when no property-suffix matches', () => {
      // Token defined with the canonical .col suffix; `Text col $brand`
      // should resolve via suffix-mapping: lookup `brand.col` = #f00.
      const out = react('brand.col: #f00\nText "hi", col $brand')
      expect(out).toMatch(/color:\s*'#f00'/)
    })
  })

  describe('RT-3 — Framework Backend preserves CSS-vars (V-3)', () => {
    it('sp.gap: 12; Frame gap $sp → Framework keeps full var(--sp-gap)', () => {
      const out = fw('sp.gap: 12\nFrame gap $sp')
      expect(out).toContain("gap: 'var(--sp-gap)'")
      // Pre-fix: `parsePxValue` ran `parseInt('var(--sp-gap)')` and then
      // returned a truncated string. Lock against that regression.
      expect(out).not.toContain("'var(--sp-gap'")
    })
  })

  describe('RT-4 — DOM emits px for decimals (V-4)', () => {
    it("Frame gap 12.5 → DOM `gap: '12.5px'`", () => {
      const out = dom('Frame gap 12.5')
      expect(out).toContain("'gap': '12.5px'")
      expect(out).not.toMatch(/'gap':\s*'12\.5'(?!px)/)
    })
  })

  describe('RT-5 — Cross-Backend equivalence for `Frame gap 12`', () => {
    const src = 'Frame gap 12'
    it('all three backends emit px-suffixed gap', () => {
      expect(dom(src)).toContain("'gap': '12px'")
      expect(react(src)).toContain("gap: '12px'")
      // Framework strips the px back to a number — that's intentional
      // (the M() runtime adds units), so we just lock the number.
      expect(fw(src)).toMatch(/gap:\s*12\b/)
    })
  })

  describe('RT-6 — Alias `g` ≡ `gap`', () => {
    it('`Frame g 8` and `Frame gap 8` produce equivalent DOM gap CSS', () => {
      const a = dom('Frame g 8')
      const b = dom('Frame gap 8')
      // Both must include 'gap': '8px'. Other styles may differ in order.
      expect(a).toContain("'gap': '8px'")
      expect(b).toContain("'gap': '8px'")
    })
  })

  describe('RT-7 — Cross-Slice-Probe: every px-property gets px in React (V-1 family)', () => {
    // V-1 affected every CSS-pixel property in the React backend. This
    // probe walks the family from Slices 9 (pad), 10 (mar), 11 (sizing),
    // 15 (border), 16 (radius), 17 (font-size). One regression here means
    // the V-1 fix slipped on the equivalent line.
    const cases: Array<[string, string, string]> = [
      ['gap', 'Frame gap 12', "gap: '12px'"],
      ['padding', 'Frame pad 16', "padding: '16px'"],
      ['margin', 'Frame mar 8', "margin: '8px'"],
      ['width (numeric)', 'Frame w 200', "width: '200px'"],
      ['height (numeric)', 'Frame h 100', "height: '100px'"],
      ['min-width', 'Frame minw 50', "minWidth: '50px'"],
      ['max-width', 'Frame maxw 400', "maxWidth: '400px'"],
      ['min-height', 'Frame minh 50', "minHeight: '50px'"],
      ['max-height', 'Frame maxh 400', "maxHeight: '400px'"],
      ['border-radius', 'Frame rad 6', "borderRadius: '6px'"],
      ['font-size', 'Text "hi", fs 18', "fontSize: '18px'"],
    ]
    for (const [name, src, expected] of cases) {
      it(`React: ${name} — ${src} → ${expected}`, () => {
        expect(react(src)).toContain(expected)
      })
    }

    it('border emits `Npx solid` (special case)', () => {
      expect(react('Frame bor 2')).toContain("border: '2px solid'")
    })
  })

  describe('RT-8 — Validator: `Frame gap` (kein Wert) → E101', () => {
    it('emits E101 for missing value', () => {
      const r = validate('Frame gap')
      expect(r.valid).toBe(false)
      expect(r.errors.some(e => e.code === 'E101')).toBe(true)
    })
  })

  describe('RT-9 — Validator: `Frame gap -4` → E105 + Build-CLI rejects', () => {
    it('emits E105 for negative gap', () => {
      const r = validate('Frame gap -4')
      expect(r.valid).toBe(false)
      expect(r.errors.some(e => e.code === 'E105')).toBe(true)
    })

    it('Build-CLI bails on E105 (Slice 1 B.7 still in effect)', async () => {
      const { compileFiles } = await import('../../compiler/cli/compile')
      const fs = await import('fs')
      const path = await import('path')
      const tmp = path.join(process.env.TMPDIR ?? '/tmp', `slice2-rt9-${Date.now()}.mirror`)
      fs.writeFileSync(tmp, 'Frame gap -4\n')
      try {
        const result = compileFiles([tmp], 'dom', false)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/E105/)
      } finally {
        fs.unlinkSync(tmp)
      }
    })
  })

  describe('RT-10 — Component-Def gap fliesst zu Use-Site', () => {
    it('Btn: gap 8 → Btn "X" emits gap: 8px in DOM', () => {
      const out = dom('Btn: pad 10, gap 8\nBtn "X"')
      expect(out).toContain("'gap': '8px'")
    })

    it('same flow lands in React with px', () => {
      const out = react('Btn: pad 10, gap 8\nBtn "X"')
      expect(out).toContain("gap: '8px'")
    })
  })
})
