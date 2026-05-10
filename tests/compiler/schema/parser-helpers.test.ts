/**
 * parser-helpers — direct unit-tests
 *
 * `getCanonicalPropertyName` and `matchesCanonical` are the schema-driven
 * alias resolution surface used by IR-Ops and React-Backend (Lane 2
 * Inkrement 2). They have indirect coverage via differential alias-
 * equivalence pins, but no direct unit-tests for the predicate
 * semantics. This file pins:
 *
 *   - canonical names round-trip to themselves
 *   - aliases canonicalise to their schema entry
 *   - unknown names pass through unchanged (no exception)
 *   - matchesCanonical is true for both canonical and alias inputs
 *   - matchesCanonical against an unknown canonical short-circuits to
 *     identity comparison (still type-correct, no schema lookup)
 */

import { describe, it, expect } from 'vitest'
import { getCanonicalPropertyName, matchesCanonical } from '../../../compiler/schema/parser-helpers'

describe('getCanonicalPropertyName', () => {
  it('returns the canonical name unchanged', () => {
    expect(getCanonicalPropertyName('background')).toBe('background')
    expect(getCanonicalPropertyName('padding')).toBe('padding')
    expect(getCanonicalPropertyName('horizontal')).toBe('horizontal')
  })

  it('resolves common short aliases to canonical', () => {
    expect(getCanonicalPropertyName('bg')).toBe('background')
    expect(getCanonicalPropertyName('pad')).toBe('padding')
    expect(getCanonicalPropertyName('p')).toBe('padding')
    expect(getCanonicalPropertyName('mar')).toBe('margin')
    expect(getCanonicalPropertyName('m')).toBe('margin')
    expect(getCanonicalPropertyName('w')).toBe('width')
    expect(getCanonicalPropertyName('h')).toBe('height')
    expect(getCanonicalPropertyName('hor')).toBe('horizontal')
    expect(getCanonicalPropertyName('ver')).toBe('vertical')
    expect(getCanonicalPropertyName('g')).toBe('gap')
    expect(getCanonicalPropertyName('gx')).toBe('gap-x')
    expect(getCanonicalPropertyName('gy')).toBe('gap-y')
    expect(getCanonicalPropertyName('rh')).toBe('row-height')
    expect(getCanonicalPropertyName('rot')).toBe('rotate')
  })

  it('resolves icon aliases', () => {
    expect(getCanonicalPropertyName('is')).toBe('icon-size')
    expect(getCanonicalPropertyName('ic')).toBe('icon-color')
    expect(getCanonicalPropertyName('iw')).toBe('icon-weight')
  })

  it('passes unknown names through unchanged', () => {
    expect(getCanonicalPropertyName('not-a-property')).toBe('not-a-property')
    expect(getCanonicalPropertyName('')).toBe('')
    expect(getCanonicalPropertyName('SomeRandomThing')).toBe('SomeRandomThing')
  })
})

describe('matchesCanonical', () => {
  it('returns true when the input is already the canonical', () => {
    expect(matchesCanonical('background', 'background')).toBe(true)
    expect(matchesCanonical('padding', 'padding')).toBe(true)
  })

  it('returns true when the input is a declared alias of the canonical', () => {
    expect(matchesCanonical('bg', 'background')).toBe(true)
    expect(matchesCanonical('p', 'padding')).toBe(true)
    expect(matchesCanonical('hor', 'horizontal')).toBe(true)
    expect(matchesCanonical('rot', 'rotate')).toBe(true)
    expect(matchesCanonical('is', 'icon-size')).toBe(true)
  })

  it('returns false for a different canonical, even if input is an alias', () => {
    expect(matchesCanonical('bg', 'color')).toBe(false)
    expect(matchesCanonical('p', 'margin')).toBe(false)
    expect(matchesCanonical('hor', 'vertical')).toBe(false)
  })

  it('returns false for unknown inputs', () => {
    expect(matchesCanonical('not-a-property', 'background')).toBe(false)
    expect(matchesCanonical('', 'background')).toBe(false)
  })

  it('treats unknown canonical as identity (no schema lookup)', () => {
    // Both unknown — get-canonical returns input unchanged, identity holds.
    expect(matchesCanonical('not-a-property', 'not-a-property')).toBe(true)
    // Unknown alias against known canonical — never matches (alias isn't
    // registered).
    expect(matchesCanonical('bg', 'not-a-property')).toBe(false)
  })
})
