/**
 * Color Utility Functions
 *
 * Transforms colors for auto-generated theme variants.
 */

// ============================================================================
// Types
// ============================================================================

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Handle short hex (#fff)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  if (hex.length !== 6) return null

  const num = parseInt(hex, 16)
  if (isNaN(num)) return null

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
}

/**
 * RGB to HSL
 */
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l }
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }

  return { h, s, l }
}

/**
 * HSL to RGB
 */
function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl

  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

// ============================================================================
// Transformations
// ============================================================================

/**
 * Lighten a color by a percentage
 */
export function lighten(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color

  const hsl = rgbToHsl(rgb)
  hsl.l = Math.min(1, hsl.l + amount / 100)

  return rgbToHex(hslToRgb(hsl))
}

/**
 * Darken a color by a percentage
 */
export function darken(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color

  const hsl = rgbToHsl(rgb)
  hsl.l = Math.max(0, hsl.l - amount / 100)

  return rgbToHex(hslToRgb(hsl))
}

/**
 * Mix two colors
 */
export function mix(color1: string, color2: string, weight = 50): string {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  if (!rgb1 || !rgb2) return color1

  const w = weight / 100
  return rgbToHex({
    r: rgb1.r * w + rgb2.r * (1 - w),
    g: rgb1.g * w + rgb2.g * (1 - w),
    b: rgb1.b * w + rgb2.b * (1 - w),
  })
}

// ============================================================================
// Transform Dispatcher
// ============================================================================

type ColorTransform = 'lighten' | 'darken' | 'multiply' | 'none'

/**
 * Apply a named transform to a value
 */
export function applyTransform(
  value: string | number,
  transform: ColorTransform,
  amount: number = 0
): string | number {
  // For non-color values (numbers)
  if (typeof value === 'number') {
    switch (transform) {
      case 'multiply':
        return Math.round(value * amount)
      default:
        return value
    }
  }

  // For color values
  if (value.startsWith('#')) {
    switch (transform) {
      case 'lighten':
        return lighten(value, amount)
      case 'darken':
        return darken(value, amount)
      default:
        return value
    }
  }

  return value
}
