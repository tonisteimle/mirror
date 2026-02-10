/**
 * Token type inference utilities.
 * Analyzes token values to determine their type for context-aware filtering.
 *
 * Tokens can have complex values:
 * - Multi-part: `$padlr: l-r 4` (direction + number)
 * - References: `$lg-pad: $base-pad 8` (token ref + number)
 *
 * Inference priority:
 * 1. Section comments (// Farben, // Abstände)
 * 2. Token name patterns (-color, -pad, -font)
 * 3. Value analysis
 */

import type { TokenValueType, TypedToken } from '../types/token-types'

// CSS color keywords
const CSS_COLOR_KEYWORDS = new Set([
  'transparent', 'currentcolor', 'inherit',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'navy',
  'teal', 'aqua', 'maroon', 'olive', 'silver', 'fuchsia'
])

// Section comment patterns → token type
const SECTION_HINTS: Record<string, TokenValueType> = {
  'farben': 'color',
  'color': 'color',
  'colors': 'color',
  'farbe': 'color',
  'spacing': 'spacing',
  'abstand': 'spacing',
  'abstände': 'spacing',
  'padding': 'spacing',
  'margin': 'spacing',
  'font': 'font',
  'schrift': 'font',
  'typography': 'font',
  'typografie': 'font',
  'shadow': 'shadow',
  'schatten': 'shadow',
  'radius': 'radius',
  'ecken': 'radius',
  'border': 'border',
  'rahmen': 'border',
  'opacity': 'opacity',
  'transparenz': 'opacity',
  'weight': 'weight',
  'gewicht': 'weight',
  'size': 'size',
  'grösse': 'size',
  'größe': 'size',
}

// Token name patterns → token type (3-letter DSL conventions)
const NAME_HINTS: Array<{ pattern: RegExp; type: TokenValueType }> = [
  { pattern: /col|bg|boc/i, type: 'color' },         // col, bg, boc (border-color)
  { pattern: /pad|mar|gap/i, type: 'spacing' },      // pad, mar, gap
  { pattern: /fon|fam/i, type: 'font' },             // fon, fam (font-family)
  { pattern: /fow|wei/i, type: 'weight' },           // fow (font-weight), wei
  { pattern: /sha|sdw/i, type: 'shadow' },           // sha, sdw (shadow)
  { pattern: /rad/i, type: 'radius' },               // rad
  { pattern: /opa/i, type: 'opacity' },              // opa
  { pattern: /bor|bow/i, type: 'border' },           // bor, bow (border-width)
  { pattern: /siz|fos/i, type: 'size' },             // siz, fos (font-size)
]

/**
 * Infer type from token name (e.g., $primary-color → color)
 */
function inferTypeFromName(name: string): TokenValueType | null {
  for (const { pattern, type } of NAME_HINTS) {
    if (pattern.test(name)) {
      return type
    }
  }
  return null
}

/**
 * Infer type from a simple value (single token).
 */
function inferTypeFromSimpleValue(value: string): TokenValueType | null {
  const trimmed = value.trim()

  // Color: #xxx, rgb(), hsl()
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return 'color'
  if (/^(rgb|rgba|hsl|hsla)\s*\(/i.test(trimmed)) return 'color'
  if (CSS_COLOR_KEYWORDS.has(trimmed.toLowerCase())) return 'color'

  // Font weight (100-900)
  if (/^[1-9]00$/.test(trimmed)) return 'weight'

  // Pure number → spacing
  if (/^-?[0-9]+$/.test(trimmed)) return 'spacing'

  // Opacity (0-1 decimal)
  if (/^0?\.[0-9]+$/.test(trimmed)) return 'opacity'

  // Shadow keywords
  if (/^(sm|md|lg|xl|2xl|none)$/i.test(trimmed)) return 'shadow'

  // Quoted string → font
  if (/^["'].*["']$/.test(trimmed)) return 'font'

  return null
}


/**
 * Resolve token references in a value string.
 * e.g., "l-r $base-pad" with tokenMap { "base-pad": "16" } → "l-r 16"
 *
 * Handles recursive resolution up to a depth limit to prevent infinite loops.
 */
function resolveTokenReferences(
  value: string,
  tokenMap: Map<string, string>,
  maxDepth = 5
): string {
  if (maxDepth <= 0) return value

  return value.replace(/\$([a-zA-Z][\w-]*)/g, (match, name) => {
    const resolved = tokenMap.get(name)
    if (resolved === undefined) return match // Keep original if not found

    // Recursively resolve nested references
    if (resolved.includes('$')) {
      return resolveTokenReferences(resolved, tokenMap, maxDepth - 1)
    }
    return resolved
  })
}

/**
 * Parse tokens from code and infer their types.
 * Token references are resolved to show actual values.
 *
 * Priority:
 * 1. Section comment (// Farben)
 * 2. Token name hint ($primary-color)
 * 3. Value analysis
 */
export function parseTokensWithTypes(code: string): TypedToken[] {
  const lines = code.split('\n')

  // First pass: collect all raw token values
  const rawTokenMap = new Map<string, string>()
  for (const line of lines) {
    const tokenMatch = line.match(/^\$([a-zA-Z][\w-]*):\s*(.+)$/)
    if (tokenMatch) {
      rawTokenMap.set(tokenMatch[1], tokenMatch[2].trim())
    }
  }

  // Second pass: parse tokens with resolved values and type inference
  const tokens: TypedToken[] = []
  let currentSection: TokenValueType | null = null

  for (const line of lines) {
    // Check for section comment
    const sectionMatch = line.match(/^\/\/\s*(.+)/)
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toLowerCase().trim()
      currentSection = null
      for (const [keyword, type] of Object.entries(SECTION_HINTS)) {
        if (sectionName.includes(keyword)) {
          currentSection = type
          break
        }
      }
      continue
    }

    // Parse token definition
    const tokenMatch = line.match(/^\$([a-zA-Z][\w-]*):\s*(.+)$/)
    if (tokenMatch) {
      const name = tokenMatch[1]
      const rawValue = tokenMatch[2].trim()

      // Resolve token references in the value
      const resolvedValue = resolveTokenReferences(rawValue, rawTokenMap)

      // Priority 1: Section hint
      if (currentSection) {
        tokens.push({ name, value: resolvedValue, type: currentSection })
        continue
      }

      // Priority 2: Name-based hint
      const nameType = inferTypeFromName(name)
      if (nameType) {
        tokens.push({ name, value: resolvedValue, type: nameType })
        continue
      }

      // Priority 3: Simple value analysis (fallback)
      const simpleType = inferTypeFromSimpleValue(resolvedValue)
      tokens.push({ name, value: resolvedValue, type: simpleType || 'unknown' })
    }
  }

  return tokens
}
