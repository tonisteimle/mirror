// @vitest-environment jsdom
/**
 * Slice 6 — Grid 12-col regression suite.
 *
 * Audit-Befunde aus `docs/refactoring/06-grid.md`:
 *
 *   B-1/B-2 (CRITICAL)  React-Backend hatte KEINE switch-cases für
 *                       `grid`, `dense`, `row-height` — `Frame grid 3`
 *                       rendere als `display:flex, flexDirection:column`,
 *                       komplette Layout-Inversion.
 *   B-3 (CRITICAL)      `Frame w 6` im grid-12-Container interpretiert als
 *                       `width: 6px` statt `grid-column-end: span 6`.
 *   B-4 (CRITICAL)      React droppt `x`/`y` Properties komplett.
 *   B-5 (CRITICAL)      Framework-Backend hat keine reverse-map für
 *                       grid-column-start/grid-row-start/grid-column-end/
 *                       grid-row-end → Designer-Inspect-View ohne Position.
 *   B-6 (HIGH)          React droppt `row-height`/`rh`/`dense`.
 *   B-8 (HIGH)          Token-Resolution `grid $cols` mit `cols.grid: 12` —
 *                       DOM emittierte nur `display: grid` ohne template-
 *                       columns; FW emittierte `w: 'full'` (komplett falsch).
 *   B-9 (LOW DX)        Validator akzeptierte `grid 0`/`grid -1` silent.
 *
 * Fixes (V-1..V-5):
 *   V-1  React `generateStyles`: grid/row-height/dense Cases.
 *   V-2  React `generateJSX` parent-context-aware (w/h/x/y in grid).
 *   V-3  Framework reverse-map für grid-column-start/end/-row-start/end.
 *   V-4  Token-Suffix `.grid` + COUNT_SUFFIXES + resolveGrid TokenReference +
 *        chain-resolver derived from canonical map.
 *   V-5  Validator E105 für `grid 0` / negative.
 *
 * Cross-Slice-Probe: Slice 7 (`x`/`y` als grid-position) wird parallel von
 * `slice-7-explicit-grid-position.test.ts` gelocked; hier nur die Slice-6-
 * Pfade plus minimaler Cross-Backend-Differential für RT-11/12.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { Validator } from '../../compiler/validator'

function dom(src: string): string {
  return generateDOM(parse(src))
}
function react(src: string): string {
  return generateReact(parse(src))
}
function fw(src: string): string {
  return generateFramework(parse(src))
}

function domNode(out: string, n: number): string {
  return out.match(new RegExp(`Object\\.assign\\(node_${n}\\.style, \\{([^}]*)\\}`, 's'))?.[1] ?? ''
}

function reactStyle(out: string, n: number): string {
  const all = Array.from(out.matchAll(/style=\{\{([^}]*)\}\}/gs))
  return all[n]?.[1] ?? ''
}

function fwArgs(out: string, n: number): string {
  const all = Array.from(out.matchAll(/M\('Frame', \{([^}]*)\}/gs))
  return all[n]?.[1] ?? ''
}

describe('Slice 6 — Grid 12-col', () => {
  // ===========================================================================
  // Phase A — React Grid-Container (V-1)
  // ===========================================================================
  it('RT-1 — React: `Frame grid 3` → display:grid + repeat(3, 1fr)', () => {
    const out = react(`Frame grid 3\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("display: 'grid'")
    expect(root).toContain("gridTemplateColumns: 'repeat(3, 1fr)'")
  })

  it('RT-2 — React: `Frame grid 12` → repeat(12, 1fr)', () => {
    const out = react(`Frame grid 12\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("display: 'grid'")
    expect(root).toContain("gridTemplateColumns: 'repeat(12, 1fr)'")
  })

  it('RT-3 — React: `Frame grid auto` → display:grid only (no template-columns)', () => {
    const out = react(`Frame grid auto\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("display: 'grid'")
    expect(root).not.toContain('gridTemplateColumns')
  })

  it('RT-4 — React: `Frame grid auto 250` → repeat(auto-fill, minmax(250px, 1fr))', () => {
    const out = react(`Frame grid auto 250\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("display: 'grid'")
    expect(root).toContain("gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'")
  })

  it('RT-5 — React: `grid 3, row-height 100` → gridAutoRows:100px', () => {
    const out = react(`Frame grid 3, row-height 100\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("gridAutoRows: '100px'")
  })

  it('RT-5b — React: `grid 3, rh 80` (alias) → gridAutoRows:80px', () => {
    const out = react(`Frame grid 3, rh 80\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("gridAutoRows: '80px'")
  })

  it('RT-6 — React: `grid 3, dense` → gridAutoFlow:dense', () => {
    const out = react(`Frame grid 3, dense\n  Frame`)
    const root = reactStyle(out, 0)
    expect(root).toContain("gridAutoFlow: 'dense'")
  })

  // ===========================================================================
  // Phase A — React Child-Grid-Position parent-context-aware (V-2)
  // ===========================================================================
  it('RT-7 — React: child `w 6` in grid 12 → gridColumnEnd:span 6 + width:100%', () => {
    const out = react(`Frame grid 12\n  Frame w 6, bg #1a1a1a`)
    const child = reactStyle(out, 1)
    expect(child).toContain("gridColumnEnd: 'span 6'")
    expect(child).toContain("width: '100%'")
  })

  it('RT-8 — React: child `w 6` OUTSIDE grid → width:6px (regression-pin)', () => {
    // Outside grid context, `w 6` is pixel-width. Lock the regression so a
    // future refactor doesn't accidentally span-ify ALL `w N` properties.
    const out = react(`Frame\n  Frame w 6, bg #1a1a1a`)
    const child = reactStyle(out, 1)
    expect(child).toContain("width: '6px'")
    expect(child).not.toContain('gridColumnEnd')
  })

  it('RT-9 — React: child `x 1, y 1` in grid → gridColumnStart:1 + gridRowStart:1', () => {
    const out = react(`Frame grid 12\n  Frame x 1, y 1, w 12`)
    const child = reactStyle(out, 1)
    expect(child).toContain("gridColumnStart: '1'")
    expect(child).toContain("gridRowStart: '1'")
  })

  it('RT-10 — React: `x 100, y 50` outside grid → position:absolute + left/top', () => {
    const out = react(`Frame\n  Frame x 100, y 50, bg red`)
    const child = reactStyle(out, 1)
    expect(child).toContain("position: 'absolute'")
    expect(child).toContain("left: '100px'")
    expect(child).toContain("top: '50px'")
  })

  // ===========================================================================
  // Cross-Backend Differential (V-6 — RT-11, RT-12)
  // ===========================================================================
  it('RT-11 — Cross-Backend: `grid 12 + w 6` emits column-span across DOM, React, FW', () => {
    const src = `Frame grid 12\n  Frame w 6, bg #1a1a1a`
    const dOut = dom(src)
    const rOut = react(src)
    const fOut = fw(src)

    // DOM
    expect(domNode(dOut, 2)).toContain("'grid-column-end': 'span 6'")
    expect(domNode(dOut, 2)).toContain("'width': '100%'")
    // React
    expect(reactStyle(rOut, 1)).toContain("gridColumnEnd: 'span 6'")
    expect(reactStyle(rOut, 1)).toContain("width: '100%'")
    // Framework — reverse-mapped to `w: 6` (Mirror DSL form, not span-N)
    expect(fwArgs(fOut, 1)).toMatch(/w:\s*6/)
  })

  it('RT-12 — Cross-Backend: explicit grid position (Slice-7-Beifang)', () => {
    const src = `Frame grid 12\n  Frame x 1, y 1, w 12, h 2, bg blue`
    const dOut = dom(src)
    const rOut = react(src)
    const fOut = fw(src)

    // DOM
    expect(domNode(dOut, 2)).toContain("'grid-column-start': '1'")
    expect(domNode(dOut, 2)).toContain("'grid-row-start': '1'")
    expect(domNode(dOut, 2)).toContain("'grid-column-end': 'span 12'")
    expect(domNode(dOut, 2)).toContain("'grid-row-end': 'span 2'")
    // React
    expect(reactStyle(rOut, 1)).toContain("gridColumnStart: '1'")
    expect(reactStyle(rOut, 1)).toContain("gridRowStart: '1'")
    expect(reactStyle(rOut, 1)).toContain("gridColumnEnd: 'span 12'")
    expect(reactStyle(rOut, 1)).toContain("gridRowEnd: 'span 2'")
    // Framework — reverse-mapped
    const fArg = fwArgs(fOut, 1)
    expect(fArg).toMatch(/x:\s*1/)
    expect(fArg).toMatch(/y:\s*1/)
    expect(fArg).toMatch(/w:\s*12/)
    expect(fArg).toMatch(/h:\s*2/)
  })

  // ===========================================================================
  // Phase B — Framework Reverse-Map (V-3 — RT-13)
  // ===========================================================================
  it('RT-13 — Framework: grid-column-start/-end reverse-mapped to `x`/`w` in M args', () => {
    const out = fw(`Frame grid 12\n  Frame x 3, y 5, w 4, h 2, bg green`)
    const child = fwArgs(out, 1)
    expect(child).toMatch(/x:\s*3/)
    expect(child).toMatch(/y:\s*5/)
    expect(child).toMatch(/w:\s*4/)
    expect(child).toMatch(/h:\s*2/)
    // Companions (`width: '100%'`, `height: '100%'`) must NOT leak through.
    expect(child).not.toMatch(/'width':\s*'100%'/)
    expect(child).not.toMatch(/'height':\s*'100%'/)
  })

  // ===========================================================================
  // Phase D — Validator (V-5 — RT-14, RT-15)
  // ===========================================================================
  it('RT-14 — Validator: `grid 0` → E105', () => {
    const ast = parse(`Frame grid 0\n  Frame`)
    const r = new Validator().validate(ast)
    const e105 = r.errors.find(e => e.code === 'E105')
    expect(e105).toBeDefined()
    expect(e105!.message).toMatch(/grid.*0.*positive integer/i)
  })

  it('RT-15 — Validator: `grid -1` → E105', () => {
    const ast = parse(`Frame grid -1\n  Frame`)
    const r = new Validator().validate(ast)
    const e105 = r.errors.find(e => e.code === 'E105')
    expect(e105).toBeDefined()
    expect(e105!.message).toMatch(/grid.*-1.*positive integer/i)
  })

  it('RT-15b — Validator: `grid 12` (positive) → no E105', () => {
    const ast = parse(`Frame grid 12\n  Frame`)
    const r = new Validator().validate(ast)
    const e105 = r.errors.find(e => e.code === 'E105' && e.message.includes('grid'))
    expect(e105).toBeUndefined()
  })

  // ===========================================================================
  // V-4 — Token-Resolution (RT-16)
  // ===========================================================================
  it('RT-16 — Token: `cols.grid: 12; Frame grid $cols` resolves across backends', () => {
    const src = `cols.grid: 12\nFrame grid $cols\n  Frame w 6, bg #1a1a1a`
    const dOut = dom(src)
    const rOut = react(src)
    const fOut = fw(src)

    // DOM uses CSS-var (token defined in :root)
    expect(domNode(dOut, 1)).toContain("'grid-template-columns': 'repeat(var(--cols-grid), 1fr)'")
    // React resolves token to value (no :root, inline-styles)
    expect(reactStyle(rOut, 0)).toContain("gridTemplateColumns: 'repeat(12, 1fr)'")
    // Framework emits resolved-form (round-trip-lossy: doesn't reverse-map
    // back to `grid: '$cols'` — documented Quality-Gate gap)
    expect(fwArgs(fOut, 0)).toMatch(/grid:\s*'repeat\(var\(--cols-grid\), 1fr\)'/)
  })

  it('RT-16b — Token type for `cols.grid: 12` is "size" (not "color")', () => {
    // Pre-fix: parser fell back to 'color' for unknown suffixes. .grid
    // is now in COUNT_SUFFIXES → 'size'.
    const ast = parse(`cols.grid: 12\nFrame grid $cols`)
    const tok = ast.tokens?.[0]
    expect(tok?.tokenType).toBe('size')
  })
})
