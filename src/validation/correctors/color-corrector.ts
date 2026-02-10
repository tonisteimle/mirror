/**
 * Color validation and correction
 */

import type { Correction, TabType } from '../types'

// Named CSS colors to hex
const NAMED_COLORS: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  gray: '#808080',
  grey: '#808080',
  orange: '#FFA500',
  pink: '#FFC0CB',
  purple: '#800080',
  brown: '#A52A2A',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  silver: '#C0C0C0',
  gold: '#FFD700',
  coral: '#FF7F50',
  salmon: '#FA8072',
  tomato: '#FF6347',
  crimson: '#DC143C',
  indigo: '#4B0082',
  violet: '#EE82EE',
  turquoise: '#40E0D0',
  tan: '#D2B48C',
  khaki: '#F0E68C',
  beige: '#F5F5DC',
  ivory: '#FFFFF0',
  lavender: '#E6E6FA',
  plum: '#DDA0DD',
  orchid: '#DA70D6',
  transparent: 'transparent',
}

export interface ColorCorrectionResult {
  original: string
  corrected: string | null
  isValid: boolean
  confidence: number
  reason: string
}

/**
 * Validate a hex color
 */
function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)
}

/**
 * Normalize a hex color
 */
function normalizeHex(color: string): string {
  let hex = color.toUpperCase()

  // Add # if missing
  if (!hex.startsWith('#')) {
    hex = '#' + hex
  }

  // Expand shorthand
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }

  return hex
}

/**
 * Try to parse rgb/rgba format
 */
function parseRgb(color: string): string | null {
  // rgb(255, 255, 255) or rgba(255, 255, 255, 1)
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toUpperCase()
  }
  return null
}

/**
 * Try to parse hsl format
 */
function parseHsl(color: string): string | null {
  const hslMatch = color.match(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?(?:\s*,\s*[\d.]+)?\s*\)/)
  if (hslMatch) {
    const h = parseInt(hslMatch[1])
    const s = parseInt(hslMatch[2]) / 100
    const l = parseInt(hslMatch[3]) / 100

    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
  }
  return null
}

/**
 * Correct a color value
 */
export function correctColor(value: string): ColorCorrectionResult {
  const original = value.trim()
  const lower = original.toLowerCase()

  // Already valid hex
  if (isValidHex(original)) {
    const normalized = normalizeHex(original)
    return {
      original,
      corrected: normalized,
      isValid: true,
      confidence: normalized === original ? 1 : 0.98,
      reason: 'Valid hex color'
    }
  }

  // Named color
  if (NAMED_COLORS[lower]) {
    return {
      original,
      corrected: NAMED_COLORS[lower],
      isValid: true,
      confidence: 0.95,
      reason: `Named color "${original}" converted to hex`
    }
  }

  // Hex without #
  if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{8}$/.test(original)) {
    const normalized = normalizeHex(original)
    return {
      original,
      corrected: normalized,
      isValid: true,
      confidence: 0.95,
      reason: 'Added missing # to hex color'
    }
  }

  // RGB format
  const rgb = parseRgb(original)
  if (rgb) {
    return {
      original,
      corrected: rgb,
      isValid: true,
      confidence: 0.9,
      reason: 'Converted RGB to hex'
    }
  }

  // HSL format
  const hsl = parseHsl(original)
  if (hsl) {
    return {
      original,
      corrected: hsl,
      isValid: true,
      confidence: 0.85,
      reason: 'Converted HSL to hex'
    }
  }

  // Invalid - return default
  return {
    original,
    corrected: '#000000',
    isValid: false,
    confidence: 0.3,
    reason: `Invalid color "${original}", using default black`
  }
}

/**
 * Check if a value looks like a color
 */
export function looksLikeColor(value: string): boolean {
  const v = value.trim().toLowerCase()
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    NAMED_COLORS[v] !== undefined ||
    /^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(v)
  )
}

/**
 * Create a correction for a color
 */
export function createColorCorrection(
  original: string,
  corrected: string,
  lineNumber: number,
  tab: TabType,
  confidence: number
): Correction {
  return {
    tab,
    line: lineNumber,
    original,
    corrected,
    reason: `Color "${original}" corrected to "${corrected}"`,
    confidence
  }
}
