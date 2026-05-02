/**
 * studio/pickers/color/palette — HSV/RGB/Hex conversions
 *
 * Color-math primitives feeding the Canvas-based picker. Untested
 * before; subtle bugs here distort every color the user picks.
 */

import { describe, it, expect } from 'vitest'
import {
  hsvToRgb,
  rgbToHsv,
  hexToRgb,
  rgbToHex,
  hexToHsv,
  hsvToHex,
} from '../../studio/pickers/color/palette'

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('expands 3-digit hex to 6-digit equivalent', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 })
  })

  it('accepts hex without leading #', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('parses black and white', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('rgbToHex', () => {
  it('formats RGB into 6-digit upper-case hex with leading #', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#FF0000')
    expect(rgbToHex(0, 255, 0)).toBe('#00FF00')
    expect(rgbToHex(0, 0, 255)).toBe('#0000FF')
  })

  it('zero-pads single-digit values', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203')
  })

  it('handles black and white', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF')
  })
})

describe('hsvToRgb', () => {
  it('returns black for v=0 regardless of h/s', () => {
    expect(hsvToRgb(0, 100, 0)).toEqual({ r: 0, g: 0, b: 0 })
    expect(hsvToRgb(180, 100, 0)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('returns white for s=0 v=100', () => {
    expect(hsvToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 })
    expect(hsvToRgb(120, 0, 100)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('produces saturated primaries at full saturation/value', () => {
    expect(hsvToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 }) // red
    expect(hsvToRgb(120, 100, 100)).toEqual({ r: 0, g: 255, b: 0 }) // green
    expect(hsvToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 }) // blue
  })

  it('produces secondaries at the right hues', () => {
    expect(hsvToRgb(60, 100, 100)).toEqual({ r: 255, g: 255, b: 0 }) // yellow
    expect(hsvToRgb(180, 100, 100)).toEqual({ r: 0, g: 255, b: 255 }) // cyan
    expect(hsvToRgb(300, 100, 100)).toEqual({ r: 255, g: 0, b: 255 }) // magenta
  })

  it('produces a mid-gray for s=0 v=50', () => {
    const { r, g, b } = hsvToRgb(0, 0, 50)
    expect(r).toBe(128)
    expect(g).toBe(128)
    expect(b).toBe(128)
  })
})

describe('rgbToHsv', () => {
  it('returns h=0,s=0 for any pure gray', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 })
    expect(rgbToHsv(128, 128, 128)).toMatchObject({ h: 0, s: 0 })
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 100 })
  })

  it('returns h=0 for red', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 })
  })

  it('returns h=120 for green and h=240 for blue', () => {
    expect(rgbToHsv(0, 255, 0)).toMatchObject({ h: 120, s: 100, v: 100 })
    expect(rgbToHsv(0, 0, 255)).toMatchObject({ h: 240, s: 100, v: 100 })
  })

  it('round-trips primaries through hsvToRgb', () => {
    for (const [r, g, b] of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
    ]) {
      const hsv = rgbToHsv(r, g, b)
      const back = hsvToRgb(hsv.h, hsv.s, hsv.v)
      expect(back).toEqual({ r, g, b })
    }
  })
})

describe('hexToHsv / hsvToHex', () => {
  it('hexToHsv decomposes hex into HSV', () => {
    expect(hexToHsv('#ff0000')).toMatchObject({ h: 0, s: 100, v: 100 })
    expect(hexToHsv('#000000')).toMatchObject({ h: 0, s: 0, v: 0 })
    expect(hexToHsv('#ffffff')).toMatchObject({ h: 0, s: 0, v: 100 })
  })

  it('hsvToHex round-trips primaries', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000')
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00')
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF')
  })

  it('hsvToHex(hex→HSV→hex) round-trips for arbitrary samples', () => {
    const samples = ['#2271C1', '#10b981', '#f59e0b', '#7C3AED', '#1F2937']
    for (const hex of samples) {
      const hsv = hexToHsv(hex)
      const back = hsvToHex(hsv.h, hsv.s, hsv.v)
      // toUpperCase to compare against hsvToHex's upper-case output
      expect(back).toBe(hex.toUpperCase())
    }
  })

  it('handles 3-digit hex through hexToHsv', () => {
    expect(hexToHsv('#f00')).toMatchObject({ h: 0, s: 100, v: 100 })
  })
})
