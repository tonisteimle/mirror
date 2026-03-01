/**
 * Tests for Expand on Enter functionality
 *
 * Tests that pressing Enter at end of expandable lines
 * converts inline syntax to block form.
 */

import { describe, it, expect } from 'vitest'
import { isExpandableLine, expandLineToBlock } from '../../editor/canonical-formatter'

describe('Expand on Enter', () => {
  describe('Line Detection', () => {
    describe('should expand', () => {
      it('component with comma-separated properties', () => {
        expect(isExpandableLine('Button p 16, bg #333')).toBe(true)
        expect(isExpandableLine('Card padding 12, background #fff, radius 8')).toBe(true)
      })

      it('component with short property names', () => {
        expect(isExpandableLine('Button p 16')).toBe(true)
        expect(isExpandableLine('Card bg #333')).toBe(true)
        expect(isExpandableLine('Box rad 8')).toBe(true)
        expect(isExpandableLine('Container hor')).toBe(true)
        expect(isExpandableLine('Stack ver')).toBe(true)
      })

      it('dimension sugar (width/height shorthand)', () => {
        expect(isExpandableLine('Box 300')).toBe(true)
        expect(isExpandableLine('Card 200 400')).toBe(true)
        expect(isExpandableLine('Panel 100, bg #333')).toBe(true)
      })

      it('component definitions with properties', () => {
        expect(isExpandableLine('MyButton: p 16, bg #333')).toBe(true)
        expect(isExpandableLine('PrimaryCard: rad 8, bg #fff')).toBe(true)
      })
    })

    describe('should NOT expand', () => {
      it('empty lines', () => {
        expect(isExpandableLine('')).toBe(false)
        expect(isExpandableLine('   ')).toBe(false)
        expect(isExpandableLine('\t')).toBe(false)
      })

      it('comments', () => {
        expect(isExpandableLine('// This is a comment')).toBe(false)
        expect(isExpandableLine('  // Indented comment')).toBe(false)
      })

      it('token definitions', () => {
        expect(isExpandableLine('$primary: #3B82F6')).toBe(false)
        expect(isExpandableLine('$spacing.sm: 8')).toBe(false)
      })

      it('block keywords', () => {
        expect(isExpandableLine('hover')).toBe(false)
        expect(isExpandableLine('focus')).toBe(false)
        expect(isExpandableLine('active')).toBe(false)
        expect(isExpandableLine('disabled')).toBe(false)
        expect(isExpandableLine('state selected')).toBe(false)
        expect(isExpandableLine('state hover')).toBe(false)
        expect(isExpandableLine('events')).toBe(false)
        expect(isExpandableLine('if $isLoggedIn')).toBe(false)
        expect(isExpandableLine('else')).toBe(false)
        expect(isExpandableLine('each $item in $list')).toBe(false)
        expect(isExpandableLine('data Users')).toBe(false)
      })

      it('already expanded property lines', () => {
        expect(isExpandableLine('  padding 16')).toBe(false)
        expect(isExpandableLine('  background #333')).toBe(false)
        expect(isExpandableLine('    radius 8')).toBe(false)
      })

      it('simple component without properties', () => {
        expect(isExpandableLine('Button')).toBe(false)
        expect(isExpandableLine('Card')).toBe(false)
      })

      it('component with only string content', () => {
        // These might contain commas but shouldn't expand
        expect(isExpandableLine('Text "Hello, world"')).toBe(false)
      })
    })
  })

  describe('Expansion Results', () => {
    it('expands to proper block form with indentation', () => {
      const result = expandLineToBlock('Button padding 16, background #333')
      expect(result).toBe('Button\n  padding 16\n  background #333')
    })

    it('normalizes short property names', () => {
      const result = expandLineToBlock('Card p 12, bg #fff, rad 8')
      expect(result).toBe('Card\n  padding 12\n  background #fff\n  radius 8')
    })

    it('preserves base indentation', () => {
      const result = expandLineToBlock('  Button p 16, bg #333')
      expect(result).toBe('  Button\n    padding 16\n    background #333')
    })

    it('handles component definitions', () => {
      const result = expandLineToBlock('MyButton: p 16, bg #333')
      expect(result).toBe('MyButton:\n  padding 16\n  background #333')
    })

    it('handles many properties', () => {
      const result = expandLineToBlock('Button p 16, bg #333, col #fff, rad 8, cursor pointer')
      expect(result).toBe('Button\n  padding 16\n  background #333\n  color #fff\n  radius 8\n  cursor pointer')
    })

    it('keeps string content on same line', () => {
      const result = expandLineToBlock('Button "Click me"')
      expect(result).toBe('Button "Click me"')
    })

    it('handles string with properties', () => {
      const result = expandLineToBlock('Button "Click", p 16, bg #333')
      // String should be treated as part of the properties
      const lines = result.split('\n')
      expect(lines[0]).toBe('Button')
      expect(lines.some(l => l.includes('"Click"'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles properties with multiple values', () => {
      const result = expandLineToBlock('Box p 16 24, bg #333')
      // Preprocessor expands p 16 24 to padding t-b 16, padding l-r 24
      expect(result).toContain('padding t-b 16')
      expect(result).toContain('padding l-r 24')
    })

    it('handles directional properties', () => {
      const result = expandLineToBlock('Card p left 16, p top 8')
      // Preprocessor uses short direction names: l, r, u (up), d (down)
      expect(result).toContain('padding l 16')
      expect(result).toContain('padding u 8')
    })

    it('handles border shorthand', () => {
      const result = expandLineToBlock('Card bor 1 #333, rad 8')
      expect(result).toContain('border 1 #333')
      expect(result).toContain('radius 8')
    })

    it('handles color shorthand', () => {
      const result = expandLineToBlock('Text c #fff, bg #333')
      expect(result).toContain('color #fff')
      expect(result).toContain('background #333')
    })

    it('handles layout shorthands', () => {
      const result = expandLineToBlock('Container hor, g 16')
      expect(result).toContain('horizontal')
      expect(result).toContain('gap 16')
    })
  })
})
