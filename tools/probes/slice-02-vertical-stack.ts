/**
 * Slice 2 — Vertical Stack (`gap N`) probes (Iter-2-Sweep, Dev 1, 2026-05-10).
 *
 * Spiegelt die ehemals `/tmp/gap-probes.ts`-Probes aus Iter-1 plus Iter-2-
 * Cross-Slice-Re-Probes (Lesson 6 — `pxify` aktiv gegen Nachbar-Slices testen).
 *
 *   A. `gap N` Cross-Backend (Phase 1)
 *   B. `gap-x` / `gap-y` Cross-Backend (Phase 2)
 *   C. `gap $sp` Token mit `sp.gap: 12` (Phase 1)
 *   D. Chain-Token (Phase 2 V-6)
 *   E. Shorthand `gap 12 8` (Phase 2 V-7)
 *   F. **Iter-2 Cross-Slice:** `pxify`-Pattern gegen Nachbar-Properties
 *      (pad/mar/w/h/rad/fs/minw/maxw) — sicherstellt dass die in Slice 2 V-1
 *      identifizierte `pxify`-Lücke wirklich für alle 17+ Properties geschlossen
 *      ist (Lesson 6: Cross-Slice-Wirkung muss aktiv geprüft werden).
 */

import { parse } from '../../compiler/parser'
import { Validator } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases: Array<[string, string]> = [
  // A. gap basic
  ['A1 gap 12', `Frame gap 12\n  Text "a"\n  Text "b"`],
  ['A2 gap 0', `Frame gap 0\n  Text "a"`],
  ['A3 gap alias g 8', `Frame g 8\n  Text "a"`],

  // B. gap-x / gap-y (Phase 2)
  ['B1 gap-x 16', `Frame grid 3, gap-x 16\n  Text "a"`],
  ['B2 gap-y 24', `Frame grid 3, gap-y 24\n  Text "a"`],
  ['B3 gap-x 16, gap-y 8 kombiniert', `Frame grid 3, gap-x 16, gap-y 8\n  Text "a"`],

  // C. Token-Resolution
  ['C1 sp.gap: 12 + Frame gap $sp', `sp.gap: 12\nFrame gap $sp\n  Text "a"`],

  // D. Chain-Token (Phase 2 V-6)
  ['D1 base.gap: 12 + big.gap: $base', `base.gap: 12\nbig.gap: $base\nFrame gap $big\n  Text "a"`],

  // E. Shorthand (Phase 2 V-7)
  ['E1 gap 12 8 (row col)', `Frame gap 12 8\n  Text "a"`],

  // F. Iter-2 Cross-Slice: pxify on neighbor properties
  ['F1 pad 12 (Slice 9)', `Frame pad 12\n  Text "a"`],
  ['F2 mar 16 (Slice 10)', `Frame mar 16\n  Text "a"`],
  ['F3 w 200 (Slice 11)', `Frame w 200\n  Text "a"`],
  ['F4 rad 8 (Slice 16)', `Frame rad 8\n  Text "a"`],
  ['F5 fs 24 (Slice 17)', `Frame\n  Text "a", fs 24`],
  ['F6 minw 100 (Slice 11)', `Frame minw 100, w 200\n  Text "a"`],
]

const v = new Validator()
for (const [label, src] of cases) {
  console.log(`=== ${label} ===`)
  const ast = parse(src)
  const dom = generateDOM(ast, { skipPrelude: true } as any)
  const react = generateReact(ast, { skipPrelude: true } as any)
  const fw = generateFramework(ast, { skipPrelude: true } as any)

  const domNode1 = dom.match(/Object\.assign\(node_1\.style, \{([^}]*)\}\)/s)?.[1] || '(no node_1)'
  const reactStyle = react.match(/style=\{\{([^}]*)\}\}/s)?.[1] || '(no style)'
  const fwArg =
    fw.match(/M\('Frame', \{([^}]*)\}/)?.[1] || fw.match(/M\(([^)]+)\)/)?.[1] || '(no M)'

  console.log('  DOM   :', domNode1.replace(/\n\s+/g, ' ').slice(0, 180))
  console.log('  React :', reactStyle.replace(/\n\s+/g, ' ').slice(0, 180))
  console.log('  FW    :', fwArg.replace(/\n\s+/g, ' ').slice(0, 120))

  const r = v.validate(ast)
  for (const e of r.errors) console.log(`  E ${e.code}: ${e.message}`)
  for (const w of r.warnings) console.log(`  W ${w.code}: ${w.message}`)
}
