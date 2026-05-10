/**
 * Slice 1 — Frame-Container probes (Iter-2-Sweep, Dev 1, 2026-05-10).
 *
 * Spiegelt die ehemals `/tmp/frame-probes.ts`-Probes aus Iter-1 plus die
 * Iter-2-Drift-Probes:
 *
 *   A. Bare `Frame` → div + Default-Flex (DOM/React/FW)
 *   B. `Box` Alias → identisch zu Frame außer `data-component`
 *   C. `Frame "hello"` → Validator W112 + kein content im DOM/React/FW
 *   D. lowercase `frame` → W004 + Parser canonicalisiert
 *   E. `Frame name MyFrame` → mirrorName GENAU EINMAL (V-5)
 *   F. `Frame\n  selected` → initialState gesetzt
 *   G. `Frame\n  unknown` → kein initialState (V-4-Gate)
 *   H. `unknown` Top-Level → E002
 *   I. **Iter-2 D-1:** rename-engine reserved-list deckt alle Primitives
 *      (smoke-test: H1/Section sind reserviert)
 */

import { parse } from '../../compiler/parser'
import { Validator } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { isPrimitive } from '../../compiler/schema/dsl'

const cases: Array<[string, string]> = [
  ['A1 bare Frame', `Frame`],
  ['A2 Frame mit gap+pad+bg', `Frame gap 12, pad 16, bg #1a1a1a`],
  ['B1 Box (Alias)', `Box`],
  ['C1 Frame "hello" (W112-Trigger)', `Frame "hello"`],
  ['D1 lowercase frame (W004-Trigger)', `frame`],
  ['E1 Frame name MyFrame', `Frame name MyFrame`],
  ['F1 initial state selected', `Frame\n  selected`],
  ['G1 unknown child (kein initialState)', `Frame\n  unknown`],
  ['H1 unknown Top-Level (E002)', `unknown`],
]

const v = new Validator()
for (const [label, src] of cases) {
  console.log(`=== ${label} ===`)
  const ast = parse(src)
  const dom = generateDOM(ast, { skipPrelude: true } as any)
  const react = generateReact(ast, { skipPrelude: true } as any)
  const fw = generateFramework(ast, { skipPrelude: true } as any)

  const domNode1 = dom.match(/Object\.assign\(node_1\.style, \{([^}]*)\}\)/s)?.[1] || '(no node_1)'
  const reactJSX = react.match(/<div[^>]*>/s)?.[0] || '(no JSX)'
  const fwArg = fw.match(/M\(([^)]+)\)/)?.[1] || '(no M)'

  console.log('  DOM #1:', domNode1.replace(/\n\s+/g, ' ').slice(0, 200))
  console.log('  React :', reactJSX.replace(/\n\s+/g, ' ').slice(0, 200))
  console.log('  FW    :', fwArg.replace(/\n\s+/g, ' ').slice(0, 120))

  const r = v.validate(ast)
  for (const e of r.errors) console.log(`  E ${e.code}: ${e.message}`)
  for (const w of r.warnings) console.log(`  W ${w.code}: ${w.message}`)
}

// --- Iter-2 D-1 — rename-engine reserved-coverage smoke-test ---
console.log('\n=== I1 isPrimitive() coverage (Iter-2 D-1) ===')
const samples = [
  'Frame',
  'Box',
  'Section',
  'H1',
  'H6',
  'Article',
  'Header',
  'Footer',
  'Nav',
  'Main',
  'Aside',
  'Slot',
  'Divider',
  'Spacer',
  'Img',
  'Textarea',
  'Label',
  'MyComponent',
  'Btn',
]
for (const s of samples) {
  console.log(`  isPrimitive(${s.padEnd(15)}): ${isPrimitive(s)}`)
}
