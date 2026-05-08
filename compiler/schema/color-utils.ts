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
// Contrast / readable foreground
// ============================================================================

/**
 * Common CSS named colors we resolve for contrast inference.
 * Kept intentionally small — real users write hex or these obvious names.
 * Anything not in this map returns null and the caller skips inference.
 */
const NAMED_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  navy: '#000080',
  teal: '#008080',
}

/**
 * Compute relative luminance (Rec. 709) from a hex color. 0..1, with 0=black.
 */
function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

/**
 * Resolve a CSS color string to its hex form. Returns null if the value
 * can't be statically classified (transparent, var(), tokens, gradients,
 * rgba/hsla with alpha, unknown named colors).
 */
function resolveSolidHex(value: string): string | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'transparent' || v === 'currentcolor' || v === 'inherit') return null
  if (v.startsWith('var(') || v.startsWith('$')) return null
  if (v.includes('gradient(') || v.startsWith('linear-') || v.startsWith('radial-')) return null
  if (v.startsWith('rgba(') || v.startsWith('hsla(')) return null
  return v.startsWith('#') ? v : (NAMED_COLORS[v] ?? null)
}

/**
 * Pick a readable foreground (`#000` or `#fff`) for a given background color.
 * Returns null if the value can't be classified as a solid light/dark color
 * (transparent, gradients, css-vars, tokens, unknown named colors).
 *
 * Uses simple perceptual luminance (Rec. 709 weights). The threshold (0.55)
 * is biased slightly toward black text — most "neutral grey" backgrounds
 * still read better with dark text.
 */
export function contrastForeground(bgValue: string): '#000' | '#fff' | null {
  const hex = resolveSolidHex(bgValue)
  if (!hex) return null
  const lum = luminance(hex)
  if (lum === null) return null
  return lum > 0.55 ? '#000' : '#fff'
}

/**
 * Derive a coherent `--m-*` palette from a canvas background.
 *
 * Mirror's defaults stylesheet is theme-locked dark: `--m-text: #e0e0e0`,
 * `--m-surface: #1a1a1a`, etc. When the user declares a light canvas
 * (`canvas bg #fff`), every surface-themed primitive (Button, Input, Item,
 * Select-Trigger) would still paint dark surfaces — visually broken.
 *
 * This function flips the palette based on canvas-bg luminance:
 *   light bg → light surfaces, dark text
 *   dark bg  → keep current dark defaults, just rebase --m-bg
 *
 * Returns CSS-variable name → value pairs that the canvas IR transformer
 * emits inline on `_root`.
 *
 * Skipped (returns empty) for un-classifiable bg (gradients, tokens, rgba).
 * Token-driven palettes are the user's responsibility — they declare their
 * own surface tokens explicitly.
 */
export function derivePaletteVariables(bgValue: string): Record<string, string> {
  const hex = resolveSolidHex(bgValue)
  if (!hex) return {}
  const lum = luminance(hex)
  if (lum === null) return {}

  const isLight = lum > 0.55

  if (isLight) {
    return {
      '--m-bg': bgValue,
      '--m-text': '#1a1a1a',
      '--m-text-muted': '#666666',
      '--m-text-placeholder': '#aaaaaa',
      '--m-surface': '#f5f5f5',
      '--m-surface-hover': '#eaeaea',
      '--m-surface-active': '#dddddd',
      '--m-surface-selected': '#d0d0d0',
    }
  }

  // Dark canvas — keep palette defaults, rebase only --m-bg so the
  // user-declared color drives the page itself.
  return { '--m-bg': bgValue }
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
