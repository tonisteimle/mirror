/**
 * Token Fixes Tests
 *
 * Tests for Phase 2 (Token) fixes.
 */

import { describe, it, expect } from 'vitest'
import {
  fixHyphenatedTokenNames,
  fixTokensOnSameLine,
  removeEmptyLinesBetweenTokens,
  fixMissingTokenPrefix,
  fixUndefinedTokenReferences,
  fixTokenAsProperty,
} from '../../lib/self-healing/fixes/token-fixes'

describe('Token Fixes (Phase 2)', () => {
  describe('fixHyphenatedTokenNames', () => {
    it('converts hyphenated token names to camelCase', () => {
      const code = `$border-color: #333
Box border-color $border-color`
      const expected = `$borderColor: #333
Box border-color $borderColor`
      expect(fixHyphenatedTokenNames(code)).toBe(expected)
    })

    it('handles multiple hyphenated tokens', () => {
      const code = `$hover-bg: #444
$active-color: #555
Button hover-bg $hover-bg`
      const expected = `$hoverBg: #444
$activeColor: #555
Button hover-bg $hoverBg`
      expect(fixHyphenatedTokenNames(code)).toBe(expected)
    })

    it('does not modify property names', () => {
      const code = 'Box border-color #333'
      expect(fixHyphenatedTokenNames(code)).toBe(code)
    })
  })

  describe('fixTokensOnSameLine', () => {
    it('splits tokens on same line', () => {
      const code = '$bg: #1E1E2E $text: #FFFFFF $accent: #3B82F6'
      const expected = `$bg: #1E1E2E
$text: #FFFFFF
$accent: #3B82F6`
      expect(fixTokensOnSameLine(code)).toBe(expected)
    })

    it('leaves single tokens unchanged', () => {
      const code = '$primary: #3B82F6'
      expect(fixTokensOnSameLine(code)).toBe(code)
    })
  })

  describe('removeEmptyLinesBetweenTokens', () => {
    it('removes empty lines between token definitions', () => {
      const code = `$primary: #3B82F6

$bg: #1E1E2E`
      const expected = `$primary: #3B82F6
$bg: #1E1E2E`
      expect(removeEmptyLinesBetweenTokens(code)).toBe(expected)
    })

    it('preserves empty lines elsewhere', () => {
      const code = `$primary: #3B82F6

Box bg $primary`
      expect(removeEmptyLinesBetweenTokens(code)).toBe(code)
    })
  })

  describe('fixMissingTokenPrefix', () => {
    it('adds $ prefix to token references', () => {
      const code = `$primary: #3B82F6
Box bg primary`
      const expected = `$primary: #3B82F6
Box bg $primary`
      expect(fixMissingTokenPrefix(code)).toBe(expected)
    })

    it('does not prefix property names', () => {
      const code = `$primary: #3B82F6
Box padding 16 bg $primary`
      expect(fixMissingTokenPrefix(code)).toBe(code)
    })

    it('does not prefix inside strings', () => {
      const code = `$primary: #3B82F6
Text "primary color"`
      expect(fixMissingTokenPrefix(code)).toBe(code)
    })

    it('does not prefix state names', () => {
      const code = `$selected: #3B82F6
state selected
  bg $selected`
      expect(fixMissingTokenPrefix(code)).toBe(code)
    })
  })

  describe('fixUndefinedTokenReferences', () => {
    it('fixes undefined token references by finding similar defined tokens', () => {
      // Token must be sufficiently similar (>0.4 score) to be matched
      const code = `$hoverBg: #2563EB
Button hover-bg $hoverBackground`
      // Should find $hoverBg as closest match for $hoverBackground (common prefix)
      const result = fixUndefinedTokenReferences(code)
      expect(result).toContain('$hoverBg')
      expect(result).not.toContain('$hoverBackground')
    })

    it('leaves defined tokens unchanged', () => {
      const code = `$primary: #3B82F6
Box bg $primary`
      expect(fixUndefinedTokenReferences(code)).toBe(code)
    })

    it('handles suffix aliases (bg/background)', () => {
      const code = `$hoverBg: #2563EB
Button hover-bg $hoverBackground`
      const result = fixUndefinedTokenReferences(code)
      expect(result).toContain('$hoverBg')
    })
  })

  describe('fixTokenAsProperty', () => {
    it('removes $ from property names used with values', () => {
      const code = `state focus
  $border-color $primary`
      const expected = `state focus
  border-color $primary`
      expect(fixTokenAsProperty(code)).toBe(expected)
    })

    it('fixes $border used as property', () => {
      const code = 'Box $border 1 #333'
      expect(fixTokenAsProperty(code)).toBe('Box border 1 #333')
    })

    it('fixes $background used as property', () => {
      const code = 'Box $background #F00'
      expect(fixTokenAsProperty(code)).toBe('Box background #F00')
    })

    it('leaves actual token values unchanged', () => {
      const code = '$myBorder: 2\nBox border $myBorder'
      expect(fixTokenAsProperty(code)).toBe(code)
    })
  })
})
