/**
 * Slice 21 — Komponenten-Definition & -Verwendung probes (Iter-2 lock).
 *
 * Iter-1 audited 15 cases, fixed V-2 (Pascal-Case-Hint), V-6 (E603 Doppel-
 * Definition), V-7 (W504 Empty-Definition), and deferred V-1/V-3/V-4 to
 * dedicated successor slices (build-time-strict + nested-def-reject + studio-
 * pipeline-validator-hook).
 *
 * Iter-2 locks the Iter-1 deliverables and probes Cross-Slice surface against
 * Slice 22 (as-Inheritance), Slice 23 (Kind-Slots), and Slice 25 (property-
 * set inside component-def).
 *
 * Probes:
 *   A. V-2/V-6/V-7 lock — Phase A diagnostic emit
 *   B. Cross-Slice — Slice 22 `as Button` chain through component-resolver
 *   C. Cross-Slice — Slice 25 property-set inside Component-Def
 *   D. Self-recursion termination (V-3 deferred — DOM-marker stability)
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { Validator } from '../../compiler/validator/validator'

function styleAssign(js: string, nodeId = 1): string {
  const re = new RegExp(`Object\\.assign\\(node_${nodeId}\\.style, \\{([\\s\\S]*?)\\}\\)`)
  return js.match(re)?.[1] ?? '(none)'
}

const cases: Array<[string, string]> = [
  // --- A. V-2/V-6/V-7 Phase A diagnostics ---
  [
    'A1 V-2 — lowercase use → E002 with Pascal-Case suggestion',
    `Btn: bg #2271C1, col white\nbtn "Save"`,
  ],
  ['A2 V-6 — duplicate definition → E603', `Btn: bg #f00\nBtn: bg #0f0\nBtn "X"`],
  ['A3 V-7 — empty component definition → W504', `Btn:\nBtn "X"`],

  // --- B. Cross-Slice with Slice 22 (as-Inheritance) ---
  [
    'B1 PrimaryBtn as Button → uses <button> tag',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 10 20\nPrimaryBtn "Click"`,
  ],

  // --- C. Cross-Slice with Slice 25 (property-set inside Component-Def) ---
  [
    'C1 Btn: $btnbase, bg #2271C1 → set expanded into component-def',
    `btnbase: pad 10 20, rad 6\nBtn: $btnbase, bg #2271C1, col white\nBtn "Save"`,
  ],

  // --- D. V-3 deferred state — DOM marker for self-recursion ---
  ['D1 self-recursion stops with data-component marker (deferred)', `Tree: bg #f00\n  Tree\nTree`],
]

const v = new Validator()
for (const [label, src] of cases) {
  console.log(`\n=== ${label} ===`)
  const ast = parse(src)
  const result = v.validate(ast)
  for (const e of result.errors) {
    const sg = (e as any).suggestion
    console.log(`  E ${e.code}: ${e.message}${sg ? ` — ${sg}` : ''}`)
  }
  for (const w of result.warnings) {
    const sg = (w as any).suggestion
    console.log(`  W ${w.code}: ${w.message}${sg ? ` — ${sg}` : ''}`)
  }
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('  validator: clean')
  }
  try {
    const dom = generateDOM(ast)
    const top = styleAssign(dom, 1).replace(/\s+/g, ' ').slice(0, 180)
    console.log(`  DOM node_1: ${top}`)
  } catch (e: any) {
    console.log(`  DOM (error): ${e.message}`)
  }
}
