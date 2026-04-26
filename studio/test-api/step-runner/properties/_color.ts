/**
 * Color normalisation.
 *
 * Mirror source accepts colors in many forms:
 *   - 6-digit hex:   `#2271c1`
 *   - 3-digit hex:   `#fff`
 *   - 8-digit hex:   `#2271c180` (with alpha)
 *   - named:         `white`, `red`, ...
 *   - rgb()/rgba():  `rgb(34, 113, 193)` (rare in source, common in DOM)
 *   - tokens:        `$primary` (resolution: out of scope for this module)
 *
 * The DOM always reports `rgb(R, G, B)` or `rgba(R, G, B, A)`. To compare
 * source vs. DOM the runner normalises both sides to a single canonical
 * form: lowercase `#rrggbb` (no alpha) or `#rrggbbaa` (with alpha if not
 * fully opaque).
 *
 * Returns null for forms this module doesn't handle (e.g. tokens, hsl()).
 * Callers should fall back to string equality in those cases.
 */

/** Subset of CSS named colors most likely to appear in Mirror source. */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  transparent: '#00000000',
}

export function normalizeColor(input: string | null | undefined): string | null {
  if (!input) return null
  const v = input.trim().toLowerCase()

  // Hex: #rgb, #rrggbb, #rrggbbaa
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/)
  if (hex) {
    let body = hex[1]
    if (body.length === 3) {
      // #abc → #aabbcc
      body = body
        .split('')
        .map(c => c + c)
        .join('')
    }
    if (body.length === 6) return `#${body}`
    // 8-digit: keep alpha unless it's ff (fully opaque)
    if (body.endsWith('ff')) return `#${body.slice(0, 6)}`
    return `#${body}`
  }

  // Named color
  if (NAMED_COLORS[v]) return NAMED_COLORS[v]

  // rgb(R, G, B) or rgba(R, G, B, A)
  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/)
  if (rgbMatch) {
    const r = clampByte(parseInt(rgbMatch[1], 10))
    const g = clampByte(parseInt(rgbMatch[2], 10))
    const b = clampByte(parseInt(rgbMatch[3], 10))
    const aRaw = rgbMatch[4]
    const hexBody = `${toHex(r)}${toHex(g)}${toHex(b)}`
    if (aRaw === undefined) return `#${hexBody}`
    const alpha = Math.max(0, Math.min(1, parseFloat(aRaw)))
    if (alpha === 1) return `#${hexBody}`
    return `#${hexBody}${toHex(Math.round(alpha * 255))}`
  }

  // rgb(R G B) (CSS Color 4 space-separated, also what some browsers return)
  const rgbSpaced = v.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*(\d*\.?\d+))?\s*\)$/)
  if (rgbSpaced) {
    const r = clampByte(parseInt(rgbSpaced[1], 10))
    const g = clampByte(parseInt(rgbSpaced[2], 10))
    const b = clampByte(parseInt(rgbSpaced[3], 10))
    const hexBody = `${toHex(r)}${toHex(g)}${toHex(b)}`
    const aRaw = rgbSpaced[4]
    if (aRaw === undefined) return `#${hexBody}`
    const alpha = Math.max(0, Math.min(1, parseFloat(aRaw)))
    if (alpha === 1) return `#${hexBody}`
    return `#${hexBody}${toHex(Math.round(alpha * 255))}`
  }

  // Cannot normalise (e.g. token, hsl, currentColor, ...).
  return null
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0')
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n))
}
