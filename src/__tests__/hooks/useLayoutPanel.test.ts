/**
 * Tests for useLayoutPanel property-aware parsing
 */
import { describe, it, expect } from 'vitest'
import { parseLineProperties } from '../../hooks/useLayoutPanel'

describe('parseLineProperties', () => {
  describe('dimension shorthand', () => {
    it('should parse single dimension shorthand (width)', () => {
      const result = parseLineProperties('Box 300')
      expect(result.componentName).toBe('Box')
      expect(result.dimensionShorthand.width).toBe(300)
      expect(result.dimensionShorthand.height).toBeUndefined()
      expect(result.layoutCode).toBe('w 300')
    })

    it('should parse two dimension shorthand (width, height)', () => {
      const result = parseLineProperties('Box 300 400')
      expect(result.componentName).toBe('Box')
      expect(result.dimensionShorthand.width).toBe(300)
      expect(result.dimensionShorthand.height).toBe(400)
      expect(result.layoutCode).toBe('w 300, h 400')
    })

    it('should parse dimension shorthand with direction', () => {
      const result = parseLineProperties('Box 300 400 ver')
      expect(result.componentName).toBe('Box')
      expect(result.dimensionShorthand.width).toBe(300)
      expect(result.dimensionShorthand.height).toBe(400)
      expect(result.layoutProperties).toContainEqual(
        expect.objectContaining({ key: 'ver' })
      )
    })

    it('should parse dimension shorthand with commas', () => {
      const result = parseLineProperties('Box 300, 400, ver')
      expect(result.dimensionShorthand.width).toBe(300)
      expect(result.dimensionShorthand.height).toBe(400)
    })

    it('should parse percentage dimensions', () => {
      const result = parseLineProperties('Box 50% 100%')
      expect(result.dimensionShorthand.width).toBe(50)
      expect(result.dimensionShorthand.height).toBe(100)
    })
  })

  describe('layout vs non-layout separation', () => {
    it('should separate layout properties from non-layout', () => {
      const result = parseLineProperties('rect 300 400 ver')
      expect(result.componentName).toBe('rect')
      expect(result.layoutCode).toContain('w 300')
      expect(result.layoutCode).toContain('h 400')
      expect(result.layoutCode).toContain('ver')
    })

    it('should handle mixed properties', () => {
      // bg is classified as layout property (handled by layout panel)
      const result = parseLineProperties('Box ver, bg #FF0000, gap 8, rad 4')
      expect(result.layoutProperties.map(p => p.key)).toContain('ver')
      expect(result.layoutProperties.map(p => p.key)).toContain('gap')
      expect(result.layoutProperties.map(p => p.key)).toContain('bg')
      expect(result.nonLayoutProperties.map(p => p.key)).toContain('rad')
    })

    it('should include bg in layout properties', () => {
      // bg is handled by the layout panel, so it's a layout property
      const result = parseLineProperties('Card bg #3B82F6, pad 16')
      expect(result.layoutCode).toContain('bg #3B82F6')
      expect(result.layoutCode).toContain('pad 16')
    })

    it('should handle text color as typography', () => {
      const result = parseLineProperties('Text col #FFFFFF, ver')
      // col is a typography property
      expect(result.layoutCode).toContain('ver')
      expect(result.typographyCode).toContain('col #FFFFFF')
    })

    it('should preserve border properties', () => {
      const result = parseLineProperties('Box bor 1 #333, pad 8')
      expect(result.preservedCode).toBe('bor 1 #333')
      expect(result.layoutCode).toBe('pad 8')
    })

    it('should preserve radius', () => {
      const result = parseLineProperties('Button rad 8, hor, g 4')
      expect(result.preservedCode).toBe('rad 8')
      expect(result.layoutCode).toContain('hor')
      expect(result.layoutCode).toContain('g 4')
    })
  })

  describe('component definitions', () => {
    it('should handle component definitions (with colon)', () => {
      const result = parseLineProperties('Button: pad 12, bg #3B82F6')
      expect(result.componentName).toBe('Button')
      // Both pad and bg are layout properties
      expect(result.layoutCode).toContain('pad 12')
      expect(result.layoutCode).toContain('bg #3B82F6')
    })
  })

  describe('complex cases', () => {
    it('should handle full complex line', () => {
      const result = parseLineProperties('Card 400, ver, g 16, bg #1A1A1A, pad 24, rad 8, shadow md')
      expect(result.componentName).toBe('Card')
      expect(result.dimensionShorthand.width).toBe(400)
      // bg is a layout property (handled by layout panel)
      expect(result.layoutProperties.map(p => p.key)).toContain('ver')
      expect(result.layoutProperties.map(p => p.key)).toContain('g')
      expect(result.layoutProperties.map(p => p.key)).toContain('pad')
      expect(result.layoutProperties.map(p => p.key)).toContain('bg')
      // rad and shadow are non-layout
      expect(result.nonLayoutProperties.map(p => p.key)).toContain('rad')
      expect(result.nonLayoutProperties.map(p => p.key)).toContain('shadow')
    })

    it('should handle strings (stored in stringContent)', () => {
      const result = parseLineProperties('Button "Click me", pad 8')
      expect(result.layoutCode).toBe('pad 8')
      // Strings go to stringContent, not preservedCode
      expect(result.stringContent).toBe('"Click me"')
    })

    it('should handle indented lines', () => {
      const result = parseLineProperties('  Box ver, pad 16')
      expect(result.componentName).toBe('Box')
      expect(result.layoutCode).toBe('ver, pad 16')
    })
  })

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = parseLineProperties('')
      expect(result.componentName).toBe('')
      expect(result.layoutCode).toBe('')
      expect(result.preservedCode).toBe('')
    })

    it('should handle component only', () => {
      const result = parseLineProperties('Box')
      expect(result.componentName).toBe('Box')
      expect(result.layoutCode).toBe('')
      expect(result.preservedCode).toBe('')
    })

    it('should handle w-min and w-max as layout', () => {
      const result = parseLineProperties('Box w-min, h-max')
      expect(result.layoutCode).toBe('w-min, h-max')
    })

    it('should handle between property', () => {
      const result = parseLineProperties('Row hor, between')
      expect(result.layoutProperties.map(p => p.key)).toContain('between')
    })

    it('should handle stacked', () => {
      const result = parseLineProperties('Container stacked')
      expect(result.layoutProperties.map(p => p.key)).toContain('stacked')
    })
  })
})
