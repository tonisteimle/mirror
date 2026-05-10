/**
 * Slice 24 — Single-Value-Token probes (Iter-2 Schema-Drift focus).
 *
 * Iter-1 locked the compile-side chain-resolution + suffix helper. Iter-2
 * checks the cross-driver layer: do studio-side helpers (property panel
 * picker, editor token-extract-trigger) agree with compiler/schema/
 * token-suffixes.ts on which property maps to which suffix?
 *
 * Probes:
 *   A. Compiler-canonical: getTokenSuffix(prop) per CLAUDE-documented alias
 *   B. Studio-side TOKEN_SUFFIX_MAP / getTokenSuffixForProperty drift check
 *   C. Editor token-extract-trigger PROPERTY_SUFFIXES drift check
 *   D. End-to-end: token defined with `.mar`, picked up by Frame `mar $name`
 *      AND by studio-side spacing-token regex when propType='margin'
 *
 * Pass criterion: (A) is the truth; (B) and (C) must produce equivalent
 * lookups (modulo leading-dot format). Any discrepancy IS the drift bug.
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { getTokenSuffix, PROPERTY_TO_TOKEN_SUFFIX } from '../../compiler/schema/token-suffixes'
import {
  TOKEN_SUFFIX_MAP,
  getTokenSuffixForProperty,
} from '../../studio/panels/property/utils/tokens'

// ---------------------------------------------------------------------------
// A. Compiler-canonical lookups (truth-source)
// ---------------------------------------------------------------------------

console.log('=== A. Compiler-canonical (truth) ===')
const ALIASES = [
  'bg',
  'background',
  'col',
  'color',
  'c',
  'pad',
  'padding',
  'p',
  'mar',
  'margin',
  'm',
  'gap',
  'g',
  'rad',
  'radius',
  'fs',
  'font-size',
  'w',
  'width',
  'h',
  'height',
  'minw',
  'min-width',
  'maxw',
  'max-width',
  'is',
  'icon-size',
  'ic',
  'icon-color',
  'font',
  'font-family',
]
for (const a of ALIASES) {
  const compilerSuffix = getTokenSuffix(a)
  console.log(`  ${a.padEnd(14)} → compiler: ${compilerSuffix ?? '(undef)'}`)
}

// ---------------------------------------------------------------------------
// B. Studio-side drift check
// ---------------------------------------------------------------------------

console.log('\n=== B. Studio TOKEN_SUFFIX_MAP drift ===')
console.log('  prop          | compiler | studio   | match?')
console.log('  --------------|----------|----------|-------')
for (const a of ALIASES) {
  const compiler = getTokenSuffix(a)
  const studio = getTokenSuffixForProperty(a)
  const compilerNorm = compiler ? compiler.slice(1) : undefined
  const ok = compilerNorm === studio
  console.log(
    `  ${a.padEnd(14)}|  ${(compilerNorm ?? '-').padEnd(7)} |  ${(studio ?? '-').padEnd(
      7
    )} |  ${ok ? '✅' : '❌'}`
  )
}

// Find studio-only entries (in TOKEN_SUFFIX_MAP but not in compiler):
console.log('\n  Studio-only entries (no compiler counterpart):')
for (const [prop, sfx] of Object.entries(TOKEN_SUFFIX_MAP)) {
  if (!getTokenSuffix(prop)) {
    console.log(`    ${prop.padEnd(14)} → ${sfx} (compiler does not recognize)`)
  }
}

// Find compiler-only entries (in compiler but not in studio):
console.log('\n  Compiler-only entries (studio cannot find tokens for these):')
for (const [prop, sfx] of Object.entries(PROPERTY_TO_TOKEN_SUFFIX)) {
  if (!(prop in TOKEN_SUFFIX_MAP)) {
    console.log(`    ${prop.padEnd(14)} → ${sfx} (studio picker blind)`)
  }
}

// ---------------------------------------------------------------------------
// C. End-to-end: a `mar`-suffixed token resolves at compile-time AND can be
//    found by the studio-spacing-regex when looking up `margin`.
// ---------------------------------------------------------------------------

console.log('\n=== C. End-to-end mar token roundtrip ===')
const src = `s.mar: 12
Frame mar $s
  Text "x"`
const ast = parse(src)
const dom = generateDOM(ast, { skipPrelude: true } as any)
const cssVarLine = dom.match(/--s-mar:\s*[^;]+;/)?.[0] ?? '(missing)'
console.log(`  Compile emits: ${cssVarLine}`)

const studioMargin = getTokenSuffixForProperty('margin')
console.log(`  Studio looks up 'margin' suffix: ${studioMargin ?? '(undef)'}`)
console.log(
  `  Studio regex would match s.${studioMargin}: 12 → ${
    studioMargin === 'mar' ? '✅ token visible in picker' : '❌ token invisible (drift)'
  }`
)
