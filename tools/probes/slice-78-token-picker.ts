/**
 * Slice 78 — Token-Picker probes (Iter-2 Schema-Drift focus).
 *
 * Iter-1 covered the picker-parser (parseTokens) for property-sets, chains
 * and cycles via 18 jsdom RTs + 1 Browser-CDP test. Iter-2 audits the
 * picker's PROPERTY_TOKEN_TYPES map against the canonical compiler schema
 * and confirms the new fallback path picks up missing aliases.
 *
 * Pre-Iter-2 state: 25 compiler-known properties (c, p, m, mar, font-family,
 * weight, ls, tracking, min-height, max-height, etc.) had no picker entry
 * → `getTokenTypesForProperty` returned ['other'] for them → no tokens
 * surfaced in the picker UI when those properties were the active context.
 *
 * Probe rounds:
 *   A. Schema-vs-Picker diff (must be empty after fallback)
 *   B. Spot-check the 5 most user-visible aliases
 */

import {
  PROPERTY_TO_TOKEN_SUFFIX,
  inferTokenTypeFromSuffix,
} from '../../compiler/schema/token-suffixes'
import { PROPERTY_TOKEN_TYPES, getTokenTypesForProperty } from '../../studio/pickers/token/types'

console.log('=== A. Properties in compiler schema but missing picker entry ===')
console.log('   (Iter-2 fallback should resolve these from schema, not return [other])')
let blindCount = 0
for (const prop of Object.keys(PROPERTY_TO_TOKEN_SUFFIX)) {
  const norm = prop.toLowerCase().replace(/[-_]/g, '')
  if (norm in PROPERTY_TOKEN_TYPES) continue
  const types = getTokenTypesForProperty(prop)
  const schemaType = inferTokenTypeFromSuffix(PROPERTY_TO_TOKEN_SUFFIX[prop])
  const ok = !(types.length === 1 && types[0] === 'other') || schemaType === 'icon'
  console.log(
    `  ${prop.padEnd(14)} → schema:${schemaType ?? '?'}, picker:${JSON.stringify(types)} ${ok ? '✅' : '❌'}`
  )
  if (!ok) blindCount++
}
console.log(`\n  Blind (picker still returns [other]): ${blindCount}`)

console.log('\n=== B. Spot-check 5 user-visible aliases ===')
const SPOTS: Array<[string, string[]]> = [
  ['c', ['color']],
  ['p', ['size', 'spacing']],
  ['m', ['size', 'spacing']],
  ['mar', ['size', 'spacing']],
  ['font-family', ['font']],
]
for (const [prop, expected] of SPOTS) {
  const got = getTokenTypesForProperty(prop)
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  console.log(
    `  ${prop.padEnd(14)} → ${JSON.stringify(got)} (expected ${JSON.stringify(expected)}) ${ok ? '✅' : '❌'}`
  )
}

console.log('\n=== C. Pre-existing picker entries unchanged ===')
const PRE: Array<[string, string[]]> = [
  ['bg', ['color']],
  ['col', ['color']],
  ['pad', ['spacing']],
  ['w', ['size', 'spacing']],
  ['font', ['font']],
  ['unknown', ['other']],
]
for (const [prop, expected] of PRE) {
  const got = getTokenTypesForProperty(prop)
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  console.log(
    `  ${prop.padEnd(14)} → ${JSON.stringify(got)} (expected ${JSON.stringify(expected)}) ${ok ? '✅' : '❌'}`
  )
}
