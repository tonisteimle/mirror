/**
 * Tests for DSL Normalizer
 *
 * Verifies:
 * - Short form to long form conversion
 * - Direction normalization
 * - Corner normalization
 * - Semantic equivalence checking
 */

import { describe, it, expect } from 'vitest'
import {
  normalize,
  normalizeLine,
  normalizeProperty,
  areEquivalent,
  compare,
  extractProperties,
} from '../../dsl/normalizer'

describe('DSL Normalizer', () => {
  describe('normalize', () => {
    describe('Property Name Normalization', () => {
      it('should normalize padding short forms', () => {
        expect(normalize('pad 12')).toBe('padding 12')
        expect(normalize('p 8')).toBe('padding 8')
      })

      it('should normalize background short forms', () => {
        expect(normalize('bg #333')).toBe('background #333')
      })

      it('should normalize color short forms', () => {
        expect(normalize('col #FFF')).toBe('color #FFF')
        expect(normalize('c #333')).toBe('color #333')
      })

      it('should normalize radius short forms', () => {
        expect(normalize('rad 8')).toBe('radius 8')
      })

      it('should normalize border short forms', () => {
        expect(normalize('bor 1')).toBe('border 1')
      })

      it('should normalize opacity short forms', () => {
        expect(normalize('o 0.5')).toBe('opacity 0.5')
        expect(normalize('opa 0.8')).toBe('opacity 0.8')
      })

      it('should keep long forms unchanged', () => {
        expect(normalize('padding 12')).toBe('padding 12')
        expect(normalize('background #333')).toBe('background #333')
      })
    })

    describe('Direction Normalization', () => {
      it('should normalize short directions', () => {
        expect(normalize('padding l 8')).toBe('padding left 8')
        expect(normalize('padding r 8')).toBe('padding right 8')
        expect(normalize('padding u 8')).toBe('padding top 8')
        expect(normalize('padding d 8')).toBe('padding bottom 8')
      })

      it('should normalize direction aliases', () => {
        expect(normalize('padding t 8')).toBe('padding top 8')
        expect(normalize('padding b 8')).toBe('padding bottom 8')
      })

      it('should normalize direction combos', () => {
        expect(normalize('padding l-r 8')).toBe('padding left-right 8')
        expect(normalize('padding u-d 8')).toBe('padding top-bottom 8')
      })

      it('should keep long directions unchanged', () => {
        expect(normalize('padding left 8')).toBe('padding left 8')
        expect(normalize('padding top-bottom 8')).toBe('padding top-bottom 8')
      })
    })

    describe('Corner Normalization', () => {
      it('should normalize short corners', () => {
        expect(normalize('radius tl 8')).toBe('radius top-left 8')
        expect(normalize('radius tr 8')).toBe('radius top-right 8')
        expect(normalize('radius bl 8')).toBe('radius bottom-left 8')
        expect(normalize('radius br 8')).toBe('radius bottom-right 8')
      })

      it('should keep long corners unchanged', () => {
        expect(normalize('radius top-left 8')).toBe('radius top-left 8')
      })
    })

    describe('Multi-Property Lines', () => {
      it('should normalize multiple properties on same line', () => {
        const result = normalize('pad 12, bg #333, rad 8')
        expect(result).toBe('padding 12, background #333, radius 8')
      })
    })

    describe('Multi-Line Code', () => {
      it('should normalize multiple lines', () => {
        const code = `Button
  pad 12
  bg #3B82F6
  rad 8`
        const expected = `Button
  padding 12
  background #3B82F6
  radius 8`
        expect(normalize(code)).toBe(expected)
      })
    })

    describe('Token References', () => {
      it('should preserve token references', () => {
        expect(normalize('bg $primary.bg')).toBe('background $primary.bg')
        expect(normalize('pad $sm.pad')).toBe('padding $sm.pad')
      })
    })

    describe('Comments', () => {
      it('should preserve comments', () => {
        const code = 'pad 12 // Spacing'
        const result = normalize(code)
        expect(result).toContain('// Spacing')
      })
    })

    describe('Component Names', () => {
      it('should preserve component names', () => {
        expect(normalize('Button')).toBe('Button')
        expect(normalize('MyComponent')).toBe('MyComponent')
      })

      it('should preserve component definitions', () => {
        const code = 'Button: pad 12, bg #333'
        const result = normalize(code)
        expect(result).toContain('Button:')
        expect(result).toContain('padding 12')
        expect(result).toContain('background #333')
      })
    })
  })

  describe('normalizeLine', () => {
    it('should normalize a single line', () => {
      expect(normalizeLine('pad 12')).toBe('padding 12')
      expect(normalizeLine('bg #333')).toBe('background #333')
    })
  })

  describe('normalizeProperty', () => {
    it('should normalize property names only', () => {
      expect(normalizeProperty('pad')).toBe('padding')
      expect(normalizeProperty('bg')).toBe('background')
      expect(normalizeProperty('rad')).toBe('radius')
      expect(normalizeProperty('col')).toBe('color')
    })

    it('should keep long forms unchanged', () => {
      expect(normalizeProperty('padding')).toBe('padding')
      expect(normalizeProperty('background')).toBe('background')
    })

    it('should keep unknown properties unchanged', () => {
      expect(normalizeProperty('unknown')).toBe('unknown')
    })
  })

  describe('areEquivalent', () => {
    it('should detect equivalent code with different forms', () => {
      expect(areEquivalent('pad 12', 'padding 12')).toBe(true)
      expect(areEquivalent('bg #333', 'background #333')).toBe(true)
      expect(areEquivalent('rad 8', 'radius 8')).toBe(true)
    })

    it('should detect equivalent directions', () => {
      expect(areEquivalent('padding l 8', 'padding left 8')).toBe(true)
      expect(areEquivalent('padding l-r 8', 'padding left-right 8')).toBe(true)
    })

    it('should detect equivalent corners', () => {
      expect(areEquivalent('radius tl 8', 'radius top-left 8')).toBe(true)
    })

    it('should detect non-equivalent code', () => {
      expect(areEquivalent('pad 12', 'pad 16')).toBe(false)
      expect(areEquivalent('pad 12', 'margin 12')).toBe(false)
    })
  })

  describe('compare', () => {
    it('should return comparison details', () => {
      const result = compare('pad 12', 'padding 12')
      expect(result.isEquivalent).toBe(true)
      expect(result.normalizedExpected).toBe('padding 12')
      expect(result.normalizedActual).toBe('padding 12')
      expect(result.differences).toHaveLength(0)
    })

    it('should identify differences', () => {
      const result = compare('pad 12', 'pad 16')
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.length).toBeGreaterThan(0)
    })

    it('should show missing and extra lines', () => {
      const result = compare('pad 12\nbg #333', 'pad 12')
      expect(result.differences.some((d) => d.startsWith('-'))).toBe(true)
    })
  })

  describe('extractProperties', () => {
    it('should extract simple properties', () => {
      const props = extractProperties('padding 12')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('padding')
      expect(props[0].value).toBe(12)
    })

    it('should extract properties with directions', () => {
      const props = extractProperties('padding left 8')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('padding')
      expect(props[0].direction).toBe('left')
      expect(props[0].value).toBe(8)
    })

    it('should extract properties with corners', () => {
      const props = extractProperties('radius top-left 8')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('radius')
      expect(props[0].corner).toBe('top-left')
      expect(props[0].value).toBe(8)
    })

    it('should extract color values', () => {
      const props = extractProperties('background #333')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('background')
      expect(props[0].value).toBe('#333')
    })

    it('should extract token references', () => {
      const props = extractProperties('background $primary.bg')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('background')
      expect(props[0].value).toBe('$primary.bg')
    })

    it('should extract multiple properties', () => {
      const props = extractProperties('padding 12, background #333')
      expect(props).toHaveLength(2)
      expect(props[0].name).toBe('padding')
      expect(props[1].name).toBe('background')
    })

    it('should extract boolean properties', () => {
      const props = extractProperties('horizontal')
      expect(props).toHaveLength(1)
      expect(props[0].name).toBe('horizontal')
      expect(props[0].value).toBe(true)
    })
  })

  describe('Round-trip Normalization', () => {
    it('should be idempotent', () => {
      const code = 'pad 12, bg #333, rad 8'
      const normalized1 = normalize(code)
      const normalized2 = normalize(normalized1)
      expect(normalized1).toBe(normalized2)
    })

    it('should be idempotent for complex code', () => {
      const code = `Button
  pad l-r 16
  pad u-d 8
  bg #3B82F6
  rad tl 8 br 8
  col #FFF`
      const normalized1 = normalize(code)
      const normalized2 = normalize(normalized1)
      expect(normalized1).toBe(normalized2)
    })
  })
})
