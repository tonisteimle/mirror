// @vitest-environment jsdom
/**
 * Slice 7 — Grid mit expliziter Position (`x`/`y`/`w`/`h`) regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/07-grid-explicit-position.md`:
 *
 *   B-3 (CRITICAL)  Token-basierte `x N, y N` war broken:
 *                   `PROPERTY_TO_TOKEN_SUFFIX` hatte keine `.x`/`.y`-
 *                   Einträge. `Frame x $header` mit `header.x: 1`
 *                   resolved nicht — der Resolver dumpte das ganze
 *                   `header`-Objekt als String → `'[object Object]'`.
 *
 *   V-1 (CRITICAL)  Drei Fixes als Pair:
 *                   1. `compiler/schema/token-suffixes.ts` — `.x`/`.y`
 *                      als COUNT_SUFFIXES (unitless wie `.grid`).
 *                   2. `compiler/ir/transformers/property-transformer.ts`
 *                      — x/y akzeptieren CSS-var im grid-Kontext und
 *                      emittieren `grid-column-start: var(--name-x)`.
 *                      w/h akzeptieren CSS-var im grid-Kontext und
 *                      emittieren `grid-column-end: span var(--name-w)`.
 *                   3. `compiler/backends/framework.ts` — reverse-map
 *                      passt CSS-var-Werte durch (M-runtime resolved
 *                      sie zur Render-Zeit).
 *
 * Plus baseline-Cross-Backend-Lock für die DSL-Versprechen aus CLAUDE.md
 * (Header/Sidebar/Content-Layout, Mixed Auto-Flow + Explizit, Out-of-Grid-
 * Fallback, partial position, Span-only ohne Start, negative line, x 0).
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

// Pull a node's static CSS block from DOM output (Object.assign body).
function domNode(out: string, n: number): string {
  return out.match(new RegExp(`Object\\.assign\\(node_${n}\\.style, \\{([^}]*)\\}`, 's'))?.[1] ?? ''
}

// Pull the n-th `style={{ ... }}` block from React output.
function reactStyle(out: string, n: number): string {
  const all = Array.from(out.matchAll(/style=\{\{([^}]*)\}\}/gs))
  return all[n]?.[1] ?? ''
}

// Pull the n-th `M('Frame', { ... })` arg block from FW output.
function fwArgs(out: string, n: number): string {
  const all = Array.from(out.matchAll(/M\('Frame', \{([^}]*)\}/gs))
  return all[n]?.[1] ?? ''
}

describe('Slice 7 — Grid mit expliziter Position', () => {
  // ===========================================================================
  // RT-1 — Standard dashboard layout (header/sidebar/content)
  // ===========================================================================
  it('RT-1 — DOM dashboard layout (3 children, all 4 properties)', () => {
    const src = `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue
  Frame x 1, y 3, w 3, h 4, bg gray
  Frame x 4, y 3, w 9, h 4, bg white`
    const out = dom(src)
    const header = domNode(out, 2)
    expect(header).toContain("'grid-column-start': '1'")
    expect(header).toContain("'grid-row-start': '1'")
    expect(header).toContain("'grid-column-end': 'span 12'")
    expect(header).toContain("'grid-row-end': 'span 2'")
    const sidebar = domNode(out, 3)
    expect(sidebar).toContain("'grid-column-start': '1'")
    expect(sidebar).toContain("'grid-row-start': '3'")
    expect(sidebar).toContain("'grid-column-end': 'span 3'")
    expect(sidebar).toContain("'grid-row-end': 'span 4'")
  })

  it('RT-2 — React dashboard layout matches DOM', () => {
    const src = `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue
  Frame x 1, y 3, w 3, h 4, bg gray
  Frame x 4, y 3, w 9, h 4, bg white`
    const out = react(src)
    const header = reactStyle(out, 1)
    expect(header).toContain("gridColumnStart: '1'")
    expect(header).toContain("gridRowStart: '1'")
    expect(header).toContain("gridColumnEnd: 'span 12'")
    expect(header).toContain("gridRowEnd: 'span 2'")
    const sidebar = reactStyle(out, 2)
    expect(sidebar).toContain("gridColumnStart: '1'")
    expect(sidebar).toContain("gridRowStart: '3'")
    expect(sidebar).toContain("gridColumnEnd: 'span 3'")
  })

  it('RT-3 — Framework dashboard round-trip', () => {
    const src = `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue
  Frame x 1, y 3, w 3, h 4, bg gray`
    const out = fw(src)
    expect(fwArgs(out, 1)).toContain('x: 1, y: 1, w: 12, h: 2')
    expect(fwArgs(out, 2)).toContain('x: 1, y: 3, w: 3, h: 4')
  })

  // ===========================================================================
  // RT-4 — Mixed children: explicit header + auto-flow children
  // ===========================================================================
  it('RT-4 — mixed children (explicit + auto-flow)', () => {
    const src = `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 1, bg red
  Frame
  Frame
  Frame`
    const out = dom(src)
    const header = domNode(out, 2)
    expect(header).toContain("'grid-column-start': '1'")
    expect(header).toContain("'grid-column-end': 'span 12'")
    // Auto-flow children must NOT carry grid-column-start
    const child3 = domNode(out, 3)
    expect(child3).not.toContain('grid-column-start')
    expect(child3).not.toContain('grid-column-end')
  })

  // ===========================================================================
  // RT-5 — Sibling overlap (same x/y/w/h on two siblings)
  // ===========================================================================
  it('RT-5 — sibling overlap emits identical cell on both', () => {
    const src = `Frame grid 4
  Frame x 1, y 1, w 2, h 2, bg blue
  Frame x 1, y 1, w 2, h 2, bg yellow`
    const out = dom(src)
    expect(domNode(out, 2)).toContain("'grid-column-start': '1'")
    expect(domNode(out, 3)).toContain("'grid-column-start': '1'")
  })

  // ===========================================================================
  // RT-6 — Out-of-grid (no grid parent): `position: absolute, left/top`
  // ===========================================================================
  it('RT-6 — x/y outside grid → position: absolute + left/top (DOM)', () => {
    const src = `Frame
  Frame x 100, y 50, w 80, h 80, bg red`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'position': 'absolute'")
    expect(child).toContain("'left': '100px'")
    expect(child).toContain("'top': '50px'")
    // No grid spans (no grid parent)
    expect(child).not.toContain('grid-column-start')
    expect(child).not.toContain('grid-column-end')
  })

  it('RT-6b — x/y outside grid (React)', () => {
    const src = `Frame
  Frame x 100, y 50, w 80, h 80, bg red`
    const out = react(src)
    const child = reactStyle(out, 1)
    expect(child).toContain("position: 'absolute'")
    expect(child).toContain("left: '100px'")
    expect(child).toContain("top: '50px'")
    expect(child).not.toContain('gridColumnStart')
  })

  // ===========================================================================
  // RT-7 — Token-resolved x/y/w/h in grid context (Slice 7 V-1)
  // ===========================================================================
  it('RT-7 — token x/y/w/h (DOM) emits CSS-vars in grid context', () => {
    const src = `header.x: 1
header.y: 1
header.w: 12
header.h: 2

Frame grid 12
  Frame x $header, y $header, w $header, h $header, bg blue`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-column-start': 'var(--header-x)'")
    expect(child).toContain("'grid-row-start': 'var(--header-y)'")
    expect(child).toContain("'grid-column-end': 'span var(--header-w)'")
    expect(child).toContain("'grid-row-end': 'span var(--header-h)'")
    // Companion 100% emitted (DOM-only artefact)
    expect(child).toContain("'width': '100%'")
    expect(child).toContain("'height': '100%'")
    // No `[object Object]` from broken token-resolution
    expect(child).not.toContain('[object Object]')
    // Not falling through to absolute path
    expect(child).not.toContain("'position': 'absolute'")
  })

  it('RT-8 — token x/y/w/h (React) pre-resolves to numbers', () => {
    const src = `header.x: 1
header.y: 1
header.w: 12
header.h: 2

Frame grid 12
  Frame x $header, y $header, w $header, h $header, bg blue`
    const out = react(src)
    const child = reactStyle(out, 1)
    expect(child).toContain("gridColumnStart: '1'")
    expect(child).toContain("gridRowStart: '1'")
    expect(child).toContain("gridColumnEnd: 'span 12'")
    expect(child).toContain("gridRowEnd: 'span 2'")
    expect(child).not.toContain("position: 'absolute'")
  })

  it('RT-9 — token x/y/w/h (Framework) round-trips as var()', () => {
    const src = `header.x: 1
header.y: 1
header.w: 12
header.h: 2

Frame grid 12
  Frame x $header, y $header, w $header, h $header, bg blue`
    const out = fw(src)
    const args = fwArgs(out, 1)
    expect(args).toContain("x: 'var(--header-x)'")
    expect(args).toContain("y: 'var(--header-y)'")
    expect(args).toContain("w: 'var(--header-w)'")
    expect(args).toContain("h: 'var(--header-h)'")
    // No w: 'full' clobber from `width: 100%` companion
    expect(args).not.toContain("w: 'full'")
    expect(args).not.toContain("h: 'full'")
    expect(args).not.toContain('NaN')
  })

  // ===========================================================================
  // RT-10 — Property-Set token (Spread aller 4)
  // ===========================================================================
  it('RT-10 — property-set token spreads x/y/w/h', () => {
    const src = `header: x 1, y 1, w 12, h 2

Frame grid 12
  Frame $header, bg blue`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-column-start': '1'")
    expect(child).toContain("'grid-row-start': '1'")
    expect(child).toContain("'grid-column-end': 'span 12'")
    expect(child).toContain("'grid-row-end': 'span 2'")
  })

  // ===========================================================================
  // RT-11 — row-height + explicit position
  // ===========================================================================
  it('RT-11 — grid 3, row-height 100 + explicit position', () => {
    const src = `Frame grid 3, row-height 100
  Frame x 1, y 1, w 3, h 1, bg red
  Frame x 1, y 2, w 1, h 2, bg blue
  Frame x 2, y 2, w 2, h 1, bg green`
    const out = dom(src)
    expect(domNode(out, 1)).toContain("'grid-auto-rows': '100px'")
    expect(domNode(out, 2)).toContain("'grid-row-end': 'span 1'")
    expect(domNode(out, 3)).toContain("'grid-row-end': 'span 2'")
    expect(domNode(out, 4)).toContain("'grid-column-end': 'span 2'")
  })

  // ===========================================================================
  // RT-12 — Negative position (CSS: `-1` = letzte Linie)
  // ===========================================================================
  it('RT-12 — x -1 emits negative line', () => {
    const src = `Frame grid 4
  Frame x -1, y 1, w 1, h 1, bg purple`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-column-start': '-1'")
    const reactOut = react(src)
    expect(reactStyle(reactOut, 1)).toContain("gridColumnStart: '-1'")
  })

  // ===========================================================================
  // RT-13 — Spans without start (auto-place + span)
  // ===========================================================================
  it('RT-13 — w/h without x/y in grid → only spans', () => {
    const src = `Frame grid 12
  Frame w 6, h 2, bg blue
  Frame w 6, h 2, bg red`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-column-end': 'span 6'")
    expect(child).toContain("'grid-row-end': 'span 2'")
    // No grid-column-start (auto-place)
    expect(child).not.toContain('grid-column-start')
    expect(child).not.toContain('grid-row-start')
  })

  // ===========================================================================
  // RT-14 — partial position (only x or only y)
  // ===========================================================================
  it('RT-14 — only x in grid', () => {
    const src = `Frame grid 4
  Frame x 2, w 2, bg blue`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-column-start': '2'")
    expect(child).toContain("'grid-column-end': 'span 2'")
    expect(child).not.toContain('grid-row-start')
  })

  it('RT-15 — only y in grid', () => {
    const src = `Frame grid 4
  Frame y 3, w 4, bg green`
    const out = dom(src)
    const child = domNode(out, 2)
    expect(child).toContain("'grid-row-start': '3'")
    expect(child).toContain("'grid-column-end': 'span 4'")
    expect(child).not.toContain('grid-column-start')
  })

  // ===========================================================================
  // Phase B — IR + Backend Cleanup
  // ===========================================================================

  // V-2 (B-2): position: absolute dedup when both x and y are out-of-grid.
  it('RT-16 — position:absolute emitted only once for x+y out-of-grid', () => {
    const src = `Frame
  Frame x 100, y 50, w 80, h 80, bg red`
    const out = dom(src)
    const child = domNode(out, 2)
    const positionMatches = child.match(/'position':\s*'absolute'/g) ?? []
    expect(positionMatches.length).toBe(1)
  })

  // V-3 (B-4): React grid container drops flexDirection (defensive vs hor/ver).
  it('RT-17 — React grid container omits flexDirection from layout-defaults', () => {
    const src = `Frame grid 12
  Frame w 6`
    const out = react(src)
    const container = reactStyle(out, 0)
    expect(container).toContain("display: 'grid'")
    expect(container).toContain("gridTemplateColumns: 'repeat(12, 1fr)'")
    expect(container).not.toContain('flexDirection')
  })

  // V-3 (B-4): React `grid + hor` forces grid to win and emits gridAutoFlow.
  it('RT-18 — React grid + hor → display:grid + gridAutoFlow:row (no flexDirection)', () => {
    const src = `Frame grid 4, hor
  Frame x 1, y 1, w 2, bg red
  Frame x 3, y 1, w 2, bg blue`
    const out = react(src)
    const container = reactStyle(out, 0)
    expect(container).toContain("display: 'grid'")
    expect(container).toContain("gridAutoFlow: 'row'")
    expect(container).not.toContain('flexDirection')
  })

  // V-7 (B-7): Schema `x`/`y` CSS-mapping is sentinel-empty — IR pipeline owns
  // the semantics. This RT locks the dead-code-removal so future schema-derived
  // refactors don't accidentally re-introduce `transform: translateX(Npx)`.
  it('RT-19 — Schema x/y emit no CSS via schema-direct path (IR-only)', async () => {
    const { SCHEMA } = await import('../../compiler/schema/property-schema')
    expect(SCHEMA.x.numeric?.css(10, [10])).toEqual([])
    expect(SCHEMA.y.numeric?.css(50, [50])).toEqual([])
  })

  // V-6 (B-1): Validator rejects w/h: 0 — both the degenerate width-0 and
  // span-0 forms. `mar 0`/`pad 0`/`gap 0` (zero-spacing) remain valid.
  it('RT-20 — `Frame w 0` is rejected (E105)', () => {
    const r = validate('Frame w 0')
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => e.code === 'E105')).toBe(true)
  })

  it('RT-21 — `Frame h 0` is rejected (E105)', () => {
    const r = validate('Frame h 0')
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => e.code === 'E105')).toBe(true)
  })

  it('RT-22 — `Frame w 1, h 1` is accepted (boundary)', () => {
    expect(validate('Frame w 1, h 1').valid).toBe(true)
  })

  it('RT-23 — `Frame mar 0, pad 0, gap 0` stays valid (regression-pin)', () => {
    expect(validate('Frame mar 0, pad 0, gap 0').valid).toBe(true)
  })
})
