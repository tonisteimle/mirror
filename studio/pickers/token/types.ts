/**
 * Token Picker Types
 */

export type TokenType = 'color' | 'spacing' | 'size' | 'font' | 'other'

export interface TokenDefinition {
  name: string           // e.g., "$accent.bg"
  value: string          // e.g., "#007bff"
  type: TokenType
  category?: string      // e.g., "primary", "secondary"
  description?: string
}

export interface TokenContext {
  property: string       // Current property being edited (bg, pad, col, etc.)
  nodeType?: string      // Component type
  allowedTypes: TokenType[]
}

// Property to token type mapping
export const PROPERTY_TOKEN_TYPES: Record<string, TokenType[]> = {
  // Colors
  bg: ['color'],
  background: ['color'],
  col: ['color'],
  color: ['color'],
  boc: ['color'],
  bordercolor: ['color'],
  fill: ['color'],

  // Spacing
  pad: ['spacing'],
  padding: ['spacing'],
  margin: ['spacing'],
  gap: ['spacing'],

  // Sizes
  w: ['size', 'spacing'],
  width: ['size', 'spacing'],
  h: ['size', 'spacing'],
  height: ['size', 'spacing'],
  minw: ['size', 'spacing'],
  maxw: ['size', 'spacing'],
  minh: ['size', 'spacing'],
  maxh: ['size', 'spacing'],
  rad: ['size', 'spacing'],
  radius: ['size', 'spacing'],

  // Fonts
  font: ['font'],
  fontsize: ['size', 'font'],
  fs: ['size', 'font'],
  lineheight: ['size'],
  lh: ['size'],
}

/**
 * Get allowed token types for a property
 */
export function getTokenTypesForProperty(property: string): TokenType[] {
  const normalized = property.toLowerCase().replace(/[-_]/g, '')
  return PROPERTY_TOKEN_TYPES[normalized] || ['other']
}

/**
 * Parse token definitions from source code
 * Supports multiple formats:
 * - $name.property: value (e.g., $accent.bg: #5BA8F5)
 * - $name: value (e.g., $primary: #5BA8F5)
 * - name: value (e.g., primary: #5BA8F5 - without $)
 */
export function parseTokens(source: string): TokenDefinition[] {
  const tokens: TokenDefinition[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue
    }

    // Match token definition with property suffix: $name.property: value
    const matchWithSuffix = trimmed.match(/^\$?([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+):\s*(.+)$/)
    if (matchWithSuffix) {
      const [, category, prop, rawValue] = matchWithSuffix
      // Strip inline comments
      const value = rawValue.split('//')[0].trim()
      const name = `$${category}.${prop}`

      // Determine type from property name
      let type: TokenType = 'other'
      if (/^(bg|col|color|fill|boc)$/i.test(prop) || /^#[0-9a-f]{3,8}$/i.test(value)) {
        type = 'color'
      } else if (/^(pad|margin|gap|spacing)$/i.test(prop)) {
        type = 'spacing'
      } else if (/^(w|h|size|rad|radius)$/i.test(prop) || /^\d+$/.test(value)) {
        type = 'size'
      } else if (/^(font|fs|lh)$/i.test(prop)) {
        type = 'font'
      }

      tokens.push({
        name,
        value,
        type,
        category,
      })
      continue
    }

    // Match simple token definition: $name: value or name: value
    const matchSimple = trimmed.match(/^\$?([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/)
    if (matchSimple) {
      const [, rawName, rawValue] = matchSimple
      // Strip inline comments
      const value = rawValue.split('//')[0].trim()
      const name = rawName.startsWith('$') ? rawName : `$${rawName}`

      // Only include if value looks like a token value (color, number, or token reference)
      if (!/^(#[0-9a-f]{3,8}|\d+|\$[\w.-]+)$/i.test(value)) {
        continue
      }

      // Determine type from value
      let type: TokenType = 'other'
      if (/^#[0-9a-f]{3,8}$/i.test(value) || /^\$[\w.-]+\.(bg|col|color|boc)$/i.test(value)) {
        type = 'color'
      } else if (/^\d+$/.test(value) || /^\$[\w.-]+\.(pad|gap|margin)$/i.test(value)) {
        type = 'spacing'
      }

      tokens.push({
        name,
        value,
        type,
      })
    }
  }

  return tokens
}

/**
 * Parse tokens from multiple files
 * Returns unique tokens (deduped by name)
 */
export function parseTokensFromFiles(files: Record<string, string>): TokenDefinition[] {
  const allTokens: TokenDefinition[] = []
  const seen = new Set<string>()

  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue
    const tokens = parseTokens(content)
    for (const token of tokens) {
      if (!seen.has(token.name)) {
        seen.add(token.name)
        allTokens.push(token)
      }
    }
  }

  return allTokens
}

/**
 * Filter tokens by property suffix
 */
export function filterTokensBySuffix(tokens: TokenDefinition[], suffix: string): TokenDefinition[] {
  if (!suffix) return tokens
  return tokens.filter(t => t.name.endsWith(suffix))
}

/**
 * Filter tokens by type
 */
export function filterTokensByType(tokens: TokenDefinition[], types: TokenType[]): TokenDefinition[] {
  if (!types || types.length === 0) return tokens
  return tokens.filter(t => types.includes(t.type))
}

/**
 * Filter tokens by search query
 */
export function filterTokensBySearch(tokens: TokenDefinition[], query: string): TokenDefinition[] {
  if (!query) return tokens
  const lowerQuery = query.toLowerCase()
  return tokens.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.value.toLowerCase().includes(lowerQuery) ||
    (t.category && t.category.toLowerCase().includes(lowerQuery))
  )
}
