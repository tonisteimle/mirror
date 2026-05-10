/**
 * Slice 25 — Property-Set-Token probes (Iter-2 cross-backend + drift focus).
 *
 * Iter-1 fixed Phase A (parser/validator), Phase B (recursive IR-expansion +
 * content-fallback gate), V-6 (React-Backend parity), V-7 (state-body sets),
 * V-8 (collision diagnostic). 15 RTs locked the surface for DOM and React.
 *
 * Iter-2 audits two surfaces Iter-1 didn't formally probe:
 *   A. Framework-Backend property-set support — does it expand sets like
 *      DOM and React, or did it inherit the same B-11 bug React had?
 *   B. Cross-Slice with Slice 24: name-collision (`card.bg` + `card:`) —
 *      Slice 25 V-8 documents the collision; the post-Slice-24 helper
 *      consolidation must not re-introduce silent shadowing.
 *   C. Validator boundary: `propset` is in KNOWN_NON_SCHEMA_PROPERTIES; if
 *      a future contributor renames it, the duplicate-check skip must still
 *      catch it.
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { validateAST } from '../../compiler/validator'

function trim(s: string, max = 200): string {
  return s.replace(/\n\s+/g, ' ').replace(/\s+/g, ' ').slice(0, max)
}

const cases: Array<[string, string]> = [
  // --- A. Framework-Backend ---
  [
    'A1 framework: basic spread',
    `cardstyle: bg #1a1a1a, pad 16, rad 8\nFrame $cardstyle\n  Text "x"`,
  ],
  ['A2 framework: multi-spread', `a: pad 16\nb: rad 8\nFrame $a, $b\n  Text "x"`],
  ['A3 framework: 3-level chain', `c: pad 8\nb: $c, gap 4\na: $b, bg #f00\nFrame $a\n  Text "x"`],

  // --- B. Cross-Slice with Slice 24 ---
  [
    'B1 collision: card.bg + card: (Slice 24 / Slice 25 boundary)',
    `card.bg: #111\ncard: pad 16, rad 8\nFrame $card`,
  ],

  // --- C. Multi-spread duplicate-check skip ---
  ['C1 multi-spread does NOT trigger W110', `a: pad 16\nb: rad 8\nFrame $a, $b`],
]

for (const [label, src] of cases) {
  console.log(`\n=== ${label} ===`)
  const ast = parse(src)
  const v = validateAST(ast)

  let dom: string, react: string, fw: string
  try {
    dom = generateDOM(ast)
  } catch (e: any) {
    dom = `(error: ${e.message})`
  }
  try {
    react = generateReact(ast)
  } catch (e: any) {
    react = `(error: ${e.message})`
  }
  try {
    fw = generateFramework(ast)
  } catch (e: any) {
    fw = `(error: ${e.message})`
  }

  // DOM: first style assignment
  const domStyle = dom.match(/Object\.assign\(node_1\.style, \{([^}]*)\}\)/s)?.[1] ?? '(none)'
  console.log(`  DOM   : ${trim(domStyle)}`)

  // React: first JSX style
  const reactStyle = react.match(/style=\{\{([^}]*)\}\}/s)?.[1] ?? '(none)'
  console.log(`  React : ${trim(reactStyle)}`)

  // Framework: M-call args
  const fwMatch = fw.match(/M\('Frame', \{([^}]*)\}/s)?.[1] ?? '(none)'
  console.log(`  FW    : ${trim(fwMatch)}`)

  if (v.errors.length || v.warnings.length) {
    for (const e of v.errors) console.log(`  E ${e.code}: ${e.message}`)
    for (const w of v.warnings) console.log(`  W ${w.code}: ${w.message}`)
  } else {
    console.log('  validator: clean')
  }
}
