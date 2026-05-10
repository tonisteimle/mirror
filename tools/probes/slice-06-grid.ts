/**
 * Slice 6 — Grid 12-col probes.
 *
 * Probes:
 *   A. `grid N` basic + auto-fill
 *   B. `grid N` + child `w N` (column span)
 *   C. `grid N` + child `x N, y N` (explicit position)
 *   D. `grid N` + `row-height N` / `rh N`
 *   E. `grid N, gap N` (already covered by Slice 2 — re-lock)
 *   F. `grid N, hor` / `grid N, ver` (auto-flow)
 *   G. `grid N, dense`
 *   H. `grid auto N` (auto-fill minmax)
 *   I. Child position outside grid (x/y as transform vs. absolute)
 *   J. Token integration (grid $cols)
 *   K. Validator (negative grid, grid 0, grid "abc")
 */

import { parse, generateDOM, generateReact, generateFramework } from '../../compiler'
import { Validator } from '../../compiler/validator'

const cases: Array<[string, string]> = [
  // --- A. Basic grid ---
  ['A1 grid 3', `Frame grid 3\n  Frame\n  Frame\n  Frame`],
  ['A2 grid 12', `Frame grid 12\n  Frame w 6\n  Frame w 6`],
  ['A3 grid auto', `Frame grid auto\n  Frame\n  Frame`],

  // --- B. Column-span via w ---
  ['B1 grid 12, w 6', `Frame grid 12\n  Frame w 6, bg #1a1a1a\n  Frame w 6, bg #2a2a2a`],
  ['B2 grid 12, w 4 (3 cols)', `Frame grid 12\n  Frame w 4\n  Frame w 4\n  Frame w 4`],
  ['B3 grid 12, w hug (non-numeric)', `Frame grid 12\n  Frame w hug, bg red`],

  // --- C. Explicit x/y position in grid ---
  ['C1 grid 12, child x 1, w 12', `Frame grid 12\n  Frame x 1, y 1, w 12, h 2, bg blue`],
  [
    'C2 grid 12, sidebar',
    `Frame grid 12\n  Frame x 1, y 3, w 3, h 4, bg gray\n  Frame x 4, y 3, w 9, h 4, bg white`,
  ],

  // --- D. row-height ---
  ['D1 grid 3, row-height 100', `Frame grid 3, row-height 100\n  Frame\n  Frame`],
  ['D2 alias rh', `Frame grid 3, rh 80\n  Frame\n  Frame`],

  // --- E. gap (Slice-2-relock) ---
  ['E1 grid 12, gap 8', `Frame grid 12, gap 8\n  Frame w 6\n  Frame w 6`],
  ['E2 grid 12, gap-x 16, gap-y 8', `Frame grid 12, gap-x 16, gap-y 8\n  Frame w 6\n  Frame w 6`],

  // --- F. Auto-flow direction ---
  ['F1 grid 3, hor', `Frame grid 3, hor\n  Frame\n  Frame`],
  ['F2 grid 3, ver', `Frame grid 3, ver\n  Frame\n  Frame`],

  // --- G. Dense ---
  ['G1 grid 3, dense', `Frame grid 3, dense\n  Frame\n  Frame`],

  // --- H. grid auto N ---
  ['H1 grid auto 250', `Frame grid auto 250\n  Frame\n  Frame`],

  // --- I. x/y OUTSIDE grid (default = transform / absolute) ---
  ['I1 x 100, y 50 (no grid)', `Frame x 100, y 50, bg red`],

  // --- J. Token ---
  [
    'J1 cols.grid: 12; Frame grid $cols',
    `cols.grid: 12\nFrame grid $cols\n  Frame w 6\n  Frame w 6`,
  ],

  // --- K. Validator ---
  ['K1 grid 0', `Frame grid 0\n  Frame`],
  ['K2 grid -1', `Frame grid -1\n  Frame`],
  ['K3 grid "abc"', `Frame grid "abc"\n  Frame`],
]

const v = new Validator()
for (const [label, src] of cases) {
  console.log(`=== ${label} ===`)
  const ast = parse(src)
  const dom = generateDOM(ast)
  const react = generateReact(ast)
  const fw = generateFramework(ast)

  const domStyles = dom.match(/Object\.assign\(node_1\.style, \{([^}]*)\}\)/s)?.[1] || '(no node_1)'
  const child2Styles = dom.match(/Object\.assign\(node_2\.style, \{([^}]*)\}\)/s)?.[1] || ''
  const reactJSX = react.match(/<div[^>]*style=\{\{([^}]*)\}\}/s)?.[1] || '(no JSX)'
  const reactChild2 =
    react.match(/<div[^>]*style=\{\{[^}]*\}\}>\s*\n\s*<div[^>]*style=\{\{([^}]*)\}\}/s)?.[1] || ''
  const fwArgs = fw.match(/M\('Frame', \{([^}]*)\}/s)?.[1] || '(no M)'

  const trimDom = (s: string) => s.replace(/\n\s+/g, ' ').slice(0, 200)
  console.log('  DOM #1 :', trimDom(domStyles))
  if (child2Styles) console.log('  DOM #2 :', trimDom(child2Styles))
  console.log('  React #1:', reactJSX.replace(/\n\s+/g, ' ').slice(0, 200))
  if (reactChild2) console.log('  React #2:', reactChild2.replace(/\n\s+/g, ' ').slice(0, 200))
  console.log('  FW    :', fwArgs.replace(/\n\s+/g, ' ').slice(0, 200))

  const r = v.validate(ast)
  if (r.errors.length || r.warnings.length) {
    for (const e of r.errors) console.log(`  E ${e.code}: ${e.message}`)
    for (const w of r.warnings) console.log(`  W ${w.code}: ${w.message}`)
  }
}
