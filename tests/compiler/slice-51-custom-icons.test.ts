// @vitest-environment jsdom
/**
 * Slice 51 — Custom-Icons-Registry RT-Suite.
 *
 * Audit-Befunde aus `docs/refactoring/51-custom-icons.md`:
 *
 *   V-1 (CRITICAL)  React-Backend Custom-Icons-Registry. Pre-Slice-51
 *                   emittierte React `<MirrorIcon name="hbox" />` ohne
 *                   Custom-Icon-Path → Lucide-CDN-Fetch für "hbox" (404)
 *                   → FALLBACK_ICON. Cross-Backend broken.
 *
 *   V-2 (CRITICAL)  Framework-Backend Custom-Icons-Registry. Pre-Slice-51
 *                   emittierte gar keinen Custom-Icon-Pfad. mirror-runtime
 *                   exposes `M.registerIcon` — `framework.ts:emitCustomIcons`
 *                   emittiert die Calls.
 *
 *   V-3             Diese RT-Suite (Cross-Backend-Tabelle).
 *
 *   V-4/V-5         Validator-Härtung + SVG-Path-Sanitization deferred
 *                   mit Re-Open-Trigger.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
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

const HBOX = `\$icons:
  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
Icon "hbox"`

const HBOX_FULL = `\$icons:
  hbox: "M3 3h18v18H3z|M9 3v18"
Icon "hbox", is 32, ic #ef4444, iw 1, fill`

const MIXED = `\$icons:
  myicon: "M3 3h18v18H3z"
Icon "myicon"
Icon "check"`

// =============================================================================
// V-1 / V-2: Cross-Backend Custom-Icon registry-emit
// =============================================================================
describe('Slice 51 V-1/V-2 — Cross-Backend Custom-Icon registry-emit', () => {
  it('RT-1 — DOM emits `_runtime.registerIcon(name, path, viewBox)`', () => {
    const out = dom(HBOX)
    expect(out).toMatch(/_runtime\.registerIcon\(\s*['"]hbox['"]/)
    expect(out).toContain(`"M3 3h18v18H3z|M9 3v18|M15 3v18"`)
    expect(out).toContain(`'0 0 24 24'`)
  })

  it('RT-2 — React emits `_MIRROR_CUSTOM_ICONS["hbox"] = { path, viewBox }`', () => {
    const out = react(HBOX)
    expect(out).toContain('_MIRROR_CUSTOM_ICONS["hbox"]')
    expect(out).toContain(`path: "M3 3h18v18H3z|M9 3v18|M15 3v18"`)
    expect(out).toContain(`viewBox: "0 0 24 24"`)
  })

  it('RT-3 — Framework emits `M.registerIcon(name, path, viewBox)`', () => {
    const out = fw(HBOX)
    expect(out).toMatch(/M\.registerIcon\(\s*['"]hbox['"]/)
    expect(out).toContain(`"M3 3h18v18H3z|M9 3v18|M15 3v18"`)
  })

  it('RT-4 — MirrorIcon component checks _MIRROR_CUSTOM_ICONS BEFORE Lucide-CDN fetch', () => {
    const out = react(HBOX)
    // The custom-check logic must precede the actual fetch() call.
    const customCheckIdx = out.indexOf('_MIRROR_CUSTOM_ICONS[name]')
    const fetchIdx = out.indexOf('fetch(_MIRROR_LUCIDE_CDN')
    expect(customCheckIdx).toBeGreaterThan(0)
    expect(fetchIdx).toBeGreaterThan(0)
    expect(customCheckIdx).toBeLessThan(fetchIdx)
  })

  it('RT-5 — `_mirrorBuildCustomSvg` helper handles multi-path with `|`', () => {
    const out = react(HBOX)
    expect(out).toContain('_mirrorBuildCustomSvg')
    // Helper splits on /[\n|]/ — verify the regex literal exists.
    expect(out).toContain('split(/[\\n|]/)')
  })
})

// =============================================================================
// Custom + Lucide Mixing
// =============================================================================
describe('Slice 51 — Custom + Lucide Mixing', () => {
  it('RT-6 — DOM: both registerIcon (custom) and loadIcon (Lucide name)', () => {
    const out = dom(MIXED)
    expect(out).toMatch(/registerIcon\(\s*['"]myicon['"]/)
    expect(out).toMatch(/loadIcon\([^)]+,\s*"myicon"\)/)
    expect(out).toMatch(/loadIcon\([^)]+,\s*"check"\)/)
  })

  it('RT-7 — React: Custom-Registry has myicon, MirrorIcon emitted for both', () => {
    const out = react(MIXED)
    expect(out).toContain('_MIRROR_CUSTOM_ICONS["myicon"]')
    expect(out).not.toContain('_MIRROR_CUSTOM_ICONS["check"]')
    expect(out).toContain('<MirrorIcon name="myicon"')
    expect(out).toContain('<MirrorIcon name="check"')
  })

  it('RT-8 — Framework: Custom registry-call only for myicon, Lucide passthrough for check', () => {
    const out = fw(MIXED)
    expect(out).toMatch(/M\.registerIcon\(\s*['"]myicon['"]/)
    expect(out).not.toMatch(/M\.registerIcon\(\s*['"]check['"]/)
  })
})

// =============================================================================
// Custom-Icon mit allen Properties
// =============================================================================
describe('Slice 51 — Custom-Icon mit allen Properties', () => {
  it('RT-9 — Custom-Icon survives is/ic/iw/fill cross-backend', () => {
    const reactOut = react(HBOX_FULL)
    expect(reactOut).toContain('_MIRROR_CUSTOM_ICONS["hbox"]')
    expect(reactOut).toContain('size={32}')
    expect(reactOut).toContain(`color="#ef4444"`)
    expect(reactOut).toContain('strokeWidth={1}')
    expect(reactOut).toContain(' fill ')

    const fwOut = fw(HBOX_FULL)
    expect(fwOut).toMatch(/M\.registerIcon\(\s*['"]hbox['"]/)
    expect(fwOut).toMatch(/is:\s*'32'/)
    expect(fwOut).toMatch(/ic:\s*'#ef4444'/)
    expect(fwOut).toMatch(/iw:\s*'1'/)
    expect(fwOut).toMatch(/fill:\s*true/)
  })
})

// =============================================================================
// Edge-Cases (Pre-Fix-State gepinnt — Re-Open-Trigger für Validator-Reform)
// =============================================================================
describe('Slice 51 — Edge-Cases (current behavior, V-4/V-5 deferred)', () => {
  it('RT-10 — leerer Pfad emit-survives (V-4 Re-Open-Trigger)', () => {
    const src = `\$icons:
  empty: ""
Icon "empty"`
    // Pre-V-4-Behavior: silent emit. Post-V-4 würde der Validator E5xx werfen.
    // Lock pin: aktuelles Verhalten ist silent — wenn das jemals ändert,
    // ist V-4 implementiert (was mit Re-Open-Trigger im Audit-Doc dokumentiert).
    const out = dom(src)
    expect(out).toMatch(/registerIcon\(\s*['"]empty['"][^,]*,\s*""/)
  })

  it('RT-11 — uppercase Name emit-survives (V-5 Re-Open-Trigger)', () => {
    const src = `\$icons:
  Bad: "M3 3h18v18H3z"
Icon "Bad"`
    // Compile-Zeit: silent emit. Runtime: sanitizeIconName REJECT.
    const out = dom(src)
    expect(out).toMatch(/registerIcon\(\s*['"]Bad['"]/)
  })
})
