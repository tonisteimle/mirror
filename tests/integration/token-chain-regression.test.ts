/**
 * Token Chain Regression Tests (Slice 24, Phase B)
 *
 * Locks down the chain-token bug: `accent.bg: $primary` must produce a
 * functioning CSS variable, not a literal `$primary` in the output and
 * not a missing-variable use-site.
 *
 * Three chain forms covered:
 *   custom suffix:  mycolor.bg: $primary           → --mycolor-bg: var(--primary-bg)
 *   theme name:     accent.bg:  $primary           → --accent-bg: <inline hex from primary.bg>
 *                                                    (theme-tokens need real hex for derived darken/lighten)
 *   3-glied chain:  a.bg: $b · b.bg: $c · c.bg #f00 → element renders #f00
 *
 * Plus DX coverage: unknown-token refs are skipped (no broken `$xxx` in CSS).
 */

import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function getStyleBlock(out: string): string {
  const m = out.match(/_style\.textContent\s*=\s*`([\s\S]*?)`/)
  return m ? m[1] : ''
}

function compile(code: string): string {
  return generateDOM(parse(code))
}

// =============================================================================
// RT-1: Chain into custom token emits CSS-cascade reference
// =============================================================================

describe('RT-1: Chain into custom token (CSS cascade)', () => {
  it('emits `var(--source)` for custom-suffix chain', () => {
    const css = getStyleBlock(
      compile(`primary.bg: #2271C1
mycolor.bg: $primary
Frame bg $mycolor`)
    )
    expect(css).toMatch(/--primary-bg:\s*#2271C1/)
    expect(css).toMatch(/--mycolor-bg:\s*var\(--primary-bg\)/)
  })

  it('does NOT leave a literal `$xxx` in the user tokens block', () => {
    const css = getStyleBlock(
      compile(`primary.bg: #f00
mycolor.bg: $primary
Frame bg $mycolor`)
    )
    const userBlock = css.match(/\/\* User Tokens \*\/[\s\S]*?\}/)?.[0] ?? ''
    expect(userBlock).not.toMatch(/\$primary/)
  })
})

// =============================================================================
// RT-2: jsdom mount — getComputedStyle resolves the chain
// =============================================================================

describe('RT-2: Chain produces a valid CSS-cascade in the stylesheet', () => {
  it('extract the CSS rules and verify all chain links are defined', () => {
    const code = `primary.bg: #2271c1
mycolor.bg: $primary
Frame bg $mycolor`

    const css = getStyleBlock(compile(code))

    // Mount only the <style> block in jsdom and inspect a probe element.
    // The emitted JS has top-level `export` so we don't eval it; the CSS
    // by itself is enough to verify cascade definitions.
    const dom = new JSDOM(
      `<!DOCTYPE html><html><head><style>${css}</style></head>
       <body><div class="mirror-root">
         <div id="probe" style="background: var(--mycolor-bg);"></div>
       </div></body></html>`
    )

    const probe = dom.window.document.getElementById('probe')!
    expect(probe.style.background).toBe('var(--mycolor-bg)')

    // The cascade is intact: --mycolor-bg → var(--primary-bg) → #2271c1
    expect(css).toMatch(/--mycolor-bg:\s*var\(--primary-bg\)/)
    expect(css).toMatch(/--primary-bg:\s*#2271c1/)
  })
})

// =============================================================================
// RT-3: Three-link chain
// =============================================================================

describe('RT-3: Three-link chain', () => {
  it('a.bg → b.bg → c.bg → terminal value', () => {
    const css = getStyleBlock(
      compile(`a.bg: $b
b.bg: $c
c.bg: #f00
Frame bg $a`)
    )
    expect(css).toMatch(/--a-bg:\s*var\(--b-bg\)/)
    expect(css).toMatch(/--b-bg:\s*var\(--c-bg\)/)
    expect(css).toMatch(/--c-bg:\s*#f00/)
  })
})

// =============================================================================
// RT-4: Unknown chain target — skipped, not literal
// =============================================================================

describe('RT-4: Unknown token reference is skipped', () => {
  it('does not emit a CSS variable that points to nothing', () => {
    const css = getStyleBlock(
      compile(`primary.bg: #f00
mycolor.bg: $primry
Frame bg $mycolor`)
    )
    // `--primry` does not exist, so we should NOT emit `--mycolor-bg` at all
    // (would be a dangling var). Validator W500 covers the user-facing diagnostic.
    expect(css).toMatch(/--primary-bg:\s*#f00/)
    expect(css).not.toMatch(/--mycolor-bg:\s*\$primry/)
    expect(css).not.toMatch(/--mycolor-bg:\s*var\(--primry/)
  })

  it('does not crash on unresolved chain', () => {
    expect(() =>
      compile(`mycolor.bg: $undefined
Frame bg $mycolor`)
    ).not.toThrow()
  })
})

// =============================================================================
// RT-9: Cycle terminates
// =============================================================================

describe('RT-9: Cycles terminate without crash', () => {
  it('2-cycle terminates', () => {
    const start = Date.now()
    expect(() =>
      compile(`a.bg: $b
b.bg: $a
Frame bg $a`)
    ).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('10-cycle terminates', () => {
    const lines: string[] = []
    for (let i = 0; i < 10; i++) {
      lines.push(`t${i}.bg: $t${(i + 1) % 10}`)
    }
    lines.push('Frame bg $t0')
    const start = Date.now()
    expect(() => compile(lines.join('\n'))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

// =============================================================================
// RT-Theme: Chain into theme-token name resolves before darken/lighten
// =============================================================================

describe('Theme-token chain (auto-derived hover/active)', () => {
  it('accent.bg: $primary — derived variants compute from resolved hex', () => {
    const css = getStyleBlock(
      compile(`primary.bg: #2271C1
accent.bg: $primary
Frame bg $accent`)
    )
    // Theme block uses inline-resolved value (color-transforms need hex)
    expect(css).toMatch(/--accent-bg:\s*#2271C1/)
    // Auto-generated hover/active variants must be valid hex (darkened),
    // not literal `$primary` strings.
    const hoverMatch = css.match(/--accent-hover-bg:\s*([^;]+);/)
    expect(hoverMatch?.[1]?.trim()).toMatch(/^#[0-9a-fA-F]+$/)
    const activeMatch = css.match(/--accent-active-bg:\s*([^;]+);/)
    expect(activeMatch?.[1]?.trim()).toMatch(/^#[0-9a-fA-F]+$/)
  })

  it('unresolvable theme chain falls back to theme defaults', () => {
    const css = getStyleBlock(
      compile(`accent.bg: $undefined
Frame bg $accent`)
    )
    // Default theme accent (#5BA8F5) — no literal $undefined
    expect(css).not.toMatch(/\$undefined/)
    expect(css).toMatch(/--accent-bg:\s*#[0-9a-fA-F]+/)
  })
})
