/**
 * Schema backend-support pins (Hebel 3 from audit 2026-05-13).
 *
 * The schema field `backends?: BackendTarget[]` declares which
 * compile targets actually emit a property. Absent = all in-tree
 * backends. The follow-up lane will wire a runtime warning at
 * export-time when a `backends: ['dom']` property is used in a
 * non-DOM export; this test pins the declarations so the follow-up
 * lane has a stable contract to work against.
 *
 * Today's annotations (DOM-only — runtime helpers that React /
 * Framework backends silently drop):
 *   - `mask` (input mask runtime — drag-handler + format helpers)
 *   - `keyboard-nav` (form-container keyboard runtime)
 *   - `loop-focus` (highlight-loop runtime)
 *   - `typeahead` (typeahead-jump runtime)
 *   - `trigger-text` (selection-trigger sync runtime)
 *
 * Adding a property to backends-typed declarations needs a matching
 * pin here. Removing one needs the follow-up validator-warning lane
 * adjusted in lockstep.
 */

import { describe, it, expect } from 'vitest'
import { SCHEMA } from '../../compiler/schema/property-schema'

const DOM_ONLY_PROPERTIES = ['mask', 'keyboard-nav', 'loop-focus', 'typeahead', 'trigger-text']

describe('Schema backend-support field', () => {
  it('PropertyDef.backends is optional and types as BackendTarget[]', () => {
    // Smoke check — type errors surface at compile, not here, but
    // assert at least one property has the field shaped correctly.
    const def = SCHEMA.mask
    expect(def).toBeDefined()
    expect(Array.isArray(def.backends)).toBe(true)
    expect(def.backends).toEqual(['dom'])
  })

  it.each(DOM_ONLY_PROPERTIES)('%s is declared backends: ["dom"]', name => {
    const def = SCHEMA[name]
    expect(def).toBeDefined()
    expect(def.backends).toEqual(['dom'])
  })

  it('properties without backends field default to "all in-tree backends"', () => {
    // Spot-check a property that is genuinely cross-backend.
    const bg = SCHEMA.background
    expect(bg).toBeDefined()
    expect(bg.backends).toBeUndefined()

    const pad = SCHEMA.padding
    expect(pad).toBeDefined()
    expect(pad.backends).toBeUndefined()
  })

  it('no property declares a backend outside the allowed BackendTarget union', () => {
    const ALLOWED = new Set(['dom', 'react', 'framework', 'vue', 'svelte', 'vanilla'])
    for (const [name, def] of Object.entries(SCHEMA)) {
      if (def.backends === undefined) continue
      for (const target of def.backends) {
        expect(ALLOWED.has(target), `${name} declares unknown backend "${target}"`).toBe(true)
      }
    }
  })

  it('inventory: count properties with non-default backend support', () => {
    // Sanity check — if this count drifts unexpectedly, audit which
    // property was added/removed.
    const annotated = Object.values(SCHEMA).filter(def => def.backends !== undefined)
    expect(annotated.length).toBe(DOM_ONLY_PROPERTIES.length)
  })
})
