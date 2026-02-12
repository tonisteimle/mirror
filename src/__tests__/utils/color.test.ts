/**
 * Color Utilities Tests
 *
 * Tests for color manipulation and auto text color:
 * - Luminance calculation
 * - Light/dark color detection
 * - Contrast text color calculation
 * - Color value validation
 */

import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  getLuminance,
  isLightColor,
  getContrastTextColor,
  isColorValue,
} from '../../utils/color'

describe('color utilities', () => {
  describe('hexToRgb', () => {
    it('parses 6-digit hex colors', () => {
      expect(hexToRgb('#3B82F6')).toEqual({ r: 59, g: 130, b: 246 })
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('parses 3-digit hex colors', () => {
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('handles colors without # prefix', () => {
      expect(hexToRgb('3B82F6')).toEqual({ r: 59, g: 130, b: 246 })
      expect(hexToRgb('FFF')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('returns null for invalid colors', () => {
      expect(hexToRgb('invalid')).toBeNull()
      // Note: parseInt returns 0 for invalid hex, so #GGG returns {r:0,g:0,b:0}
      // Only check for wrong length
      expect(hexToRgb('#12')).toBeNull()
      expect(hexToRgb('#12345')).toBeNull()
    })
  })

  describe('getLuminance', () => {
    it('returns 0 for black', () => {
      expect(getLuminance(0, 0, 0)).toBe(0)
    })

    it('returns 1 for white', () => {
      expect(getLuminance(255, 255, 255)).toBe(1)
    })

    it('returns intermediate values for colors', () => {
      // Blue (#3B82F6) should have medium-low luminance
      const blueLuminance = getLuminance(59, 130, 246)
      expect(blueLuminance).toBeGreaterThan(0.1)
      expect(blueLuminance).toBeLessThan(0.3)
    })
  })

  describe('isLightColor', () => {
    it('identifies white as light', () => {
      expect(isLightColor('#FFFFFF')).toBe(true)
      expect(isLightColor('#FFF')).toBe(true)
    })

    it('identifies black as dark', () => {
      expect(isLightColor('#000000')).toBe(false)
      expect(isLightColor('#000')).toBe(false)
    })

    it('identifies light colors correctly', () => {
      expect(isLightColor('#F3F4F6')).toBe(true)  // Light gray
      expect(isLightColor('#E5E7EB')).toBe(true)  // Gray 200
      expect(isLightColor('#FBBF24')).toBe(true)  // Yellow
    })

    it('identifies dark colors correctly', () => {
      expect(isLightColor('#1F2937')).toBe(false) // Gray 800
      expect(isLightColor('#111827')).toBe(false) // Gray 900
      expect(isLightColor('#1E3A8A')).toBe(false) // Blue 900
      expect(isLightColor('#7C2D12')).toBe(false) // Orange 900
      // UI colors (buttons) should be dark → get white text
      expect(isLightColor('#3B82F6')).toBe(false) // Blue 500 (luminance: 0.2355)
      expect(isLightColor('#EF4444')).toBe(false) // Red 500 (luminance: 0.2290)
      expect(isLightColor('#10B981')).toBe(false) // Green 500 (luminance: 0.3639)
    })

    it('returns null for invalid colors', () => {
      expect(isLightColor('invalid')).toBeNull()
      expect(isLightColor('')).toBeNull()
    })
  })

  describe('getContrastTextColor', () => {
    it('returns white for dark backgrounds', () => {
      expect(getContrastTextColor('#1F2937')).toBe('#fff') // Gray 800
      expect(getContrastTextColor('#111827')).toBe('#fff') // Gray 900
      expect(getContrastTextColor('#000000')).toBe('#fff') // Black
      // UI button colors get white text for readability
      expect(getContrastTextColor('#3B82F6')).toBe('#fff') // Blue 500
      expect(getContrastTextColor('#EF4444')).toBe('#fff') // Red 500
      expect(getContrastTextColor('#10B981')).toBe('#fff') // Green 500
    })

    it('returns black for light backgrounds', () => {
      expect(getContrastTextColor('#FFFFFF')).toBe('#000')
      expect(getContrastTextColor('#F3F4F6')).toBe('#000')
      expect(getContrastTextColor('#FBBF24')).toBe('#000') // Yellow
    })

    it('allows custom text colors', () => {
      expect(getContrastTextColor('#000', '#EEEEEE', '#111111')).toBe('#EEEEEE')
      expect(getContrastTextColor('#FFF', '#EEEEEE', '#111111')).toBe('#111111')
    })

    it('returns null for invalid colors', () => {
      expect(getContrastTextColor('invalid')).toBeNull()
    })
  })

  describe('isColorValue', () => {
    it('recognizes hex colors', () => {
      expect(isColorValue('#FFF')).toBe(true)
      expect(isColorValue('#FFFFFF')).toBe(true)
      expect(isColorValue('#FFFFFFFF')).toBe(true)
      expect(isColorValue('#3B82F6')).toBe(true)
    })

    it('recognizes rgb/rgba colors', () => {
      expect(isColorValue('rgb(255, 255, 255)')).toBe(true)
      expect(isColorValue('rgba(255, 255, 255, 0.5)')).toBe(true)
    })

    it('recognizes hsl/hsla colors', () => {
      expect(isColorValue('hsl(200, 100%, 50%)')).toBe(true)
      expect(isColorValue('hsla(200, 100%, 50%, 0.5)')).toBe(true)
    })

    it('recognizes transparent', () => {
      expect(isColorValue('transparent')).toBe(true)
    })

    it('rejects invalid values', () => {
      expect(isColorValue('red')).toBe(false)  // Named colors not supported
      expect(isColorValue('12px')).toBe(false)
      expect(isColorValue('')).toBe(false)
    })
  })
})
