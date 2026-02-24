/**
 * Color & Value Fixes
 *
 * Phase 1: Fix color formats and value syntax.
 */

import type { Fix } from '../types'

// =============================================================================
// Named Colors Map
// =============================================================================

const NAMED_COLORS: Record<string, string> = {
  // Basic CSS colors
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
  transparent: 'transparent',
  // Extended CSS colors
  silver: '#C0C0C0',
  maroon: '#800000',
  olive: '#808000',
  navy: '#000080',
  teal: '#008080',
  aqua: '#00FFFF',
  lime: '#00FF00',
  fuchsia: '#FF00FF',
  coral: '#FF7F50',
  salmon: '#FA8072',
  tomato: '#FF6347',
  gold: '#FFD700',
  indigo: '#4B0082',
  violet: '#EE82EE',
  crimson: '#DC143C',
  turquoise: '#40E0D0',
  // German colors
  rot: '#FF0000',
  grün: '#00FF00',
  gruen: '#00FF00',
  blau: '#0000FF',
  gelb: '#FFFF00',
  schwarz: '#000000',
  weiß: '#FFFFFF',
  weiss: '#FFFFFF',
  grau: '#808080',
  rosa: '#FFC0CB',
  lila: '#800080',
  braun: '#8B4513',
  // Tailwind base colors
  slate: '#64748B',
  zinc: '#71717A',
  neutral: '#737373',
  stone: '#78716C',
  amber: '#F59E0B',
  emerald: '#10B981',
  sky: '#0EA5E9',
  rose: '#F43F5E',
}

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Convert hsl() and hsla() to hex color.
 */
export function convertHslToHex(code: string): string {
  return code.replace(
    /hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*([\d.]+))?\s*\)/gi,
    (_, h, s, l, a) => {
      const hue = parseInt(h, 10) / 360
      const sat = parseInt(s, 10) / 100
      const light = parseInt(l, 10) / 100

      let r: number, g: number, b: number

      if (sat === 0) {
        r = g = b = light
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1
          if (t > 1) t -= 1
          if (t < 1/6) return p + (q - p) * 6 * t
          if (t < 1/2) return q
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
          return p
        }
        const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat
        const p = 2 * light - q
        r = hue2rgb(p, q, hue + 1/3)
        g = hue2rgb(p, q, hue)
        b = hue2rgb(p, q, hue - 1/3)
      }

      const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()

      if (a !== undefined && parseFloat(a) < 1) {
        const alpha = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0')
        return `${hex}${alpha}`.toUpperCase()
      }

      return hex
    }
  )
}

/**
 * Expand short hex colors (#F00 → #FF0000).
 */
export function expandShortHex(code: string): string {
  return code.replace(
    /#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])(?=\s|$|,|;|")/g,
    (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  )
}

/**
 * Convert rgba() to hex color.
 */
export function convertRgbaToHex(code: string): string {
  return code.replace(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi,
    (_, r, g, b, a) => {
      const red = parseInt(r, 10).toString(16).padStart(2, '0')
      const green = parseInt(g, 10).toString(16).padStart(2, '0')
      const blue = parseInt(b, 10).toString(16).padStart(2, '0')

      if (a !== undefined && parseFloat(a) < 1) {
        const alpha = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0')
        return `#${red}${green}${blue}${alpha}`.toUpperCase()
      }

      return `#${red}${green}${blue}`.toUpperCase()
    }
  )
}

/**
 * Convert named CSS colors to hex.
 */
export function convertNamedColorsToHex(code: string): string {
  const colorProps = ['background', 'bg', 'color', 'col', 'c', 'border-color', 'boc']
  let result = code

  for (const prop of colorProps) {
    const pattern = new RegExp(
      `(${prop})\\s+(${Object.keys(NAMED_COLORS).join('|')})(?=\\s|$|")`,
      'gi'
    )
    result = result.replace(pattern, (match, p, colorName) => {
      const hex = NAMED_COLORS[colorName.toLowerCase()]
      return hex ? `${p} ${hex}` : match
    })
  }

  return result
}

/**
 * Convert CSS box-shadow syntax to Mirror shadow sizes.
 */
export function convertCssShadowToSize(code: string): string {
  return code.replace(
    /\bshadow\s+(\d+)(?:px)?\s+(\d+)(?:px)?\s+(\d+)(?:px)?(?:\s+\d+(?:px)?)?(?:\s+(?:#[0-9A-Fa-f]+|rgba?\([^)]+\)))?/gi,
    (_, _x, _y, blur) => {
      const blurPx = parseInt(blur, 10)
      if (blurPx <= 3) return 'shadow sm'
      if (blurPx <= 8) return 'shadow md'
      if (blurPx <= 15) return 'shadow lg'
      return 'shadow xl'
    }
  )
}

/**
 * Fix opacity values in wrong range (0-100 → 0-1).
 */
export function fixOpacityRange(code: string): string {
  return code.replace(/\b(opacity|opa|o)\s+(\d+)(?=\s|$)/g, (match, prop, val) => {
    const n = parseInt(val, 10)
    if (n > 1 && n <= 100) {
      return `${prop} ${(n / 100).toFixed(2).replace(/\.?0+$/, '')}`
    }
    return match
  })
}

/**
 * Fix border shorthand with too many values.
 */
export function fixBorderShorthand(code: string): string {
  return code.replace(
    /\bborder\s+(\d+)\s*px\s+(solid|dashed|dotted)\s+(#[0-9A-Fa-f]{3,8})/gi,
    'border $1 $2 $3'
  )
}

/**
 * Fix border with only color value (missing width).
 */
export function fixBorderColorOnly(code: string): string {
  return code.replace(
    /\bborder\s+(\$[a-zA-Z_][a-zA-Z0-9_]*|#[0-9A-Fa-f]+)(?=\s|$)/g,
    'border-color $1'
  )
}

/**
 * Add missing # to hex colors.
 * e.g., bg 3B82F6 → bg #3B82F6
 */
export function addMissingHashToHex(code: string): string {
  const colorProps = ['background', 'bg', 'color', 'col', 'c', 'border-color', 'boc']
  let result = code

  for (const prop of colorProps) {
    // Match property followed by 6 or 3 hex digits without #
    // Lookahead includes space, end, comma, semicolon
    const pattern = new RegExp(
      `(${prop})\\s+([0-9A-Fa-f]{6})(?=\\s|$|,|;)`,
      'gi'
    )
    result = result.replace(pattern, '$1 #$2')

    // Also handle 3-digit hex
    const pattern3 = new RegExp(
      `(${prop})\\s+([0-9A-Fa-f]{3})(?=\\s|$|,|;)`,
      'gi'
    )
    result = result.replace(pattern3, '$1 #$2')
  }

  return result
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const colorValueFixes: Fix[] = [
  {
    name: 'convertHslToHex',
    fn: convertHslToHex,
    phase: 'color-value',
    description: 'Convert hsl() and hsla() colors to hex format',
  },
  {
    name: 'convertRgbaToHex',
    fn: convertRgbaToHex,
    phase: 'color-value',
    description: 'Convert rgba() colors to hex format',
  },
  {
    name: 'expandShortHex',
    fn: expandShortHex,
    phase: 'color-value',
    description: 'Expand short hex colors (#F00 → #FF0000)',
  },
  {
    name: 'convertNamedColorsToHex',
    fn: convertNamedColorsToHex,
    phase: 'color-value',
    description: 'Convert named CSS colors to hex',
  },
  {
    name: 'addMissingHashToHex',
    fn: addMissingHashToHex,
    phase: 'color-value',
    description: 'Add missing # to hex colors',
  },
  {
    name: 'convertCssShadowToSize',
    fn: convertCssShadowToSize,
    phase: 'color-value',
    description: 'Convert CSS box-shadow to Mirror shadow sizes',
  },
  {
    name: 'fixOpacityRange',
    fn: fixOpacityRange,
    phase: 'color-value',
    description: 'Convert opacity from 0-100 to 0-1 range',
  },
  {
    name: 'fixBorderShorthand',
    fn: fixBorderShorthand,
    phase: 'color-value',
    description: 'Fix CSS border shorthand syntax',
  },
  {
    name: 'fixBorderColorOnly',
    fn: fixBorderColorOnly,
    phase: 'color-value',
    description: 'Fix border with only color (missing width)',
  },
]
