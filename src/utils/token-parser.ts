/**
 * Unified Token Parser
 *
 * Centralized token parsing for all picker components.
 * Replaces the duplicate implementations in ColorPicker, FontPicker, and TokenPicker.
 *
 * Features:
 * - Section-aware parsing (// Farben, // Fonts, etc.)
 * - Type inference from name patterns and values
 * - Token reference resolution
 * - Filtering by type
 */

import type { TokenValueType, TypedToken } from '../types/token-types'

// Re-export types for convenience
export type { TokenValueType, TypedToken }

/**
 * Extended token interface with optional preview (for fonts)
 */
export interface ParsedToken extends TypedToken {
  /** Original raw value before reference resolution */
  rawValue?: string
  /** Preview text (e.g., font family for font tokens) */
  preview?: string
}

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
  'schriften': 'font',
  'typography': 'font',
  'typografie': 'font',
  'shadow': 'shadow',
  'schatten': 'shadow',
  'radius': 'radius',
  'radien': 'radius',
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
  'grössen': 'size',
  'größen': 'size',
}

// Token name patterns → token type
const NAME_HINTS: Array<{ pattern: RegExp; type: TokenValueType }> = [
  { pattern: /col|bg|boc/i, type: 'color' },
  { pattern: /pad|mar|gap/i, type: 'spacing' },
  { pattern: /font|fam/i, type: 'font' },
  { pattern: /fow|weight/i, type: 'weight' },
  { pattern: /sha|shadow/i, type: 'shadow' },
  { pattern: /rad|radius/i, type: 'radius' },
  { pattern: /opa|opacity/i, type: 'opacity' },
  { pattern: /bor|border/i, type: 'border' },
  { pattern: /size|fos/i, type: 'size' },
]

/**
 * Infer type from token name
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
 * Infer type from token value
 */
function inferTypeFromValue(value: string): TokenValueType | null {
  const trimmed = value.trim()

  // Color: #xxx, rgb(), hsl(), or color keywords
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
  if (/^["'].*["']/.test(trimmed)) return 'font'

  return null
}

/**
 * Resolve token references in a value string.
 * e.g., "l-r $base-pad" with tokenMap { "base-pad": "16" } → "l-r 16"
 *
 * Handles recursive resolution up to a depth limit to prevent infinite loops.
 * This is the shared utility used by both token-parser and token-type-inference.
 */
export function resolveTokenReferences(
  value: string,
  tokenMap: Map<string, string>,
  maxDepth = 5
): string {
  if (maxDepth <= 0) return value

  return value.replace(/\$([a-zA-Z][\w-]*)/g, (match, name) => {
    const resolved = tokenMap.get(name)
    if (resolved === undefined) return match

    if (resolved.includes('$')) {
      return resolveTokenReferences(resolved, tokenMap, maxDepth - 1)
    }
    return resolved
  })
}

/**
 * Parse options for the unified parser
 */
export interface ParseTokensOptions {
  /** Filter to specific types */
  filterTypes?: TokenValueType[]
  /** Include tokens with unknown type */
  includeUnknown?: boolean
  /** Resolve token references to show actual values */
  resolveReferences?: boolean
}

/**
 * Parse tokens from code with type inference.
 * This is the main entry point for token parsing.
 */
export function parseTokens(
  code: string,
  options: ParseTokensOptions = {}
): ParsedToken[] {
  const {
    filterTypes,
    includeUnknown = true,
    resolveReferences = true
  } = options

  const lines = code.split('\n')

  // First pass: collect all raw token values for reference resolution
  const rawTokenMap = new Map<string, string>()
  for (const line of lines) {
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      rawTokenMap.set(tokenMatch[1], tokenMatch[2].trim())
    }
  }

  // Second pass: parse tokens with type inference
  const tokens: ParsedToken[] = []
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
    const tokenMatch = line.match(/^\s*\$([a-zA-Z][\w-]*)\s*:\s*(.+)$/)
    if (tokenMatch) {
      const name = tokenMatch[1]
      const rawValue = tokenMatch[2].trim()

      // Resolve token references if enabled
      const resolvedValue = resolveReferences
        ? resolveTokenReferences(rawValue, rawTokenMap)
        : rawValue

      // Determine type with priority: section > name > value
      let type: TokenValueType = 'unknown'

      if (currentSection) {
        type = currentSection
      } else {
        const nameType = inferTypeFromName(name)
        if (nameType) {
          type = nameType
        } else {
          const valueType = inferTypeFromValue(resolvedValue)
          if (valueType) {
            type = valueType
          }
        }
      }

      // Apply filters
      if (filterTypes && !filterTypes.includes(type)) {
        continue
      }
      if (!includeUnknown && type === 'unknown') {
        continue
      }

      tokens.push({
        name,
        value: resolvedValue,
        type,
        rawValue: rawValue !== resolvedValue ? rawValue : undefined,
        preview: type === 'font' ? resolvedValue : undefined
      })
    }
  }

  return tokens
}

/**
 * Parse only color tokens from code.
 * Convenience function for ColorPicker.
 */
export function parseColorTokens(code: string): ParsedToken[] {
  return parseTokens(code, { filterTypes: ['color'] })
}

/**
 * Parse only font tokens from code.
 * Convenience function for FontPicker.
 */
export function parseFontTokens(code: string): ParsedToken[] {
  return parseTokens(code, { filterTypes: ['font'] })
}

/**
 * Check if a token type is valid for a given property context.
 */
export function isTokenTypeValidForProperty(
  property: string,
  tokenType: TokenValueType
): boolean {
  const propertyLower = property.toLowerCase()

  // Color properties
  if (/col|bg|boc|color|background/.test(propertyLower)) {
    return tokenType === 'color' || tokenType === 'unknown'
  }

  // Spacing properties
  if (/pad|mar|gap/.test(propertyLower)) {
    return tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Font properties
  if (/font|fam/.test(propertyLower)) {
    return tokenType === 'font' || tokenType === 'unknown'
  }

  // Size properties
  if (/size|fos/.test(propertyLower)) {
    return tokenType === 'size' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Weight properties
  if (/weight|fow/.test(propertyLower)) {
    return tokenType === 'weight' || tokenType === 'unknown'
  }

  // Radius properties
  if (/rad/.test(propertyLower)) {
    return tokenType === 'radius' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Shadow properties
  if (/shadow|sha/.test(propertyLower)) {
    return tokenType === 'shadow' || tokenType === 'unknown'
  }

  // Border properties
  if (/bor|border/.test(propertyLower)) {
    return tokenType === 'border' || tokenType === 'spacing' || tokenType === 'unknown'
  }

  // Opacity properties
  if (/opa/.test(propertyLower)) {
    return tokenType === 'opacity' || tokenType === 'unknown'
  }

  // Unknown property - show all tokens
  return true
}

/**
 * Filter tokens by search query.
 * Searches in name, value, and preview.
 */
export function filterTokensByQuery(
  tokens: ParsedToken[],
  query: string
): ParsedToken[] {
  if (!query.trim()) return tokens

  const lowerQuery = query.toLowerCase()
  return tokens.filter(token =>
    token.name.toLowerCase().includes(lowerQuery) ||
    token.value.toLowerCase().includes(lowerQuery) ||
    (token.preview && token.preview.toLowerCase().includes(lowerQuery))
  )
}
