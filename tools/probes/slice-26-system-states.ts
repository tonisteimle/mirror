/**
 * Slice 26 — System-States probes (Iter-2-Sweep, Dev 3, 2026-05-10).
 *
 * Iter-1 deckte: 13 Schema-system-states ↔ 4-State-Hardcode im DOM-Backend.
 * Reform: `SYSTEM_STATES` schema-derived; Cross-Slice ins
 * `studio/sync/component-line-parser.ts` und `studio/editor/syntax-highlight.ts`
 * propagiert.
 *
 * Iter-2-Probes ergänzen die ursprünglichen 16 Cases um eine zweite
 * Drift-Suche: das State-Shorthand `hover-bg`/`focus-bg`/… in
 * `compiler/schema/ir-helpers.ts:490 STATE_PROPERTY_PREFIXES` ist eine
 * separate 4-State-Liste, die Iter-1 nicht prüfte. Dieser Probe-Lauf
 * dokumentiert ob die Liste ein bewusster Scope ist (nur `hover-*` als
 * Property im Schema, andere Prefixes als Helper-Convenience) oder ein
 * neuer Drift-Befund mit Cross-Slice-Wirkung.
 *
 * Plus: System-State-CSS-Emit re-locken (alle 13) als Cross-Backend-
 * Probe — DOM emittiert CSS, React/Framework lassen es als data-attr
 * stehen (deklarativer Pass-through). Iter-1-Audit-Doc behauptet das,
 * Iter-2-Probe verifiziert.
 */

import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { DSL } from '../../compiler/schema/dsl'

// =====================================================================
// A. State-Shorthand `hover-bg`/`focus-bg`/… (Iter-2 neu)
// =====================================================================

const shorthandCases: Array<[string, string]> = [
  // hover-* — schema hat Properties (`hover-bg` etc.)
  ['A1 hover-bg (schema property)', 'Frame hover-bg #fff'],
  ['A2 hover-col (schema property)', 'Frame hover-col #000'],
  // focus-*/active-*/disabled-* — Helper akzeptiert Prefix, Schema kennt Property nicht
  ['A3 focus-bg (helper-only, schema unknown)', 'Frame focus-bg #fff'],
  ['A4 active-bg (helper-only)', 'Frame active-bg #fff'],
  ['A5 disabled-bg (helper-only)', 'Frame disabled-bg #fff'],
  // Erweiterte states — weder im Helper noch im Schema
  ['A6 focus-visible-bg (neither helper nor schema)', 'Frame focus-visible-bg #fff'],
  ['A7 visited-bg (neither)', 'Frame visited-bg #fff'],
  ['A8 checked-bg (neither)', 'Frame checked-bg #fff'],
]

console.log('=== A. State-Shorthand Drift Probe ===\n')
for (const [label, src] of shorthandCases) {
  const ast = parse(src)
  const v = validate(src)
  const dom = generateDOM(ast)
  // Pull out the inline CSS-style block (`_style.textContent`)
  const css = dom.match(/_style\.textContent = `([\s\S]*?)`/)?.[1] ?? ''
  // Capture state-selectors (pseudo-class or [data-X="true"] forms)
  const stateMatches = css.match(/[\[:][a-z-]+="?[^{]*\{[^}]+\}/g) ?? []

  console.log(label)
  console.log('  errors:', v.errors.map(e => e.code).join(',') || '(none)')
  console.log('  warnings:', v.warnings.map(w => w.code).join(',') || '(none)')
  console.log('  state-selectors:', stateMatches.slice(0, 2).join(' | ').slice(0, 200) || '(none)')
}

// =====================================================================
// B. Schema-system-states-CSS-Emit Cross-Backend (Iter-1 lock re-run)
// =====================================================================

console.log('\n=== B. Schema-system-states CSS-Emit (Cross-Backend Probe) ===\n')

// Pull system-states from schema directly so this probe self-updates
// when the schema list changes — no hardcode.
const systemStates = Object.entries(DSL.states)
  .filter(([, def]) => (def as { system?: boolean }).system === true)
  .map(([name]) => name)

console.log(`Schema-system-states: ${systemStates.join(', ')}\n`)

for (const state of systemStates) {
  const src = `Frame bg #333\n  ${state}:\n    bg #444`
  const ast = parse(src)
  const dom = generateDOM(ast)
  const react = generateReact(ast)
  const fw = generateFramework(ast)
  const domCss = dom.match(/_style\.textContent = `([\s\S]*?)`/)?.[1] ?? ''

  // DOM: any selector mentioning the state (pseudo-class, attribute, pseudo-element)
  const domHit =
    new RegExp(`:${state}\\b|\\[${state}\\b|\\[data-${state}|::${state}\\b`).test(domCss) ||
    (state === 'disabled' && /\[disabled\]/.test(domCss))

  // React: states are passed as data — look for state-style payload
  const reactHit = react.includes(`'${state}'`) || react.includes(`"${state}"`)

  // Framework: same idea — states-object with state name as key
  const fwHit = fw.includes(`'${state}'`) || fw.includes(`"${state}"`)

  console.log(
    `${state.padEnd(20)} DOM ${domHit ? '✅' : '❌'}  React ${reactHit ? '✅' : '❌'}  FW ${fwHit ? '✅' : '❌'}`
  )
}

// =====================================================================
// C. Schema-Drift-Grep — confirm STATE_PROPERTY_PREFIXES discrepancy
// =====================================================================

console.log('\n=== C. Schema-Drift Befund ===\n')
console.log('STATE_PROPERTY_PREFIXES (compiler/schema/ir-helpers.ts:490):')
console.log("  ['hover', 'focus', 'active', 'disabled']")
console.log('Schema-system-states (compiler/schema/dsl.ts):')
console.log(`  [${systemStates.map(s => `'${s}'`).join(', ')}]`)
console.log()
console.log('Befund: STATE_PROPERTY_PREFIXES ist eine 4-State-Whitelist; Schema kennt 13.')
console.log('Frage: ist der Helper-Scope intentional (nur 4 interaktive States dürfen Shorthand)')
console.log('       oder ist es ein Drift-Bug (Iter-1 vergessen)?')
console.log('Zusatzlücke: Schema definiert NUR `hover-*` als Property — `focus-bg`/etc. werden')
console.log('       vom Helper akzeptiert aber sind im Schema unbekannt → Validator W004.')
