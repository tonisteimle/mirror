/**
 * Tests for Canonical Formatter
 *
 * Tests the "prettier" functionality that converts inline Mirror DSL
 * to canonical block form.
 */

import { describe, it, expect } from 'vitest'
import {
  getIndent,
  splitByComma,
  isExpandableLine,
  expandLineToBlock,
  formatDocument,
  needsFormatting,
} from '../../editor/canonical-formatter'

describe('Canonical Formatter', () => {
  describe('getIndent', () => {
    it('returns empty string for no indentation', () => {
      expect(getIndent('Button')).toBe('')
    })

    it('returns spaces for indented lines', () => {
      expect(getIndent('  padding 16')).toBe('  ')
      expect(getIndent('    nested')).toBe('    ')
    })

    it('handles tabs', () => {
      expect(getIndent('\tButton')).toBe('\t')
    })
  })

  describe('splitByComma', () => {
    it('splits simple comma-separated values', () => {
      expect(splitByComma('a, b, c')).toEqual(['a', ' b', ' c'])
    })

    it('respects quoted strings with commas', () => {
      expect(splitByComma('text "hello, world", bg #333')).toEqual([
        'text "hello, world"',
        ' bg #333',
      ])
    })

    it('handles single values', () => {
      expect(splitByComma('padding 16')).toEqual(['padding 16'])
    })
  })

  describe('isExpandableLine', () => {
    it('returns true for inline comma-separated properties', () => {
      expect(isExpandableLine('Button padding 16, background #333')).toBe(true)
      expect(isExpandableLine('Card p 12, bg #fff, rad 8')).toBe(true)
    })

    it('returns true for short property names', () => {
      expect(isExpandableLine('Button p 16')).toBe(true)
      expect(isExpandableLine('Card bg #333')).toBe(true)
      expect(isExpandableLine('Box rad 8')).toBe(true)
    })

    it('returns true for dimension sugar', () => {
      expect(isExpandableLine('Box 300')).toBe(true)
      expect(isExpandableLine('Card 200 400')).toBe(true)
    })

    it('returns false for empty lines', () => {
      expect(isExpandableLine('')).toBe(false)
      expect(isExpandableLine('   ')).toBe(false)
    })

    it('returns false for comments', () => {
      expect(isExpandableLine('// comment')).toBe(false)
      expect(isExpandableLine('  // indented comment')).toBe(false)
    })

    it('returns false for token definitions', () => {
      expect(isExpandableLine('$primary: #3B82F6')).toBe(false)
    })

    it('returns false for block keywords', () => {
      expect(isExpandableLine('hover')).toBe(false)
      expect(isExpandableLine('state selected')).toBe(false)
      expect(isExpandableLine('events')).toBe(false)
      expect(isExpandableLine('if $condition')).toBe(false)
      expect(isExpandableLine('each $item in $list')).toBe(false)
    })

    it('returns false for already-expanded property lines', () => {
      expect(isExpandableLine('  padding 16')).toBe(false)
      expect(isExpandableLine('  background #333')).toBe(false)
    })
  })

  describe('expandLineToBlock', () => {
    it('expands inline properties to block form', () => {
      const result = expandLineToBlock('Button padding 16, background #333')
      expect(result).toBe('Button\n  padding 16\n  background #333')
    })

    it('expands short property names', () => {
      const result = expandLineToBlock('Card p 12, bg #fff, rad 8')
      expect(result).toBe('Card\n  padding 12\n  background #fff\n  radius 8')
    })

    it('preserves indentation', () => {
      const result = expandLineToBlock('  Button p 16, bg #333')
      expect(result).toBe('  Button\n    padding 16\n    background #333')
    })

    it('keeps strings on same line', () => {
      const result = expandLineToBlock('Button "Click me"')
      expect(result).toBe('Button "Click me"')
    })

    it('handles component definitions', () => {
      const result = expandLineToBlock('MyButton: p 16, bg #333')
      expect(result).toBe('MyButton:\n  padding 16\n  background #333')
    })
  })

  describe('formatDocument', () => {
    it('formats multi-line document', () => {
      const input = `Button p 16, bg #333
Card rad 8, bg #fff`

      const expected = `Button
  padding 16
  background #333
Card
  radius 8
  background #fff`

      expect(formatDocument(input)).toBe(expected)
    })

    it('preserves empty lines', () => {
      const input = `Button p 16

Card bg #333`

      const result = formatDocument(input)
      expect(result).toContain('\n\n')
    })

    it('preserves comments', () => {
      const input = `// Header component
Button p 16`

      const result = formatDocument(input)
      expect(result).toContain('// Header component')
    })

    it('preserves token definitions', () => {
      const input = `$primary: #3B82F6
Button bg $primary`

      const result = formatDocument(input)
      expect(result).toContain('$primary: #3B82F6')
    })

    it('preserves block keywords', () => {
      const input = `Button p 16
  hover
    bg #555`

      const result = formatDocument(input)
      expect(result).toContain('hover')
      // Note: bg gets expanded to background by preprocessor
      expect(result).toContain('background #555')
    })

    it('handles nested structure', () => {
      const input = `Card p 16, bg #333
  Title col #fff
  Description col #aaa`

      const result = formatDocument(input)
      // Card should be expanded
      expect(result).toContain('Card\n  padding 16')
      // Children should be processed
      expect(result).toContain('Title')
      expect(result).toContain('Description')
    })
  })

  describe('needsFormatting', () => {
    it('returns true for inline syntax', () => {
      expect(needsFormatting('Button p 16, bg #333')).toBe(true)
    })

    it('returns false for already formatted content', () => {
      const formatted = `Button
  padding 16
  background #333`
      expect(needsFormatting(formatted)).toBe(false)
    })

    it('returns true for short property names', () => {
      expect(needsFormatting('Button\n  p 16')).toBe(true)
    })
  })
})
