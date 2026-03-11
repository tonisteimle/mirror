/**
 * Color Palette Utilities Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  parseColor,
  hexToHSL,
  hslToHex,
  generateShades,
  isLightColor,
  GRAYS,
  COLORS,
} from '../palette'

describe('Color Palette Utilities', () => {
  describe('parseColor', () => {
    it('should parse 3-digit hex', () => {
      const result = parseColor('#f00')
      expect(result).toBe('#FF0000')
    })

    it('should parse 6-digit hex', () => {
      const result = parseColor('#ff0000')
      expect(result).toBe('#FF0000')
    })

    it('should normalize to uppercase', () => {
      const result = parseColor('#ff00ff')
      expect(result).toBe('#FF00FF')
    })

    it('should return null for missing hash', () => {
      // Implementation requires # prefix
      const result = parseColor('ff0000')
      expect(result).toBeNull()
    })

    it('should return null for invalid colors', () => {
      expect(parseColor('invalid')).toBeNull()
      expect(parseColor('#gg0000')).toBeNull()
      expect(parseColor('')).toBeNull()
    })
  })

  describe('hexToHSL', () => {
    it('should convert black to HSL(0,0,0)', () => {
      const result = hexToHSL('#000000')
      expect(result.h).toBe(0)
      expect(result.s).toBe(0)
      expect(result.l).toBe(0)
    })

    it('should convert white to HSL(0,0,100)', () => {
      const result = hexToHSL('#ffffff')
      expect(result.h).toBe(0)
      expect(result.s).toBe(0)
      expect(result.l).toBe(100)
    })

    it('should convert red to HSL(0,100,50)', () => {
      const result = hexToHSL('#ff0000')
      expect(result.h).toBe(0)
      expect(result.s).toBe(100)
      expect(result.l).toBe(50)
    })

    it('should convert green to HSL(120,100,50)', () => {
      const result = hexToHSL('#00ff00')
      expect(result.h).toBe(120)
      expect(result.s).toBe(100)
      expect(result.l).toBe(50)
    })

    it('should convert blue to HSL(240,100,50)', () => {
      const result = hexToHSL('#0000ff')
      expect(result.h).toBe(240)
      expect(result.s).toBe(100)
      expect(result.l).toBe(50)
    })

    it('should handle gray colors', () => {
      const result = hexToHSL('#808080')
      expect(result.h).toBe(0)
      expect(result.s).toBe(0)
      expect(result.l).toBeCloseTo(50, 0)
    })
  })

  describe('hslToHex', () => {
    it('should convert HSL to hex', () => {
      expect(hslToHex(0, 100, 50)).toBe('#ff0000') // Red
      expect(hslToHex(120, 100, 50)).toBe('#00ff00') // Green
      expect(hslToHex(240, 100, 50)).toBe('#0000ff') // Blue
    })

    it('should handle black and white', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000')
      expect(hslToHex(0, 0, 100)).toBe('#ffffff')
    })

    it('should handle gray', () => {
      const result = hslToHex(0, 0, 50)
      expect(result).toBe('#808080')
    })

    it('should round trip correctly', () => {
      const testColors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff']

      for (const hex of testColors) {
        const hsl = hexToHSL(hex)
        const result = hslToHex(hsl.h, hsl.s, hsl.l)
        expect(result.toLowerCase()).toBe(hex.toLowerCase())
      }
    })
  })

  describe('generateShades', () => {
    it('should generate 10 shades by default', () => {
      const shades = generateShades('#3b82f6')
      expect(shades).toHaveLength(10)
    })

    it('should generate custom count of shades', () => {
      const shades = generateShades('#3b82f6', 5)
      expect(shades).toHaveLength(5)
    })

    it('should have lighter variants first', () => {
      const shades = generateShades('#3b82f6')
      const firstHSL = hexToHSL(shades[0])
      const middleHSL = hexToHSL(shades[4])

      expect(firstHSL.l).toBeGreaterThan(middleHSL.l)
    })

    it('should have darker variants last', () => {
      const shades = generateShades('#3b82f6')
      const lastHSL = hexToHSL(shades[9])
      const middleHSL = hexToHSL(shades[4])

      expect(lastHSL.l).toBeLessThan(middleHSL.l)
    })
  })

  describe('isLightColor', () => {
    it('should return true for light colors', () => {
      expect(isLightColor('#ffffff')).toBe(true)
      expect(isLightColor('#f0f0f0')).toBe(true)
    })

    it('should return false for dark colors', () => {
      expect(isLightColor('#000000')).toBe(false)
      expect(isLightColor('#1a1a1a')).toBe(false)
      expect(isLightColor('#0000ff')).toBe(false) // Blue (l=50, not > 50)
    })

    it('should handle yellow (l=50 is not light)', () => {
      // Yellow has luminance of exactly 50, which is NOT > 50
      expect(isLightColor('#ffff00')).toBe(false)
    })

    it('should handle edge cases', () => {
      // Gray midpoint - l=50 is NOT > 50, so false
      const midGray = isLightColor('#808080')
      expect(midGray).toBe(false)
    })
  })

  describe('GRAYS constant', () => {
    it('should contain gray scale colors', () => {
      expect(GRAYS).toBeDefined()
      expect(Array.isArray(GRAYS)).toBe(true)
      expect(GRAYS.length).toBeGreaterThan(0)
    })

    it('should start with dark and end with light', () => {
      // Implementation: GRAYS starts with #000000 (black)
      const firstHSL = hexToHSL(GRAYS[0])
      const lastHSL = hexToHSL(GRAYS[GRAYS.length - 1])

      // First should be darker than last
      expect(firstHSL.l).toBeLessThan(lastHSL.l)
    })

    it('should all be grayscale (low saturation)', () => {
      for (const gray of GRAYS) {
        const hsl = hexToHSL(gray)
        expect(hsl.s).toBeLessThanOrEqual(5) // Allow small variance
      }
    })
  })

  describe('COLORS constant', () => {
    it('should contain color palette as 2D array', () => {
      expect(COLORS).toBeDefined()
      expect(Array.isArray(COLORS)).toBe(true)
      expect(COLORS.length).toBeGreaterThan(0)
      // Each row is an array of shades
      expect(Array.isArray(COLORS[0])).toBe(true)
    })

    it('should contain valid hex colors', () => {
      for (const row of COLORS) {
        for (const color of row) {
          expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
        }
      }
    })

    it('should have saturated colors (not grayscale)', () => {
      // Flatten and check at least some colors are saturated
      const allColors = COLORS.flat()
      const saturatedColors = allColors.filter(color => {
        const hsl = hexToHSL(color)
        return hsl.s > 20
      })

      expect(saturatedColors.length).toBeGreaterThan(allColors.length / 2)
    })
  })
})
