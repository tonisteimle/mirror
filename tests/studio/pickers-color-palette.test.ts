/**
 * Tests for studio/pickers/color/palette.ts
 *
 * Pure functions: color-format conversions (hex/RGB/HSL/HSV) + palette
 * data + contrast check. Module was 0% covered.
 *
 * The palette CONSTANTS (GRAYS, COLORS, OPEN_COLORS, TAILWIND_COLORS,
 * QUICK_COLORS, ALL_PALETTES) are data; we sanity-check shape.
 *
 * The functions (hex↔HSL, hex↔RGB, RGB↔HSV, hex↔HSV, parseColor,
 * isLightColor, generateShades) are tested with known fixtures.
 */

import { describe, it, expect } from 'vitest'
import {
  GRAYS,
  COLORS,
  QUICK_COLORS,
  OPEN_COLORS,
  TAILWIND_COLORS,
  DEFAULT_PALETTES,
  OPEN_COLOR_PALETTE,
  TAILWIND_PALETTE,
  MATERIAL_PALETTE,
  ALL_PALETTES,
  generateShades,
  hexToHSL,
  hslToHex,
  parseColor,
  isLightColor,
  hsvToRgb,
  rgbToHsv,
  hexToRgb,
  rgbToHex,
  hexToHsv,
  hsvToHex,
} from '../../studio/pickers/color/palette'

// =============================================================================
// Palette data
// =============================================================================

describe('palette constants — shape', () => {
  it('GRAYS has 12 entries from #000000 to #ffffff', () => {
    expect(GRAYS).toHaveLength(12)
    expect(GRAYS[0]).toBe('#000000')
    expect(GRAYS[GRAYS.length - 1]).toBe('#ffffff')
  })

  it('COLORS, OPEN_COLORS, TAILWIND_COLORS are arrays of arrays of hex strings', () => {
    for (const palette of [COLORS, OPEN_COLORS, TAILWIND_COLORS]) {
      expect(Array.isArray(palette)).toBe(true)
      expect(palette.length).toBeGreaterThan(0)
      for (const row of palette) {
        expect(row.length).toBeGreaterThan(0)
        for (const c of row) {
          expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
        }
      }
    }
  })

  it('QUICK_COLORS contains 18 hex entries', () => {
    expect(QUICK_COLORS).toHaveLength(18)
    for (const c of QUICK_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('DEFAULT_PALETTES is an array of named palettes with non-empty colors', () => {
    expect(Array.isArray(DEFAULT_PALETTES)).toBe(true)
    for (const p of DEFAULT_PALETTES) {
      expect(typeof p.name).toBe('string')
      expect(p.name.length).toBeGreaterThan(0)
      expect(Array.isArray(p.colors)).toBe(true)
      expect(p.colors.length).toBeGreaterThan(0)
    }
  })

  it('OPEN_COLOR_PALETTE / TAILWIND_PALETTE / MATERIAL_PALETTE are individual ColorPalettes', () => {
    expect(OPEN_COLOR_PALETTE.name).toBeTruthy()
    expect(TAILWIND_PALETTE.name).toBeTruthy()
    expect(MATERIAL_PALETTE.name).toBeTruthy()
  })

  it('ALL_PALETTES contains the three named palettes', () => {
    expect(ALL_PALETTES.length).toBeGreaterThanOrEqual(3)
    const names = ALL_PALETTES.map(p => p.name)
    expect(names).toContain(OPEN_COLOR_PALETTE.name)
    expect(names).toContain(TAILWIND_PALETTE.name)
    expect(names).toContain(MATERIAL_PALETTE.name)
  })
})

// =============================================================================
// hexToHSL / hslToHex — round-trip
// =============================================================================

describe('hexToHSL', () => {
  it('returns {0, 0, 0} for malformed input', () => {
    expect(hexToHSL('not-a-color')).toEqual({ h: 0, s: 0, l: 0 })
  })

  it('converts known fixtures correctly', () => {
    // Pure red: H=0, S=100, L=50
    const red = hexToHSL('#ff0000')
    expect(red.h).toBe(0)
    expect(red.s).toBe(100)
    expect(red.l).toBe(50)
  })

  it('handles pure white (l=100)', () => {
    expect(hexToHSL('#ffffff').l).toBe(100)
  })

  it('handles pure black (l=0)', () => {
    expect(hexToHSL('#000000').l).toBe(0)
  })

  it('handles short-hex form via the hex prefix', () => {
    // Note: regex requires 6-digit hex, so '#fff' returns {0,0,0}
    expect(hexToHSL('#fff')).toEqual({ h: 0, s: 0, l: 0 })
  })

  it('matches both with-and-without leading "#"', () => {
    const a = hexToHSL('#3498db')
    const b = hexToHSL('3498db')
    expect(a).toEqual(b)
  })
})

describe('hslToHex', () => {
  it('produces #ff0000 for (0, 100, 50)', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
  })

  it('produces #ffffff for (any, 0, 100)', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff')
  })

  it('produces #000000 for (any, 0, 0)', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000')
  })

  it('round-trips with hexToHSL on a sample of saturated colors', () => {
    const samples = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6']
    for (const hex of samples) {
      const { h, s, l } = hexToHSL(hex)
      const out = hslToHex(h, s, l)
      // Allow ±1 per channel due to integer rounding in HSL.
      const a = parseInt(hex.slice(1, 3), 16)
      const b = parseInt(out.slice(1, 3), 16)
      expect(Math.abs(a - b)).toBeLessThanOrEqual(2)
    }
  })

  it('handles green (h=120) hue branch', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00')
  })

  it('handles blue (h=240) hue branch', () => {
    expect(hslToHex(240, 100, 50)).toBe('#0000ff')
  })

  it('handles cyan (h=180), magenta (h=300), yellow (h=60)', () => {
    expect(hslToHex(60, 100, 50)).toBe('#ffff00')
    expect(hslToHex(180, 100, 50)).toBe('#00ffff')
    expect(hslToHex(300, 100, 50)).toBe('#ff00ff')
  })
})

// =============================================================================
// generateShades
// =============================================================================

describe('generateShades', () => {
  it('returns the requested count of shades', () => {
    expect(generateShades('#3498db', 5)).toHaveLength(5)
    expect(generateShades('#3498db', 12)).toHaveLength(12)
  })

  it('default count is 10', () => {
    expect(generateShades('#3498db')).toHaveLength(10)
  })

  it('first shade is the lightest (l ≈ 95), last is darkest (l ≈ 5)', () => {
    const shades = generateShades('#3498db', 10)
    const first = hexToHSL(shades[0])
    const last = hexToHSL(shades[shades.length - 1])
    expect(first.l).toBeGreaterThan(last.l)
    expect(first.l).toBeGreaterThan(80)
    expect(last.l).toBeLessThan(20)
  })

  it('all shares share the base hue', () => {
    const baseHue = hexToHSL('#3498db').h
    const shades = generateShades('#3498db', 10)
    for (const s of shades) {
      // Some loss at extreme lightness — accept ±5°.
      const h = hexToHSL(s).h
      expect(Math.abs(h - baseHue)).toBeLessThanOrEqual(5)
    }
  })
})

// =============================================================================
// parseColor
// =============================================================================

describe('parseColor', () => {
  it('returns 6-digit hex unchanged but uppercased', () => {
    expect(parseColor('#abcdef')).toBe('#ABCDEF')
    expect(parseColor('#ABCDEF')).toBe('#ABCDEF')
  })

  it('expands 3-digit hex to 6-digit, uppercased', () => {
    expect(parseColor('#fff')).toBe('#FFFFFF')
    expect(parseColor('#a1b')).toBe('#AA11BB')
  })

  it('parses rgb(r, g, b) into hex', () => {
    expect(parseColor('rgb(255, 0, 0)')).toBe('#FF0000')
    expect(parseColor('rgb(0, 128, 255)')).toBe('#0080FF')
  })

  it('returns null for unrecognized formats', () => {
    expect(parseColor('blue')).toBeNull()
    expect(parseColor('rgba(0,0,0,0.5)')).toBeNull()
    expect(parseColor('hsl(0, 100%, 50%)')).toBeNull()
    expect(parseColor('')).toBeNull()
    expect(parseColor('#xyz')).toBeNull()
  })
})

// =============================================================================
// isLightColor
// =============================================================================

describe('isLightColor', () => {
  it('returns true for lightness > 50', () => {
    expect(isLightColor('#ffffff')).toBe(true) // l=100
    expect(isLightColor('#cccccc')).toBe(true) // l=80
  })

  it('returns false for lightness <= 50', () => {
    expect(isLightColor('#000000')).toBe(false) // l=0
    expect(isLightColor('#808080')).toBe(false) // l=50 — boundary
    expect(isLightColor('#333333')).toBe(false)
  })

  it('returns false for malformed (lightness=0 fallback)', () => {
    expect(isLightColor('not-a-color')).toBe(false)
  })
})

// =============================================================================
// hexToRgb / rgbToHex — round-trip
// =============================================================================

describe('hexToRgb / rgbToHex', () => {
  it('hexToRgb on 6-digit hex', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('hexToRgb expands 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#a0c')).toEqual({ r: 170, g: 0, b: 204 })
  })

  it('hexToRgb works without leading #', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('rgbToHex pads single-digit channels with 0', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(15, 15, 15)).toBe('#0F0F0F')
  })

  it('rgbToHex uppercases', () => {
    expect(rgbToHex(170, 0, 204)).toBe('#AA00CC')
  })

  it('round-trips for all primary + secondary colors', () => {
    const samples = [
      [0, 0, 0],
      [255, 255, 255],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
      [128, 64, 32],
    ]
    for (const [r, g, b] of samples) {
      const hex = rgbToHex(r, g, b)
      expect(hexToRgb(hex)).toEqual({ r, g, b })
    }
  })
})

// =============================================================================
// hsvToRgb / rgbToHsv — round-trip + hue branches
// =============================================================================

describe('hsvToRgb', () => {
  it('produces pure red for (0, 100, 100)', () => {
    expect(hsvToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('produces pure green for (120, 100, 100)', () => {
    expect(hsvToRgb(120, 100, 100)).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('produces pure blue for (240, 100, 100)', () => {
    expect(hsvToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('produces white for (any, 0, 100)', () => {
    expect(hsvToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('produces black for (any, any, 0)', () => {
    expect(hsvToRgb(0, 100, 0)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('handles all 6 hue sectors (60° intervals)', () => {
    expect(hsvToRgb(60, 100, 100)).toEqual({ r: 255, g: 255, b: 0 }) // yellow
    expect(hsvToRgb(180, 100, 100)).toEqual({ r: 0, g: 255, b: 255 }) // cyan
    expect(hsvToRgb(300, 100, 100)).toEqual({ r: 255, g: 0, b: 255 }) // magenta
  })
})

describe('rgbToHsv', () => {
  it('pure red → h=0, s=100, v=100', () => {
    const { h, s, v } = rgbToHsv(255, 0, 0)
    expect(h).toBe(0)
    expect(s).toBe(100)
    expect(v).toBe(100)
  })

  it('pure green → h=120', () => {
    expect(rgbToHsv(0, 255, 0).h).toBeCloseTo(120)
  })

  it('pure blue → h=240', () => {
    expect(rgbToHsv(0, 0, 255).h).toBeCloseTo(240)
  })

  it('black → s=0, v=0 (h indeterminate, defaults 0)', () => {
    const { h, s, v } = rgbToHsv(0, 0, 0)
    expect(s).toBe(0)
    expect(v).toBe(0)
    expect(h).toBe(0)
  })

  it('white → s=0, v=100', () => {
    const { s, v } = rgbToHsv(255, 255, 255)
    expect(s).toBe(0)
    expect(v).toBe(100)
  })
})

describe('hexToHsv / hsvToHex — round-trip', () => {
  it('round-trips for pure colors', () => {
    const samples = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']
    for (const hex of samples) {
      const { h, s, v } = hexToHsv(hex)
      const back = hsvToHex(h, s, v)
      expect(back.toLowerCase()).toBe(hex.toLowerCase())
    }
  })

  it('round-trips lossy for arbitrary colors with ±2 channel tolerance', () => {
    const samples = ['#3498db', '#e74c3c', '#2ecc71']
    for (const hex of samples) {
      const { h, s, v } = hexToHsv(hex)
      const back = hsvToHex(h, s, v)
      // Compare per-channel
      for (let i = 0; i < 3; i++) {
        const a = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
        const b = parseInt(back.slice(1 + i * 2, 3 + i * 2), 16)
        expect(Math.abs(a - b)).toBeLessThanOrEqual(2)
      }
    }
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: parseColor expands 3-digit by repeating the channel (NOT zero-padding)', () => {
    // #fff expands to #FFFFFF — catches mutation that pads instead of repeats.
    expect(parseColor('#fff')).toBe('#FFFFFF')
    expect(parseColor('#a1b')).toBe('#AA11BB')
  })

  it('M2: rgbToHex pads each channel to 2 chars (low values get leading 0)', () => {
    // r=15 → '0f' not 'f' — catches a mutation that drops padStart.
    expect(rgbToHex(15, 15, 15)).toBe('#0F0F0F')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('M3: isLightColor uses STRICT > 50 (NOT >= 50)', () => {
    // l=50 must return false. This catches the >=/> mutation.
    expect(isLightColor('#808080')).toBe(false) // hex with computed l ≈ 50
  })
})
