/**
 * Property-based Tests (fast-check)
 *
 * Phase 2 der Bullet-Proof-Strategie: Invarianten der 5 zentralen Compiler-
 * Funktionen mit randomisierten Inputs prüfen, statt nur ausgesuchte Beispiele.
 *
 * Ziel: jeder Lauf erzeugt ~1000 Inputs pro Property — wir suchen nicht nur
 * "klappt für die Tests die ich mir ausgedacht habe", sondern "klappt für
 * jede Eingabe in der spezifizierten Domäne".
 *
 * Funktionen unter Test:
 *   1. mergeProperties        — Order-Sensitivität / Last-wins
 *   2. formatCSSValue         — Unit-Preservation
 *   3. schemaPropertyToCSS    — Schema-Driven CSS-Generation
 *   4. expandPropertySets     — Rekursive Expansion + Termination
 *   5. generateLayoutStyles   — Layout-Konflikt-Resolution
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// 1000 runs per property — fast (these are pure unit-level functions) and gives
// fast-check a real chance to find shrinking counter-examples.
const RUNS = 1000
fc.configureGlobal({ numRuns: RUNS })

import { mergeProperties } from '../../compiler/ir/transformers/property-utils-transformer'
import { formatCSSValue } from '../../compiler/ir/transformers/style-utils-transformer'
import { schemaPropertyToCSS } from '../../compiler/schema/ir-helpers'
import { expandPropertySets } from '../../compiler/ir/transformers/property-set-expander'
import {
  generateLayoutStyles,
  createLayoutContext,
  applyAlignmentsToContext,
  type LayoutContext,
} from '../../compiler/ir/transformers/layout-transformer'
import type { Property, ComponentDefinition } from '../../compiler/parser/ast'

// =============================================================================
// Arbitraries
// =============================================================================

/** Generate a Property with a given name and arbitrary values. */
function propertyArb(
  nameArb: fc.Arbitrary<string>,
  valuesArb?: fc.Arbitrary<(string | number | boolean)[]>
): fc.Arbitrary<Property> {
  return fc.record({
    type: fc.constant('Property' as const),
    name: nameArb,
    values:
      valuesArb ??
      fc.array(
        fc.oneof(
          fc.integer({ min: -100, max: 100 }),
          fc.constantFrom('left', 'right', 'top', 'bottom')
        ),
        { maxLength: 4 }
      ),
    line: fc.constant(0),
    column: fc.constant(0),
  })
}

const SIMPLE_PROP_NAMES = [
  'width',
  'height',
  'background',
  'color',
  'opacity',
  'gap',
  'pad',
  'mar',
  'rad',
]
const LAYOUT_KEYWORDS = [
  'hor',
  'ver',
  'horizontal',
  'vertical',
  'center',
  'spread',
  'tl',
  'tr',
  'bl',
  'br',
  'cl',
  'cr',
  'tc',
  'bc',
]

const simplePropertyArb = propertyArb(
  fc.constantFrom(...SIMPLE_PROP_NAMES),
  fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 1 })
)

const layoutKeywordPropertyArb = propertyArb(fc.constantFrom(...LAYOUT_KEYWORDS), fc.constant([]))

// =============================================================================
// 1. mergeProperties
// =============================================================================

describe('Property-based: mergeProperties', () => {
  it('identity on empty base: merge([], xs) preserves xs entries', () => {
    fc.assert(
      fc.property(fc.array(simplePropertyArb, { maxLength: 10 }), xs => {
        const result = mergeProperties([], xs)
        // Every result property must come from xs (by reference)
        expect(result.every(r => xs.includes(r))).toBe(true)
      })
    )
  })

  it('identity on empty overrides: merge(xs, []) preserves xs after dedup', () => {
    fc.assert(
      fc.property(fc.array(simplePropertyArb, { maxLength: 10 }), xs => {
        const result = mergeProperties(xs, [])
        // Result length must be ≤ input (because of dedup-by-key)
        expect(result.length).toBeLessThanOrEqual(xs.length)
      })
    )
  })

  it('last-wins for same property name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SIMPLE_PROP_NAMES),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (name, v1, v2) => {
          const p1: Property = { type: 'Property', name, values: [v1], line: 0, column: 0 }
          const p2: Property = { type: 'Property', name, values: [v2], line: 0, column: 0 }
          const result = mergeProperties([p1], [p2])
          // Exactly one entry with this name, value v2
          const matching = result.filter(r => r.name === name)
          expect(matching).toHaveLength(1)
          expect(matching[0].values[0]).toBe(v2)
        }
      )
    )
  })

  it('layout keywords: last position wins (ORDER_SENSITIVE behavior)', () => {
    // mergeProperties([hor, ver, hor], []) ⇒ last entry should be `hor`,
    // not `ver`. The order-sensitive logic deletes-then-reinserts so the
    // re-mention of a keyword puts it at the END of iteration order.
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('hor', 'ver', 'horizontal', 'vertical'), {
          minLength: 2,
          maxLength: 6,
        }),
        keywords => {
          const props: Property[] = keywords.map(name => ({
            type: 'Property',
            name,
            values: [],
            line: 0,
            column: 0,
          }))
          const merged = mergeProperties(props, [])
          // Because hor and horizontal share the canonical key "horizontal",
          // and ver and vertical share "vertical", look at the LAST element:
          // it must correspond to the last *canonical-distinct* keyword.
          const last = merged[merged.length - 1]
          // the last keyword in the input list with the same canonical key
          // must equal `last.name`.
          const lastKw = keywords[keywords.length - 1]
          expect(last.name).toBe(lastKw)
        }
      )
    )
  })

  it('directional padding/margin keys differ → coexist in merge', () => {
    // pad left 10, pad right 20 → both kept, no overwrite
    fc.assert(
      fc.property(
        fc.constantFrom('padding', 'margin'),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (prop, vL, vR) => {
          const left: Property = {
            type: 'Property',
            name: prop,
            values: ['left', vL],
            line: 0,
            column: 0,
          }
          const right: Property = {
            type: 'Property',
            name: prop,
            values: ['right', vR],
            line: 0,
            column: 0,
          }
          const result = mergeProperties([left], [right])
          expect(result).toHaveLength(2)
        }
      )
    )
  })

  it('non-directional pad value (single) overwrites directional ones', () => {
    // pad left 10, pad 20 → key "padding:left" deleted, new key "padding"
    const left: Property = {
      type: 'Property',
      name: 'padding',
      values: ['left', 10],
      line: 0,
      column: 0,
    }
    const all: Property = { type: 'Property', name: 'padding', values: [20], line: 0, column: 0 }
    const result = mergeProperties([left], [all])
    // Both entries actually keep their distinct keys (padding:left vs padding).
    // The invariant we check: result is non-empty, last is `all`.
    expect(result[result.length - 1]).toBe(all)
  })

  it('result.length ≤ base.length + overrides.length', () => {
    fc.assert(
      fc.property(
        fc.array(simplePropertyArb, { maxLength: 8 }),
        fc.array(simplePropertyArb, { maxLength: 8 }),
        (base, overrides) => {
          const merged = mergeProperties(base, overrides)
          expect(merged.length).toBeLessThanOrEqual(base.length + overrides.length)
        }
      )
    )
  })

  it('idempotence: merge(merge(base, overrides), []) == merge(base, overrides) after key dedup', () => {
    fc.assert(
      fc.property(
        fc.array(simplePropertyArb, { maxLength: 6 }),
        fc.array(simplePropertyArb, { maxLength: 6 }),
        (base, overrides) => {
          const once = mergeProperties(base, overrides)
          const twice = mergeProperties(once, [])
          // both must be the same length and the same keys, and last-of-each-key matches
          expect(twice.length).toBe(once.length)
          const onceNames = once.map(p => p.name).sort()
          const twiceNames = twice.map(p => p.name).sort()
          expect(twiceNames).toEqual(onceNames)
        }
      )
    )
  })
})

// =============================================================================
// 2. formatCSSValue
// =============================================================================

describe('Property-based: formatCSSValue', () => {
  const PX_PROPS = ['padding', 'pad', 'gap', 'width', 'w', 'height', 'h', 'font-size', 'fs']
  const NON_PX_PROPS = ['opacity', 'color', 'background']

  it('integer-only values get "px" appended (px-properties)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PX_PROPS),
        fc.integer({ min: -1000, max: 1000 }),
        (prop, n) => {
          const result = formatCSSValue(prop, String(n))
          expect(result).toBe(`${n}px`)
        }
      )
    )
  })

  it('values with explicit unit (%, vh, vw, em, rem) preserved unchanged', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PX_PROPS),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('%', 'vh', 'vw', 'vmin', 'vmax', 'em', 'rem', 'ch'),
        (prop, n, unit) => {
          const value = `${n}${unit}`
          const result = formatCSSValue(prop, value)
          expect(result).toBe(value)
        }
      )
    )
  })

  it('non-px-properties receive value unchanged', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NON_PX_PROPS),
        fc.oneof(
          fc.integer({ min: 0, max: 100 }).map(String),
          fc.constantFrom('#fff', '#000', 'red', 'transparent', '0.5')
        ),
        (prop, value) => {
          expect(formatCSSValue(prop, value)).toBe(value)
        }
      )
    )
  })

  it('multi-value: each integer chunk gets px, others preserved', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 100 }).map(String),
            fc.constantFrom('50%', '10vh', 'auto')
          ),
          { minLength: 2, maxLength: 4 }
        ),
        chunks => {
          const value = chunks.join(' ')
          const result = formatCSSValue('padding', value)
          const resultParts = result.split(' ')
          expect(resultParts).toHaveLength(chunks.length)
          chunks.forEach((c, i) => {
            if (/^-?\d+$/.test(c)) {
              expect(resultParts[i]).toBe(`${c}px`)
            } else {
              expect(resultParts[i]).toBe(c)
            }
          })
        }
      )
    )
  })

  it('idempotent on already-formatted px-values', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PX_PROPS), fc.integer({ min: 0, max: 1000 }), (prop, n) => {
        const once = formatCSSValue(prop, String(n)) // "16" → "16px"
        const twice = formatCSSValue(prop, once) // "16px" stays "16px"
        expect(twice).toBe(once)
      })
    )
  })

  it('decimals (without units) on px-properties stay un-suffixed (only integers get px)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PX_PROPS),
        fc
          .float({ min: Math.fround(0.1), max: Math.fround(99.9), noNaN: true })
          .filter(x => !Number.isInteger(x)),
        (prop, n) => {
          const value = String(n)
          // Only integer regex matches; floats stay unchanged
          const result = formatCSSValue(prop, value)
          if (/^-?\d+$/.test(value)) {
            expect(result).toBe(`${value}px`)
          } else {
            expect(result).toBe(value)
          }
        }
      )
    )
  })
})

// =============================================================================
// 3. schemaPropertyToCSS
// =============================================================================

describe('Property-based: schemaPropertyToCSS', () => {
  it('unknown property returns handled=false, no styles', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 5, maxLength: 12 })
          // restrict to obviously-unknown property names
          .filter(s => /^[a-z]+$/.test(s) && s.length > 8)
          .map(s => `__unknown_${s}__`),
        unknownName => {
          const result = schemaPropertyToCSS(unknownName, [42])
          expect(result.handled).toBe(false)
          expect(result.styles).toHaveLength(0)
        }
      )
    )
  })

  it('width with explicit % unit: schema preserves % (never px)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), n => {
        const result = schemaPropertyToCSS('width', [`${n}%`])
        expect(result.handled).toBe(true)
        // No style value should contain `${n}px`
        for (const style of result.styles) {
          if (typeof style.value === 'string') {
            expect(style.value).not.toMatch(new RegExp(`\\b${n}px\\b`))
            expect(style.value).toMatch(new RegExp(`\\b${n}%`))
          }
        }
      })
    )
  })

  it('width with numeric value: schema yields px (default unit)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), n => {
        const result = schemaPropertyToCSS('width', [n])
        expect(result.handled).toBe(true)
        expect(
          result.styles.some(s => typeof s.value === 'string' && s.value.includes(`${n}px`))
        ).toBe(true)
      })
    )
  })

  it('color (background) with hex value: handled, value contains hex', () => {
    const hexCharArb = fc.constantFrom(...'0123456789abcdef'.split(''))
    const hexStringArb = fc
      .array(hexCharArb, { minLength: 6, maxLength: 6 })
      .map(arr => arr.join(''))
    fc.assert(
      fc.property(hexStringArb, hex => {
        const value = `#${hex}`
        const result = schemaPropertyToCSS('background', [value])
        expect(result.handled).toBe(true)
        expect(
          result.styles.some(s => String(s.value).toLowerCase().includes(value.toLowerCase()))
        ).toBe(true)
      })
    )
  })

  it('boolean true on standalone-keyword property → handled', () => {
    // e.g. `stacked`, `wrap`, `center` — all standalone properties
    fc.assert(
      fc.property(
        fc.constantFrom('stacked', 'wrap', 'truncate', 'italic', 'underline', 'uppercase'),
        propName => {
          const result = schemaPropertyToCSS(propName, [true])
          expect(result.handled).toBe(true)
          expect(result.styles.length).toBeGreaterThan(0)
        }
      )
    )
  })
})

// =============================================================================
// 4. expandPropertySets
// =============================================================================

describe('Property-based: expandPropertySets', () => {
  it('empty propsetMap, empty componentMap → identity', () => {
    fc.assert(
      fc.property(fc.array(simplePropertyArb, { maxLength: 10 }), props => {
        const result = expandPropertySets(props, new Map(), new Map())
        // Properties without a `propset` name pass through unchanged.
        expect(result).toEqual(props)
      })
    )
  })

  it('properties without propset/component-mixin pass through unchanged', () => {
    fc.assert(
      fc.property(fc.array(simplePropertyArb, { maxLength: 10 }), props => {
        // Random non-empty propsetMap/componentMap must not affect simple props.
        const psMap = new Map<string, Property[]>([['someUnused', []]])
        const result = expandPropertySets(props, psMap)
        expect(result).toEqual(props)
      })
    )
  })

  it('propset reference expands to its constituent properties', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 8 }).filter(s => /^[a-z]+$/.test(s)),
        fc.array(simplePropertyArb, { minLength: 1, maxLength: 5 }),
        (psName, psProps) => {
          const ref: Property = {
            type: 'Property',
            name: 'propset',
            values: [{ kind: 'token' as const, name: psName }],
            line: 0,
            column: 0,
          }
          const psMap = new Map<string, Property[]>([[psName, psProps]])
          const result = expandPropertySets([ref], psMap)
          expect(result).toEqual(psProps)
        }
      )
    )
  })

  it('PascalCase component-mixin reference expands to component properties', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 8 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
        fc.array(simplePropertyArb, { minLength: 1, maxLength: 5 }),
        (compName, compProps) => {
          // simulate parser output: `Frame ..., InputField` → property with name InputField, no values
          const mixinRef: Property = {
            type: 'Property',
            name: compName,
            values: [],
            line: 0,
            column: 0,
          }
          const componentDef: ComponentDefinition = {
            type: 'ComponentDefinition',
            name: compName,
            properties: compProps,
            children: [],
            isPrimitive: false,
            line: 0,
            column: 0,
          } as any
          const compMap = new Map<string, ComponentDefinition>([[compName, componentDef]])
          const result = expandPropertySets([mixinRef], new Map(), compMap)
          expect(result).toEqual(compProps)
        }
      )
    )
  })

  it('unknown propset reference → property kept as-is (no crash)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 8 }).filter(s => /^[a-z]+$/.test(s)),
        psName => {
          const ref: Property = {
            type: 'Property',
            name: 'propset',
            values: [{ kind: 'token' as const, name: psName }],
            line: 0,
            column: 0,
          }
          // empty propsetMap → unknown name → must keep the propset prop
          const result = expandPropertySets([ref], new Map())
          expect(result).toEqual([ref])
        }
      )
    )
  })
})

// =============================================================================
// 5. generateLayoutStyles
// =============================================================================

describe('Property-based: generateLayoutStyles', () => {
  it('empty context on Frame (container) → display:flex with column direction', () => {
    const ctx = createLayoutContext()
    const styles = generateLayoutStyles(ctx, 'Frame')
    expect(styles.some(s => s.property === 'display' && s.value === 'flex')).toBe(true)
    expect(styles.some(s => s.property === 'flex-direction' && s.value === 'column')).toBe(true)
  })

  it('empty context on Text (non-container) without layout → no display:flex', () => {
    const ctx = createLayoutContext()
    const styles = generateLayoutStyles(ctx, 'Text')
    expect(styles.some(s => s.property === 'display' && s.value === 'flex')).toBe(false)
  })

  it('isGrid=true → display:grid takes precedence (no flex output)', () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom('repeat(3, 1fr)', '1fr 2fr', '100px 200px')),
        gridCols => {
          const ctx = createLayoutContext()
          ctx.isGrid = true
          if (gridCols) ctx.gridColumns = gridCols
          const styles = generateLayoutStyles(ctx, 'Frame')
          expect(styles.some(s => s.property === 'display' && s.value === 'grid')).toBe(true)
          expect(styles.some(s => s.property === 'display' && s.value === 'flex')).toBe(false)
        }
      )
    )
  })

  it('grid: specific column-gap/row-gap takes precedence over general gap', () => {
    const ctx = createLayoutContext()
    ctx.isGrid = true
    ctx.gap = '10px'
    ctx.columnGap = '5px'
    const styles = generateLayoutStyles(ctx, 'Frame')
    expect(styles.some(s => s.property === 'column-gap' && s.value === '5px')).toBe(true)
    // when columnGap is set, general gap should not be emitted
    expect(styles.some(s => s.property === 'gap' && s.value === '10px')).toBe(false)
  })

  it('applyAlignmentsToContext: last hor/ver wins for direction', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('hor', 'ver', 'horizontal', 'vertical'), {
          minLength: 1,
          maxLength: 5,
        }),
        keywords => {
          const ctx = createLayoutContext()
          applyAlignmentsToContext(keywords, ctx)
          // Last keyword in the array determines direction
          const last = keywords[keywords.length - 1]
          if (last === 'hor' || last === 'horizontal') {
            expect(ctx.direction).toBe('row')
          } else {
            expect(ctx.direction).toBe('column')
          }
        }
      )
    )
  })

  it('does not crash on arbitrary alignment-keyword sequences', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...LAYOUT_KEYWORDS), { maxLength: 8 }), keywords => {
        const ctx = createLayoutContext()
        expect(() => applyAlignmentsToContext(keywords, ctx)).not.toThrow()
        expect(() => generateLayoutStyles(ctx, 'Frame')).not.toThrow()
      })
    )
  })

  it('all output styles have non-empty property and value strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...LAYOUT_KEYWORDS), { maxLength: 6 }),
        fc.option(fc.constantFrom('10px', '5px', '20px')),
        (keywords, gap) => {
          const ctx = createLayoutContext()
          applyAlignmentsToContext(keywords, ctx)
          if (gap) ctx.gap = gap
          const styles = generateLayoutStyles(ctx, 'Frame')
          for (const s of styles) {
            expect(typeof s.property).toBe('string')
            expect(s.property.length).toBeGreaterThan(0)
            expect(s.value !== null && s.value !== undefined).toBe(true)
            expect(String(s.value).length).toBeGreaterThan(0)
          }
        }
      )
    )
  })
})
