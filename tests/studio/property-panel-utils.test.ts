/**
 * Property Panel Utils Tests
 *
 * Tests for validation, HTML helpers, and token utilities.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  VALIDATION_RULES,
  PROPERTY_VALIDATION_TYPE,
  validatePropertyValue
} from '../../studio/panels/property/utils/validation'
import {
  escapeHtml,
  getDisplayLabel,
  getSelectOptions
} from '../../studio/panels/property/utils/html'
import {
  TokenCache,
  TOKEN_SUFFIX_MAP,
  getTokenSuffixForProperty,
  getTokenShortLabel
} from '../../studio/panels/property/utils/tokens'

// =============================================================================
// VALIDATION UTILS
// =============================================================================

describe('Validation Utils', () => {
  describe('VALIDATION_RULES', () => {
    it('should have numeric rule', () => {
      expect(VALIDATION_RULES.numeric).toBeDefined()
      expect(VALIDATION_RULES.numeric.pattern).toBeDefined()
    })

    it('should have size rule', () => {
      expect(VALIDATION_RULES.size).toBeDefined()
    })

    it('should have color rule', () => {
      expect(VALIDATION_RULES.color).toBeDefined()
    })

    it('should have opacity rule', () => {
      expect(VALIDATION_RULES.opacity).toBeDefined()
    })
  })

  describe('PROPERTY_VALIDATION_TYPE', () => {
    it('should map gap to numeric', () => {
      expect(PROPERTY_VALIDATION_TYPE['gap']).toBe('numeric')
      expect(PROPERTY_VALIDATION_TYPE['g']).toBe('numeric')
    })

    it('should map bg to color', () => {
      expect(PROPERTY_VALIDATION_TYPE['bg']).toBe('color')
      expect(PROPERTY_VALIDATION_TYPE['background']).toBe('color')
    })

    it('should map opacity to opacity', () => {
      expect(PROPERTY_VALIDATION_TYPE['opacity']).toBe('opacity')
      expect(PROPERTY_VALIDATION_TYPE['o']).toBe('opacity')
    })
  })

  describe('validatePropertyValue', () => {
    describe('numeric properties', () => {
      it('should accept integers', () => {
        expect(validatePropertyValue('gap', '12')).toBe(true)
        expect(validatePropertyValue('fs', '16')).toBe(true)
      })

      it('should accept decimals', () => {
        expect(validatePropertyValue('gap', '1.5')).toBe(true)
        expect(validatePropertyValue('scale', '0.5')).toBe(true)
      })

      it('should accept token references', () => {
        expect(validatePropertyValue('gap', '$spacing.md')).toBe(true)
        expect(validatePropertyValue('fs', '$font.lg')).toBe(true)
      })

      it('should accept empty values', () => {
        expect(validatePropertyValue('gap', '')).toBe(true)
      })

      it('should reject invalid values', () => {
        expect(validatePropertyValue('gap', 'abc')).toBe(false)
        expect(validatePropertyValue('fs', 'large')).toBe(false)
      })
    })

    describe('color properties', () => {
      it('should accept hex colors', () => {
        expect(validatePropertyValue('bg', '#fff')).toBe(true)
        expect(validatePropertyValue('bg', '#ffffff')).toBe(true)
        expect(validatePropertyValue('col', '#2563ebff')).toBe(true)
      })

      it('should accept transparent', () => {
        expect(validatePropertyValue('bg', 'transparent')).toBe(true)
      })

      it('should accept color tokens', () => {
        expect(validatePropertyValue('bg', '$primary.bg')).toBe(true)
      })

      it('should accept empty values', () => {
        expect(validatePropertyValue('bg', '')).toBe(true)
      })
    })

    describe('unknown properties', () => {
      it('should accept any value for unknown properties', () => {
        expect(validatePropertyValue('unknown-prop', 'anything')).toBe(true)
        expect(validatePropertyValue('custom', '###')).toBe(true)
      })
    })

    describe('with input element', () => {
      let input: HTMLInputElement

      beforeEach(() => {
        input = document.createElement('input')
      })

      it('should add invalid class on error', () => {
        validatePropertyValue('gap', 'invalid!', input)
        expect(input.classList.contains('invalid')).toBe(true)
      })

      it('should remove invalid class on valid', () => {
        input.classList.add('invalid')
        validatePropertyValue('gap', '16', input)
        expect(input.classList.contains('invalid')).toBe(false)
      })

      it('should set title attribute with error message', () => {
        validatePropertyValue('gap', 'invalid', input)
        expect(input.title).toBeTruthy()
      })

      it('should clear title on valid', () => {
        input.title = 'Previous error'
        validatePropertyValue('gap', '16', input)
        expect(input.title).toBe('')
      })
    })
  })
})

// =============================================================================
// HTML UTILS
// =============================================================================

describe('HTML Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('should handle ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('should pass through safe strings', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
      expect(escapeHtml('12345')).toBe('12345')
    })
  })

  describe('getDisplayLabel', () => {
    it('should return display label for known properties', () => {
      expect(getDisplayLabel('bg')).toBe('Background')
      expect(getDisplayLabel('col')).toBe('Color')
      expect(getDisplayLabel('pad')).toBe('Padding')
    })

    it('should capitalize unknown properties', () => {
      expect(getDisplayLabel('custom')).toBe('Custom')
    })

    it('should handle hyphenated properties', () => {
      expect(getDisplayLabel('font-size')).toBe('Font Size')
    })
  })

  describe('getSelectOptions', () => {
    it('should return options for cursor', () => {
      const options = getSelectOptions('cursor')
      expect(options).toContain('pointer')
      expect(options).toContain('grab')
    })

    it('should return options for shadow', () => {
      const options = getSelectOptions('shadow')
      expect(options).toContain('sm')
      expect(options).toContain('md')
      expect(options).toContain('lg')
    })

    it('should return empty array for unknown property', () => {
      expect(getSelectOptions('unknown')).toEqual([])
    })
  })
})

// =============================================================================
// TOKEN UTILS
// =============================================================================

describe('Token Utils', () => {
  describe('TOKEN_SUFFIX_MAP', () => {
    it('should map padding properties', () => {
      expect(TOKEN_SUFFIX_MAP['pad']).toBe('pad')
      expect(TOKEN_SUFFIX_MAP['padding']).toBe('pad')
      expect(TOKEN_SUFFIX_MAP['p']).toBe('pad')
    })

    it('should map color properties', () => {
      expect(TOKEN_SUFFIX_MAP['bg']).toBe('bg')
      expect(TOKEN_SUFFIX_MAP['col']).toBe('col')
    })
  })

  describe('getTokenSuffixForProperty', () => {
    it('should return suffix for known properties', () => {
      expect(getTokenSuffixForProperty('pad')).toBe('pad')
      expect(getTokenSuffixForProperty('bg')).toBe('bg')
    })

    it('should return undefined for unknown properties', () => {
      expect(getTokenSuffixForProperty('unknown')).toBeUndefined()
    })
  })

  describe('getTokenShortLabel', () => {
    it('should return short label for simple tokens', () => {
      expect(getTokenShortLabel('sm.pad')).toBe('SM')
      expect(getTokenShortLabel('md.pad')).toBe('MD')
    })

    it('should abbreviate longer names', () => {
      expect(getTokenShortLabel('spacing.pad')).toBe('Spa')
    })
  })

  describe('TokenCache', () => {
    let cache: TokenCache

    beforeEach(() => {
      cache = new TokenCache()
    })

    it('should extract spacing tokens from source', () => {
      const source = `
sm.pad: 4
md.pad: 8
lg.pad: 16
`
      const tokens = cache.getSpacingTokens('pad', () => source)
      expect(tokens).toHaveLength(3)
      expect(tokens[0].name).toBe('sm')
      expect(tokens[0].value).toBe('4')
    })

    it('should cache spacing tokens', () => {
      const source = 'sm.pad: 4'
      const tokens1 = cache.getSpacingTokens('pad', () => source)
      const tokens2 = cache.getSpacingTokens('pad', () => source)
      expect(tokens1).toBe(tokens2) // Same reference
    })

    it('should invalidate cache on source change', () => {
      let source = 'sm.pad: 4'
      const tokens1 = cache.getSpacingTokens('pad', () => source)
      expect(tokens1).toHaveLength(1)

      source = 'sm.pad: 4\nmd.pad: 8'
      const tokens2 = cache.getSpacingTokens('pad', () => source)
      expect(tokens2).toHaveLength(2)
    })

    it('should extract color tokens from source', () => {
      const source = `
primary.bg: #2563eb
danger.bg: #ef4444
`
      const tokens = cache.getColorTokens(() => source)
      expect(tokens).toHaveLength(2)
    })

    it('should resolve token values', () => {
      const source = 'sm.pad: 4'
      const value = cache.resolveTokenValue('sm.pad', () => source)
      expect(value).toBe('4')
    })

    it('should return null for unknown tokens', () => {
      const value = cache.resolveTokenValue('unknown.pad', () => '')
      expect(value).toBeNull()
    })

    it('should invalidate cache manually', () => {
      const source = 'sm.pad: 4'
      cache.getSpacingTokens('pad', () => source)
      cache.invalidate()
      // After invalidation, cache should be empty
      const tokens = cache.getSpacingTokens('pad', () => source)
      expect(tokens).toHaveLength(1) // Re-extracted
    })
  })
})
