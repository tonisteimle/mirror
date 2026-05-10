/**
 * Schema Map Coherence
 *
 * Three maps describe properties in `compiler/schema/`:
 *
 *   1. `SCHEMA`                 in `property-schema.ts` — the property
 *                                  definitions (canonical name + aliases +
 *                                  category + numeric/keyword handlers).
 *   2. `PROPERTY_TO_CSS`        in `ir-helpers.ts` — DSL property name
 *                                  (canonical or alias) → CSS property name.
 *                                  Used by the IR transformer when the
 *                                  schema's own numeric/keyword handler
 *                                  doesn't kick in (token-resolved values).
 *   3. `PROPERTY_TO_TOKEN_SUFFIX` in `token-suffixes.ts` — DSL property
 *                                  name → token suffix (`bg → .bg`,
 *                                  `pad → .pad`). Drives token-picker
 *                                  filtering, suffix-aware chain
 *                                  resolution, and px-unit emission.
 *
 * Adding a new property historically required edits to all three places.
 * Forgetting any one of them is a class of subtle bugs:
 *
 *   - omit from SCHEMA     → validator ignores it (W500 false-clean)
 *   - omit from PROPERTY_TO_CSS → token-resolved values fall through
 *                                  unrendered
 *   - omit from PROPERTY_TO_TOKEN_SUFFIX → picker doesn't show
 *                                          tokens for that property
 *
 * This file pins the "every key in maps 2 and 3 is also known to map 1"
 * invariant + the alias-equality invariant (every alias of a property
 * must map to the same value as the canonical name in maps 2 and 3).
 *
 * Tracked in docs/findings.md (property-schema mega-file drift trap).
 */

import { describe, it, expect } from 'vitest'
import { SCHEMA } from '../../../compiler/schema/property-schema'
import { PROPERTY_TO_CSS } from '../../../compiler/schema/ir-helpers'
import { PROPERTY_TO_TOKEN_SUFFIX } from '../../../compiler/schema/token-suffixes'

/** Build the set of every name the schema knows about: each property's
 *  canonical name plus every declared alias. */
function schemaKnownNames(): Set<string> {
  const names = new Set<string>()
  for (const def of Object.values(SCHEMA)) {
    names.add(def.name)
    for (const alias of def.aliases) names.add(alias)
  }
  return names
}

/** Group every PROPERTY_TO_CSS / PROPERTY_TO_TOKEN_SUFFIX key by its
 *  schema-canonical property. Entries that don't match anything in the
 *  schema get bucketed under the literal key — surfaces as a failure
 *  in the "every key is known" assertion below. */
function groupByCanonical(map: Record<string, string>): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>()
  for (const key of Object.keys(map)) {
    const canonical = canonicalNameFor(key) ?? key
    if (!groups.has(canonical)) groups.set(canonical, new Set())
    groups.get(canonical)!.add(map[key])
  }
  return groups
}

/** Map any name (canonical or alias) back to the schema's canonical name. */
function canonicalNameFor(name: string): string | undefined {
  for (const def of Object.values(SCHEMA)) {
    if (def.name === name) return def.name
    if (def.aliases.includes(name)) return def.name
  }
  return undefined
}

describe('schema map coherence — single source of truth', () => {
  // -----------------------------------------------------------------
  // Every key in PROPERTY_TO_CSS / PROPERTY_TO_TOKEN_SUFFIX is known
  // to SCHEMA — either as a canonical name or as a declared alias.
  // Catches: someone added an alias to PROPERTY_TO_CSS without adding
  // it to the property's `aliases` array in SCHEMA.
  // -----------------------------------------------------------------

  it('every PROPERTY_TO_CSS key exists in SCHEMA (as name or alias)', () => {
    const known = schemaKnownNames()
    const orphans = Object.keys(PROPERTY_TO_CSS).filter(k => !known.has(k))
    expect(orphans, 'PROPERTY_TO_CSS keys missing from SCHEMA').toEqual([])
  })

  it('every PROPERTY_TO_TOKEN_SUFFIX key exists in SCHEMA (as name or alias)', () => {
    const known = schemaKnownNames()
    const orphans = Object.keys(PROPERTY_TO_TOKEN_SUFFIX).filter(k => !known.has(k))
    expect(orphans, 'PROPERTY_TO_TOKEN_SUFFIX keys missing from SCHEMA').toEqual([])
  })

  // -----------------------------------------------------------------
  // For any property that has multiple aliases mapped, every alias
  // must produce the same value. Catches: someone added `bg → background`
  // and `background → bg-css-name` to PROPERTY_TO_CSS — silently OK
  // until two different consumers see different CSS names.
  // -----------------------------------------------------------------

  it('PROPERTY_TO_CSS — aliases of one property all map to the same CSS name', () => {
    const violations: string[] = []
    for (const [canonical, values] of groupByCanonical(PROPERTY_TO_CSS)) {
      if (values.size > 1) {
        violations.push(
          `${canonical}: aliases produce different CSS names ${[...values].join(', ')}`
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('PROPERTY_TO_TOKEN_SUFFIX — aliases of one property all map to the same suffix', () => {
    const violations: string[] = []
    for (const [canonical, values] of groupByCanonical(PROPERTY_TO_TOKEN_SUFFIX)) {
      if (values.size > 1) {
        violations.push(
          `${canonical}: aliases produce different suffixes ${[...values].join(', ')}`
        )
      }
    }
    expect(violations).toEqual([])
  })
})
