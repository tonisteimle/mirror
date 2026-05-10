// @vitest-environment jsdom
/**
 * Slice 50 — Lucide-Icons RT-Suite.
 *
 * Audit-Befunde aus `docs/refactoring/50-lucide-icons.md`:
 *
 *   V-1 (CRITICAL)  Schema-zentralisierte Default-Quelle. Pre-Slice-50
 *                   hatte 7 unterschiedliche Default-Quellen für `is`/`iw`
 *                   (16/20/24 für size; 400/2 für weight). `ICON_DEFAULTS`
 *                   in `compiler/schema/primitives.ts` ist jetzt Single
 *                   Source.
 *
 *   V-2 (CRITICAL)  React-Backend rendert KEINE Icons (mappte Icon→span,
 *                   `<span>{"check"}</span>` statt SVG). Neuer
 *                   `MirrorIcon` Component-Template + Sonderpfad in
 *                   `generateJSX` für Icon-Instanzen.
 *
 *   V-3 (CRITICAL)  Framework-Backend Reverse-Map double-emit (`w/is`,
 *                   `h/is`, `col/ic`, `weight/iw`). `nodeToProps`
 *                   suppression am Ende: wenn data-icon-* set, skip
 *                   CSS-derived doublets.
 *
 *   V-4 (CRITICAL)  `iw` schema-Mapping zu `font-weight` CSS war Bug
 *                   (Lucide stroke-width geht über data-icon-weight,
 *                   nicht CSS). `numeric.css: () => []`.
 *
 *   V-5             `setAttribute('data-icon-fill', true)` (boolean)
 *                   → `'true'` (string) für Type-Konsistenz.
 *
 *   V-6             Diese RT-Suite (Cross-Backend, Schema-Drift, Edge).
 *
 *   V-7             Cross-Slice gegen Slice 51 (Custom-Icons).
 *
 *   V-8             ALL_PRIMITIVES schema-derive deferred — siehe
 *                   `studio/test-api/suites/property-panel/primitive-matrix.test.ts`.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { ICON_DEFAULTS, getIconDefault } from '../../compiler/schema/primitives'
import { sanitizeIconName } from '../../compiler/runtime/icons'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

// Extract first node_1 setAttribute calls relevant to icons.
function domIconAttrs(src: string): Record<string, string> {
  const out = generateDOM(parse(src))
  const result: Record<string, string> = {}
  const re = /node_1\.setAttribute\(['"](data-icon-[^'"]+)['"]\s*,\s*"([^"]*)"\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(out)) !== null) {
    result[m[1]] = m[2]
  }
  return result
}
function fwIconProps(src: string): string {
  return fw(src).match(/M\('Icon'[^)]+\)/)?.[0] ?? '(no Icon)'
}

// =============================================================================
// V-1: Schema-Defaults
// =============================================================================
describe('Slice 50 V-1 — ICON_DEFAULTS schema-derived single source', () => {
  it('RT-1 — getIconDefault("size") === 24 (CLAUDE.md DSL doc canonical)', () => {
    expect(getIconDefault('size')).toBe(24)
    expect(ICON_DEFAULTS.size).toBe(24)
  })

  it('RT-2 — getIconDefault("weight") === 2 (Lucide stroke-width)', () => {
    expect(getIconDefault('weight')).toBe(2)
    expect(ICON_DEFAULTS.weight).toBe(2)
  })

  it('RT-3 — Plain `Icon "check"`: DOM emits data-icon-size="24"', () => {
    const attrs = domIconAttrs(`Icon "check"`)
    expect(attrs['data-icon-size']).toBe('24')
  })

  it('RT-4 — Plain Icon: kein font-weight im Style (V-4 leak gefixt)', () => {
    const out = dom(`Icon "check"`)
    expect(out).not.toMatch(/'font-weight'/)
  })
})

// =============================================================================
// V-2/V-3: Cross-Backend Icon-Render
// =============================================================================
describe('Slice 50 V-2/V-3 — Cross-Backend Icon-Render', () => {
  it('RT-5 — `Icon "check", is 32`: alle 3 Backends sehen size=32', () => {
    const src = `Icon "check", is 32`
    expect(domIconAttrs(src)['data-icon-size']).toBe('32')
    expect(react(src)).toContain('<MirrorIcon name="check" size={32}')
    expect(fwIconProps(src)).toMatch(/is:\s*'32'/)
  })

  it('RT-6 — `Icon "heart", ic #ef4444`: Color in allen 3 Backends', () => {
    const src = `Icon "heart", ic #ef4444`
    expect(domIconAttrs(src)['data-icon-color']).toBe('#ef4444')
    expect(react(src)).toContain(`color="#ef4444"`)
    expect(fwIconProps(src)).toMatch(/ic:\s*'#ef4444'/)
  })

  it('RT-7 — `Icon "x", iw 1`: stroke-width 1 in allen 3, kein font-weight (V-4)', () => {
    const src = `Icon "check", iw 1`
    expect(domIconAttrs(src)['data-icon-weight']).toBe('1')
    expect(dom(src)).not.toMatch(/'font-weight'/)
    expect(react(src)).toContain('strokeWidth={1}')
    expect(fwIconProps(src)).toMatch(/iw:\s*'1'/)
    // Framework V-3 suppression: kein doppeltes `weight`
    expect(fwIconProps(src)).not.toMatch(/weight:\s*'1'/)
  })

  it('RT-8 — `Icon "heart", fill`: Fill-Variante in allen 3', () => {
    const src = `Icon "heart", fill`
    // V-5: data-icon-fill = "true" als String
    const out = dom(src)
    expect(out).toMatch(/data-icon-fill[^,)]+,\s*"true"/)
    expect(react(src)).toContain(' fill ')
    expect(fwIconProps(src)).toMatch(/fill:\s*true/)
  })

  it('RT-9 — alle vier Properties kombiniert: Cross-Backend konsistent', () => {
    const src = `Icon "heart", is 32, ic #ef4444, iw 1, fill`
    const attrs = domIconAttrs(src)
    expect(attrs['data-icon-size']).toBe('32')
    expect(attrs['data-icon-color']).toBe('#ef4444')
    expect(attrs['data-icon-weight']).toBe('1')
    expect(attrs['data-icon-fill']).toBe('true')

    const reactOut = react(src)
    expect(reactOut).toContain('size={32}')
    expect(reactOut).toContain(`color="#ef4444"`)
    expect(reactOut).toContain('strokeWidth={1}')
    expect(reactOut).toContain(' fill ')

    const fwOut = fwIconProps(src)
    expect(fwOut).toMatch(/is:\s*'32'/)
    expect(fwOut).toMatch(/ic:\s*'#ef4444'/)
    expect(fwOut).toMatch(/iw:\s*'1'/)
    expect(fwOut).toMatch(/fill:\s*true/)
    // V-3 suppression: KEINE doppelten w/h/col/weight
    expect(fwOut).not.toMatch(/[^a-z]w:\s*\d/)
    expect(fwOut).not.toMatch(/[^a-z]h:\s*\d/)
    expect(fwOut).not.toMatch(/col:\s*'/)
    expect(fwOut).not.toMatch(/weight:\s*'/)
  })
})

// =============================================================================
// V-2: React MirrorIcon Component
// =============================================================================
describe('Slice 50 V-2 — React MirrorIcon component', () => {
  it('RT-10 — MirrorIcon-Component wird emittiert wenn Icon im Programm', () => {
    const out = react(`Icon "check"`)
    expect(out).toContain('function MirrorIcon')
    expect(out).toContain('_MIRROR_LUCIDE_CDN')
    expect(out).toContain('_mirrorSanitizeIconName')
    expect(out).toContain('_mirrorSanitizeSVG')
  })

  it('RT-11 — MirrorIcon-Component wird NICHT emittiert ohne Icon', () => {
    const out = react(`Frame\n  Text "no icons here"`)
    expect(out).not.toContain('function MirrorIcon')
  })

  it('RT-12 — React-Output: kein literal text-Leak `{"check"}` mehr', () => {
    const out = react(`Icon "check"`)
    // Pre-Slice-50: <span>{"check"}</span>. Post-fix: <MirrorIcon name="check" />
    expect(out).toContain('<MirrorIcon name="check"')
    expect(out).not.toMatch(/<span[^>]*>\s*\{"check"\}/)
  })
})

// =============================================================================
// Token-driven
// =============================================================================
describe('Slice 50 — Token-driven Icon-Properties', () => {
  it('RT-13 — `Icon "x", is $size` cross-backend: var(--..) survives', () => {
    const src = `iconSize.is: 24
Icon "check", is $iconSize`
    // DOM: emits as CSS width/height with var(--iconSize-is)
    const domOut = dom(src)
    expect(domOut).toMatch(/var\(--iconSize-is\)/)
    // React: MirrorIcon receives size as a string token reference
    const reactOut = react(src)
    expect(reactOut).toContain('<MirrorIcon name="check"')
    expect(reactOut).toContain('size=')
    // Framework: token survives
    expect(fw(src)).toMatch(/iconSize/)
  })

  it('RT-14 — `Icon "x", ic $primary` cross-backend (with .ic suffix)', () => {
    // Note: ic-suffix is `.ic` per token-suffixes.ts:80. User must define
    // `primary.ic` (NOT `primary.col`) for this token to resolve.
    // Cross-suffix-fallback (`.ic` → `.col`) is out-of-Slice-50-scope.
    const src = `primary.ic: #2271C1
Icon "check", ic $primary`
    const domOut = dom(src)
    expect(domOut).toMatch(/data-icon-color[^,)]+,\s*"var\(--primary-ic\)"/)
    expect(react(src)).toContain('<MirrorIcon name="check"')
  })
})

// =============================================================================
// State-Pfad
// =============================================================================
describe('Slice 50 — State-Pfad mit Icon', () => {
  it('RT-16 — `hover: ic #ef4444` cross-backend', () => {
    const src = `Icon "heart", ic #888
  hover:
    ic #ef4444`
    // DOM: state-style with hover transition
    const domOut = dom(src)
    expect(domOut).toMatch(/'color':\s*'#888'/)
    // Framework: states block
    const fwOut = fw(src)
    expect(fwOut).toMatch(/states:\s*\{\s*hover:/)
  })
})

// =============================================================================
// Edge-Cases
// =============================================================================
describe('Slice 50 — Edge-Cases', () => {
  it('RT-17 — unknown icon name fällt in DOM Runtime-fallback (compile-time OK)', () => {
    const src = `Icon "this-does-not-exist-xyz"`
    // Compile-time: name passes through to runtime; runtime applies fallback.
    const out = dom(src)
    expect(out).toMatch(/loadIcon\([^)]+,\s*"this-does-not-exist-xyz"\)/)
  })

  it('RT-19 — multi-word kebab `arrow-up-right` survives sanitizer', () => {
    expect(sanitizeIconName('arrow-up-right')).toBe('arrow-up-right')
  })

  it('RT-20 — sanitizeIconName boundary cases gepinnt', () => {
    // valid
    expect(sanitizeIconName('check')).toBe('check')
    expect(sanitizeIconName('arrow-up-right')).toBe('arrow-up-right')
    expect(sanitizeIconName('a'.repeat(50))).toBe('a'.repeat(50))
    // reject
    expect(sanitizeIconName('')).toBeNull()
    expect(sanitizeIconName(null as unknown as string)).toBeNull()
    expect(sanitizeIconName('a'.repeat(51))).toBeNull()
    expect(sanitizeIconName('Check')).toBeNull() // uppercase
    expect(sanitizeIconName('arrow_up')).toBeNull() // underscore
    expect(sanitizeIconName('arrow.up')).toBeNull() // dot
    expect(sanitizeIconName('check/x')).toBeNull() // slash
    expect(sanitizeIconName('javascript:alert(1)')).toBeNull()
    expect(sanitizeIconName('café')).toBeNull() // unicode
    // silent skip (compiler markers)
    expect(sanitizeIconName('__loopVar:icon.name')).toBeNull()
    expect(sanitizeIconName('__conditional:flag')).toBeNull()
  })
})

// =============================================================================
// V-3: Framework Reverse-Map Suppression
// =============================================================================
describe('Slice 50 V-3 — Framework Reverse-Map Icon-Suppression', () => {
  it('RT-21 — keine doppelten `w/is`, `h/is`, `col/ic`, `weight/iw`', () => {
    const src = `Icon "heart", is 32, ic #ef4444, iw 1`
    const out = fwIconProps(src)
    // Single source per axis: only `is`, `ic`, `iw` (no w/h/col/weight)
    expect(out).toMatch(/is:\s*'32'/)
    expect(out).toMatch(/ic:\s*'#ef4444'/)
    expect(out).toMatch(/iw:\s*'1'/)
    expect(out).not.toMatch(/[\s,{]w:\s*/)
    expect(out).not.toMatch(/[\s,{]h:\s*/)
    expect(out).not.toMatch(/col:\s*'/)
    expect(out).not.toMatch(/weight:\s*'/)
  })
})

// =============================================================================
// V-7: Cross-Slice gegen Slice 51 (Custom-Icons)
// =============================================================================
describe('Slice 50 V-7 — Cross-Slice gegen Slice 51 (Custom-Icons)', () => {
  it('RT-23 — Custom-Icon via $icons: Registry rendert in DOM via registerIcon', () => {
    const src = `$icons:
  myicon: "M3 3h18v18H3z|M9 3v18"
Icon "myicon", is 24, ic #2271C1`
    const out = dom(src)
    // Slice 51 V-* path: emit-static.ts:14-24 emits _runtime.registerIcon
    expect(out).toMatch(/registerIcon\([^)]*['"]myicon['"]/)
    // Compile-pfad survives:
    expect(out).toMatch(/loadIcon\([^)]+,\s*"myicon"\)/)
  })

  it('RT-23b — Custom-Icon in React: MirrorIcon component picks it up via runtime cache', () => {
    const src = `$icons:
  myicon: "M3 3h18v18H3z"
Icon "myicon"`
    const out = react(src)
    // The MirrorIcon component is emitted, and the icon name passes through.
    // Slice 51 wires the registry into runtime; React backend doesn't need to
    // know about $icons: at compile-time — it just emits <MirrorIcon name="myicon" />.
    expect(out).toContain('<MirrorIcon name="myicon"')
    // Note: actual `registerIcon` runtime hook in React backend is Slice 51 territory.
    // Re-Open-Trigger documented in 50-lucide-icons.md V-7.
  })
})

// =============================================================================
// V-8: Re-Open-Lock for ALL_PRIMITIVES schema-derive
// =============================================================================
describe('Slice 50 V-8 — Schema-Drift-Lock for primitive-matrix.test.ts', () => {
  it('RT-22 — DSL.primitives count gepinnt (Drift-Wake-up bei Schema-Erweiterung)', async () => {
    const { DSL } = await import('../../compiler/schema/dsl')
    // Wenn dieser Wert bricht: jemand hat eine neue Primitive zur Schema
    // hinzugefügt. `studio/test-api/suites/property-panel/primitive-matrix.test.ts`
    // muss überprüft werden, ob die neue Primitive in BASIC_PRIMITIVES /
    // CONTAINER_PRIMITIVES / HEADING_PRIMITIVES / Slot / Table-family gehört
    // (Slice 50 V-8 kommentar dort).
    expect(Object.keys(DSL.primitives).length).toBe(31)
  })
})
