/**
 * Slice 7 — Grid mit expliziter Position probes (`x`/`y`/`w`/`h`).
 *
 * Slice 6 lockt das Grid-Container-Verhalten + Token-Resolution + Validator;
 * Slice 7 lockt das Use-Pattern: explizite Cell-Platzierung mit x/y +
 * optionalem Span (w/h). Inkl. Edge-Cases die Slice 6 nicht abdeckt:
 * mixed children, out-of-bounds, sibling overlap, x/y outside grid.
 */

import { parse, generateDOM, generateReact, generateFramework } from '../../compiler'
import { Validator } from '../../compiler/validator'

const cases: Array<[string, string]> = [
  // --- A. Basic explicit placement (Header/Sidebar/Content) ---
  [
    'A1 dashboard layout',
    `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue
  Frame x 1, y 3, w 3, h 4, bg gray
  Frame x 4, y 3, w 9, h 4, bg white`,
  ],

  // --- B. Mixed children: some explicit, some auto-flow ---
  [
    'B1 mixed: explicit header + auto children',
    `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 1, bg red
  Frame
  Frame
  Frame`,
  ],

  // --- C. Sibling overlap (explicitly stacked at same cell) ---
  [
    'C1 sibling overlap',
    `Frame grid 4
  Frame x 1, y 1, w 2, h 2, bg blue
  Frame x 1, y 1, w 2, h 2, bg yellow`,
  ],

  // --- D. Out-of-bounds (x 13 in grid 12) ---
  [
    'D1 x out-of-bounds',
    `Frame grid 12
  Frame x 13, y 1, w 1, h 1, bg red`,
  ],

  // --- E. x without y (and vice versa) ---
  [
    'E1 only x',
    `Frame grid 4
  Frame x 2, w 2, bg blue`,
  ],
  [
    'E2 only y',
    `Frame grid 4
  Frame y 3, w 4, bg green`,
  ],

  // --- F. Spans without start (auto-place + span) ---
  [
    'F1 only spans (no x/y)',
    `Frame grid 12
  Frame w 6, h 2, bg blue
  Frame w 6, h 2, bg red`,
  ],

  // --- G. Position outside grid (parent is not grid) ---
  [
    'G1 x/y absolute (no grid parent)',
    `Frame
  Frame x 100, y 50, w 80, h 80, bg red`,
  ],

  // --- H. Negative position (CSS allows; -1 = "first from end") ---
  [
    'H1 x -1 (last column)',
    `Frame grid 4
  Frame x -1, y 1, w 1, h 1, bg purple`,
  ],

  // --- I. x 0 (CSS-grid: 0 is "auto"; DSL accepts) ---
  [
    'I1 x 0',
    `Frame grid 4
  Frame x 0, y 1, w 2, bg orange`,
  ],

  // --- J. Token-based x/y ---
  [
    'J1 token x/y',
    `header.x: 1
header.y: 1
header.w: 12
header.h: 2

Frame grid 12
  Frame x $header, y $header, w $header, h $header, bg blue`,
  ],

  // --- K. Property-Set token (x+y+w+h bundled) ---
  [
    'K1 property-set token',
    `header: x 1, y 1, w 12, h 2

Frame grid 12
  Frame $header, bg blue`,
  ],

  // --- L. Explicit row-height + explicit position ---
  [
    'L1 grid 3, row-height 100, explicit',
    `Frame grid 3, row-height 100
  Frame x 1, y 1, w 3, h 1, bg red
  Frame x 1, y 2, w 1, h 2, bg blue
  Frame x 2, y 2, w 2, h 1, bg green`,
  ],

  // --- M. Combined with `, hor` (Slice-3-conflict) ---
  [
    'M1 grid + hor + explicit',
    `Frame grid 4, hor
  Frame x 1, y 1, w 2, bg red
  Frame x 3, y 1, w 2, bg blue`,
  ],
]

const v = new Validator()
for (const [label, src] of cases) {
  console.log(`\n=== ${label} ===`)
  const ast = parse(src)

  let dom: string, react: string, fw: string
  try {
    dom = generateDOM(ast, { skipPrelude: true } as any)
  } catch (e: any) {
    dom = `(error: ${e.message})`
  }
  try {
    react = generateReact(ast, { skipPrelude: true } as any)
  } catch (e: any) {
    react = `(error: ${e.message})`
  }
  try {
    fw = generateFramework(ast, { skipPrelude: true } as any)
  } catch (e: any) {
    fw = `(error: ${e.message})`
  }

  const trim = (s: string) => s.replace(/\n\s+/g, ' ').replace(/\s+/g, ' ').slice(0, 240)

  // Capture container + first 3 children DOM styles
  const nodes = dom.matchAll(/Object\.assign\(node_(\d+)\.style, \{([^}]*)\}\)/gs)
  const domNodes = Array.from(nodes).slice(0, 5)
  for (const m of domNodes) {
    console.log(`  DOM node_${m[1]}: ${trim(m[2])}`)
  }

  // Capture React JSX style attrs
  const reactStyles = Array.from(react.matchAll(/style=\{\{([^}]*)\}\}/gs)).slice(0, 5)
  for (let i = 0; i < reactStyles.length; i++) {
    console.log(`  React #${i}: ${trim(reactStyles[i][1])}`)
  }

  // Capture FW M-args
  const fwMatches = Array.from(fw.matchAll(/M\('Frame', \{([^}]*)\}/gs)).slice(0, 5)
  for (let i = 0; i < fwMatches.length; i++) {
    console.log(`  FW #${i}: ${trim(fwMatches[i][1])}`)
  }

  const r = v.validate(ast)
  for (const e of r.errors) console.log(`  E ${e.code}: ${e.message}`)
  for (const w of r.warnings) console.log(`  W ${w.code}: ${w.message}`)
}
