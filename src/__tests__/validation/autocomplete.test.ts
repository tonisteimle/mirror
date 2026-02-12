import { describe, it, expect } from 'vitest'

// Import the internal functions we need to test
// We'll need to export them from dsl-autocomplete.ts first
import {
  filterTokensForProperty,
  getPropertyContextForToken,
  PROPERTY_TO_TOKEN_SUFFIXES,
} from '../../editor/dsl-autocomplete'

describe('DSL Autocomplete - Token Completion', () => {
  describe('PROPERTY_TO_TOKEN_SUFFIXES', () => {
    it('has correct suffixes for col', () => {
      expect(PROPERTY_TO_TOKEN_SUFFIXES['col']).toEqual(['-col', '-color'])
    })

    it('has correct suffixes for pad', () => {
      expect(PROPERTY_TO_TOKEN_SUFFIXES['pad']).toEqual(['-pad', '-padding'])
    })

    it('has correct suffixes for mar', () => {
      expect(PROPERTY_TO_TOKEN_SUFFIXES['mar']).toEqual(['-mar', '-margin'])
    })

    it('has correct suffixes for rad', () => {
      expect(PROPERTY_TO_TOKEN_SUFFIXES['rad']).toEqual(['-rad', '-radius'])
    })
  })

  describe('getPropertyContextForToken', () => {
    it('returns null for standalone $', () => {
      expect(getPropertyContextForToken('Box $')).toBe(null)
    })

    it('returns property name for "col $"', () => {
      expect(getPropertyContextForToken('Box col $')).toBe('col')
    })

    it('returns property name for "pad $"', () => {
      expect(getPropertyContextForToken('Box pad $')).toBe('pad')
    })

    it('returns property name for "col $partial"', () => {
      expect(getPropertyContextForToken('Text col $prim')).toBe('col')
    })

    it('returns property name for "rad $"', () => {
      expect(getPropertyContextForToken('Box rad $')).toBe('rad')
    })

    it('returns null for no $ in text', () => {
      expect(getPropertyContextForToken('Box pad 16')).toBe(null)
    })

    it('returns null for $ at start of line', () => {
      expect(getPropertyContextForToken('$')).toBe(null)
    })

    it('returns property from complex line', () => {
      expect(getPropertyContextForToken('Box pad 16 col $')).toBe('col')
    })
  })

  describe('filterTokensForProperty', () => {
    const testTokens = new Map<string, unknown>([
      ['primary-col', '#3B82F6'],
      ['secondary-color', '#10B981'],
      ['default-pad', 16],
      ['card-padding', 24],
      ['card-rad', 12],
      ['border-radius', 8],
      ['heading-size', 24],
      ['body-font-size', 14],
      ['small-gap', 8],
      ['random-value', 42],
    ])

    it('returns all tokens when no property context', () => {
      const result = filterTokensForProperty(testTokens, null)
      expect(result.length).toBe(10)
    })

    it('filters to col tokens for col property', () => {
      const result = filterTokensForProperty(testTokens, 'col')
      expect(result.length).toBe(2)
      expect(result.map(t => t.name)).toContain('primary-col')
      expect(result.map(t => t.name)).toContain('secondary-color')
    })

    it('filters to pad tokens for pad property', () => {
      const result = filterTokensForProperty(testTokens, 'pad')
      expect(result.length).toBe(2)
      expect(result.map(t => t.name)).toContain('default-pad')
      expect(result.map(t => t.name)).toContain('card-padding')
    })

    it('filters to rad tokens for rad property', () => {
      const result = filterTokensForProperty(testTokens, 'rad')
      expect(result.length).toBe(2)
      expect(result.map(t => t.name)).toContain('card-rad')
      expect(result.map(t => t.name)).toContain('border-radius')
    })

    it('filters to size tokens for size property', () => {
      const result = filterTokensForProperty(testTokens, 'size')
      expect(result.length).toBe(2)
      expect(result.map(t => t.name)).toContain('heading-size')
      expect(result.map(t => t.name)).toContain('body-font-size')
    })

    it('filters to gap tokens for gap property', () => {
      const result = filterTokensForProperty(testTokens, 'gap')
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('small-gap')
    })

    it('returns all tokens for unknown property', () => {
      const result = filterTokensForProperty(testTokens, 'unknown')
      expect(result.length).toBe(10)
    })

    it('preserves token values', () => {
      const result = filterTokensForProperty(testTokens, 'col')
      const primaryCol = result.find(t => t.name === 'primary-col')
      expect(primaryCol?.value).toBe('#3B82F6')
    })

    it('handles empty token map', () => {
      const result = filterTokensForProperty(new Map(), 'col')
      expect(result.length).toBe(0)
    })

    it('is case insensitive for suffix matching', () => {
      const mixedCaseTokens = new Map<string, unknown>([
        ['Primary-COL', '#3B82F6'],
        ['CARD-PAD', 16],
      ])

      const colResult = filterTokensForProperty(mixedCaseTokens, 'col')
      expect(colResult.length).toBe(1)

      const padResult = filterTokensForProperty(mixedCaseTokens, 'pad')
      expect(padResult.length).toBe(1)
    })
  })
})
