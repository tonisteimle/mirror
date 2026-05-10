/**
 * Slice 27 — Custom-State `toggle()` probes (Iter-2-Sweep, Dev 3, 2026-05-10).
 *
 * Iter-1 hat den Helper `isToggleableStateName` etabliert und drei Drift-
 * Layer (IR-Transformer, DOM-Emitter, Runtime + Runtime-Template) gefixt.
 * Iter-2 verifiziert (a) dass die Helper-Adoption stabil ist, (b) dass
 * keine weiteren hardcoded 14-State-Listen im Runtime-Layer nachgewachsen
 * sind, und (c) der `cycle()`-Alias zur `toggle()`-Semantik bit-identisch
 * bleibt.
 *
 * Plus: cross-slice probe gegen Slice 26 (System-States) — System-States
 * dürfen NICHT als Toggle-Targets gewählt werden, mit Carve-out für
 * `active`/`disabled` wenn Styles definiert sind.
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { validate } from '../../compiler/validator'
import { isToggleableStateName, SYSTEM_STATES } from '../../compiler/schema/parser-helpers'

// =====================================================================
// A. Helper-Logik einzeln (single-source-of-truth)
// =====================================================================

console.log('=== A. isToggleableStateName Helper ===\n')

const helperCases: Array<[string, string, boolean, boolean]> = [
  // [label, name, hasStyles, expected]
  ['custom: on', 'on', false, true],
  ['custom: open', 'open', false, true],
  ['custom: selected (no styles)', 'selected', false, true],
  ['system: hover (no styles)', 'hover', false, false],
  ['system: hover (with styles)', 'hover', true, false],
  ['system: focus', 'focus', true, false],
  ['system: visited', 'visited', true, false],
  ['system: checked', 'checked', true, false],
  ['system: placeholder', 'placeholder', true, false],
  ['system: focus-visible', 'focus-visible', true, false],
  ['system: first-child', 'first-child', true, false],
  // Carve-out: active/disabled are toggleable iff styles present
  ['carve: active (no styles)', 'active', false, false],
  ['carve: active (with styles)', 'active', true, true],
  ['carve: disabled (no styles)', 'disabled', false, false],
  ['carve: disabled (with styles)', 'disabled', true, true],
  // Default never toggleable
  ['internal: default', 'default', true, false],
]

for (const [label, name, hasStyles, expected] of helperCases) {
  const actual = isToggleableStateName(name, hasStyles)
  const ok = actual === expected ? '✅' : '❌'
  console.log(`  ${ok} ${label.padEnd(40)} → ${actual} (expected ${expected})`)
}

// =====================================================================
// B. End-to-End: toggle() picks correct target state per source pattern
// =====================================================================

console.log('\n=== B. toggle() Compile End-to-End ===\n')

const e2eCases: Array<[string, string, RegExp]> = [
  [
    'B1 toggle() + on:  → binary on/default',
    `Button "X", bg #333, toggle()
  on:
    bg #2271C1`,
    /current === 'on'/,
  ],
  [
    'B2 toggle() + visited: only → target NOT visited',
    `Button "X", bg #333, toggle()
  visited:
    bg #2271C1`,
    /current === 'on'/,
  ],
  [
    'B3 toggle() + checked: only → target NOT checked',
    `Button "X", bg #333, toggle()
  checked:
    bg #2271C1`,
    /current === 'on'/,
  ],
  [
    'B4 toggle() + placeholder: only → target NOT placeholder',
    `Input placeholder "X", toggle()
  placeholder:
    bg #2271C1`,
    /current === 'on'/,
  ],
  [
    'B5 toggle() + 3 custom states → multi-state cycle with explicit order',
    `Button "X", bg #333, toggle()
  todo:
    bg #aaa
  doing:
    bg #f0f
  done:
    bg #0f0`,
    /stateMachineToggle\([^,]+, \['todo', 'doing', 'done'\]\)/,
  ],
  [
    'B6 toggle() + 3 custom + focus-visible → focus-visible excluded from cycle',
    `Button "X", bg #333, toggle()
  todo:
    bg #aaa
  doing:
    bg #f0f
  done:
    bg #0f0
  focus-visible:
    bg #fff`,
    /stateMachineToggle\([^,]+, \['todo', 'doing', 'done'\]\)/,
  ],
  [
    'B7 cycle() ≡ toggle() alias',
    `Button "X", bg #333, cycle()
  on:
    bg #2271C1`,
    /current === 'on'/,
  ],
  [
    'B8 active: with styles → active is toggleable (carve-out)',
    `Button "X", bg #333, toggle()
  active:
    bg #2271C1`,
    /current === 'active'/,
  ],
]

for (const [label, src, expectRegex] of e2eCases) {
  const ast = parse(src)
  const out = generateDOM(ast)
  const match = expectRegex.test(out)
  const v = validate(src)
  console.log(`${match ? '✅' : '❌'} ${label}`)
  if (!match) {
    console.log(`     expected pattern: ${expectRegex}`)
    const evt = out.match(/_stateMachine[\s\S]{0,400}/)?.[0]
    if (evt) console.log(`     got:\n${evt.slice(0, 400)}`)
  }
  if (v.errors.length) console.log(`     errors: ${v.errors.map(e => e.code).join(',')}`)
}

// =====================================================================
// C. Schema-Drift-Grep: hardcoded 14-State-Lists in Runtime-Layer
// =====================================================================

console.log('\n=== C. Runtime-Layer Drift Inventory ===\n')

// All schema-derived system-states
const expected = new Set(['default', ...Array.from(SYSTEM_STATES)])
console.log(
  `Expected list (default + ${SYSTEM_STATES.size} system states): ${expected.size} entries`
)

// We can't grep at runtime, but we can probe the Runtime-Template emit
// to confirm the stamped lists match the schema. The full DOM generator
// emits the runtime when called once. Capture and inspect.
const sampleAst = parse('Button "X", bg #333, toggle()\n  on:\n    bg #2271C1')
const sampleOut = generateDOM(sampleAst)

// Find every "const cssStates = [...]" array literal in the emitted code.
const cssStateLiterals = sampleOut.match(/cssStates = \[\s*([^\]]+)\s*\]/g) ?? []
console.log(`\nFound ${cssStateLiterals.length} 'cssStates = [...]' literal(s) in emitted runtime`)

for (let i = 0; i < cssStateLiterals.length; i++) {
  const literal = cssStateLiterals[i]
  const items = (literal.match(/'[^']+'/g) ?? []).map(s => s.slice(1, -1))
  const itemsSet = new Set(items)
  const ok = items.length === expected.size && Array.from(expected).every(s => itemsSet.has(s))
  const missing = Array.from(expected).filter(s => !itemsSet.has(s))
  const extra = items.filter(s => !expected.has(s))
  console.log(
    `  ${ok ? '✅' : '❌'} literal #${i + 1} length=${items.length}` +
      (missing.length ? ` MISSING:${missing.join(',')}` : '') +
      (extra.length ? ` EXTRA:${extra.join(',')}` : '')
  )
}

// =====================================================================
// D. Validator clean for happy paths
// =====================================================================

console.log('\n=== D. Validator-Clean ===\n')

const validatorCases: Array<[string, string]> = [
  ['D1 toggle() + on:', 'Button "X", bg #333, toggle()\n  on:\n    bg #2271C1'],
  ['D2 cycle() + on:', 'Button "X", bg #333, cycle()\n  on:\n    bg #2271C1'],
  [
    'D3 toggle() + 3 states + initial',
    'Button "X", bg #333, toggle(), todo\n  todo:\n    bg #aaa\n  doing:\n    bg #f0f\n  done:\n    bg #0f0',
  ],
  [
    'D4 toggle() + custom + system mixed',
    'Button "X", bg #333, toggle()\n  on:\n    bg #2271C1\n  hover:\n    bg #555',
  ],
]

for (const [label, src] of validatorCases) {
  const v = validate(src)
  console.log(
    `  ${v.errors.length === 0 ? '✅' : '❌'} ${label} errors=${v.errors.length} warnings=${v.warnings.length}`
  )
  if (v.errors.length)
    console.log(`     ${v.errors.map(e => `${e.code}:${e.message}`).join('\n     ')}`)
}
