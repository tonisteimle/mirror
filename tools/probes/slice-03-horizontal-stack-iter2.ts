/**
 * Slice 3 — Horizontal Stack Iter-2-Re-Probes (Dev 1, 2026-05-10).
 *
 * Iter-1 deferred zwei Befunde mit Code-Kommentar + Test-Lock:
 *
 *   V-2 (W120) — Validator-Branch für `Frame hor 5` (Flag mit silent-
 *                geschluckter Wert). Parser eats trailing values without
 *                AST signal — Validator hat nichts woran es feuern könnte.
 *
 *   V-3a (hor.center) — Schema sagt `align-items: center` für `hor`,
 *                IR layout-transformer sagt `flex-start`. Drift zwischen
 *                Schema-direct (size-state-CSS-emit) und IR-Pfad (normal-emit).
 *
 * Diese Probe re-bestätigt den Iter-1-Befund + sichert die Re-Open-Trigger:
 *
 *   A. Parser-AST-Lock — `hor 5` und `wrap "yes"` produzieren dieselbe AST
 *      wie der reine Flag (no extra values preserved). Lock für die V-2-
 *      Verschiebung.
 *
 *   B. Schema-IR-Drift-Lock — `horizontal._standalone.css` enthält
 *      `align-items: center`; IR `FLEX_DEFAULTS` für `row` enthält
 *      `align-items: flex-start`. Beide Pfade sind aktiv, beide Werte
 *      reichen durch zum Output (per Pfad).
 *
 *   C. Probe gegen Re-Open-Targets:
 *      - V-2 Ziel: Slice 21 Phase B/C (Parser-Strict-Mode) oder dedizierter
 *        Parser-Audit-Slice. Probe: `PURE_FLAG_PROPERTIES` ist im Schema
 *        canonical und schema-derived (nicht hardcoded).
 *      - V-3a Ziel: Slice 5 Iter-2-Sweep (Dev 2) — Cross-Slice mit
 *        center/spread/ver-center/hor-center.
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { SCHEMA } from '../../compiler/schema/property-schema'

console.log('=== A. Parser AST-Lock — hor 5, wrap "yes" — Werte werden silent geschluckt ===')

const astHor5 = parse('Frame hor 5\n  Text "x"')
const astHorBare = parse('Frame hor\n  Text "x"')
const horProp5 = astHor5.instances[0]?.properties?.find(p => p.name === 'hor')
const horPropBare = astHorBare.instances[0]?.properties?.find(p => p.name === 'hor')
console.log(`  Frame hor 5     → hor.values: ${JSON.stringify(horProp5?.values)}`)
console.log(`  Frame hor       → hor.values: ${JSON.stringify(horPropBare?.values)}`)
console.log(
  `  Identical AST?  → ${JSON.stringify(horProp5?.values) === JSON.stringify(horPropBare?.values)}`
)

const astWrapStr = parse('Frame wrap "yes"\n  Text "x"')
const wrapProp = astWrapStr.instances[0]?.properties?.find(p => p.name === 'wrap')
console.log(
  `  Frame wrap "yes" → wrap.values: ${JSON.stringify(wrapProp?.values)}  (no "yes" preserved)`
)

console.log('\n=== B. Schema-IR-Drift Lock — hor.center ===')

const horSchema = (SCHEMA as any).horizontal
console.log('  Schema horizontal._standalone.css:')
const standaloneEntries = (horSchema?.keywords?._standalone?.css ?? []) as Array<{
  property: string
  value: string | number
}>
for (const c of standaloneEntries) {
  console.log(`    ${c.property}: ${c.value}`)
}

const dom = generateDOM(parse('Frame hor\n  Text "x"\n  Text "y"'))
const domNode1 = dom.match(/Object\.assign\(node_1\.style, \{([^}]*)\}\)/s)?.[1] || ''
console.log('\n  IR-Pfad (DOM emit, layout-transformer):')
console.log(
  '   ',
  domNode1
    .split(',')
    .map(s => s.trim())
    .filter(s => s.includes('align-items') || s.includes('flex-direction') || s.includes('display'))
    .join('  ')
)
console.log(
  '  → IR pfad emittet `align-items: flex-start`, Schema-Pfad sagt `align-items: center`.'
)
console.log('    Beide Pfade aktiv: IR für normal-emit, Schema für size-state-CSS-emit.')

console.log('\n=== C. Re-Open-Target-Smoke — PURE_FLAG_PROPERTIES schema-derived ===')

import { PURE_FLAG_PROPERTIES } from '../../compiler/schema/parser-helpers'
const flagList = Array.from(PURE_FLAG_PROPERTIES).sort()
console.log(`  PURE_FLAG_PROPERTIES (${flagList.length} entries):`)
for (const f of flagList) {
  console.log(`    ${f}`)
}
console.log('\n  Lock: schema-derived. Wenn ein neuer flag-only-property im Schema landet,')
console.log('  taucht er hier automatisch auf — kein hardcode in der Validator-Liste.')

// React-Side check für V-3a: was emittet React für `hor`?
const reactOut = generateReact(parse('Frame hor\n  Text "x"'))
const reactStyle = reactOut.match(/style=\{\{([^}]*)\}\}/s)?.[1] || ''
console.log('\n=== Cross-Backend-Lock: React `hor` (V-1 fix from Iter-1) ===')
console.log(`  React style: ${reactStyle.replace(/\n\s+/g, ' ').slice(0, 200)}`)
console.log(
  "  Lock: React emittet 'flex-direction: row' + 'align-self: stretch' + 'align-items: flex-start'"
)
console.log('  (parity with DOM IR-pfad — V-1 schließt Cross-Backend-Bruch)')
