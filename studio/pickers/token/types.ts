/**
 * Token Picker Types
 */

export type TokenType = 'color' | 'spacing' | 'size' | 'font' | 'other'

export interface TokenDefinition {
  name: string           // e.g., "$primary.bg"
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
 */
export function parseTokens(source: string): TokenDefinition[] {
  const tokens: TokenDefinition[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Match token definition: $name.property: value
    const match = trimmed.match(/^\$([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+):\s*(.+)$/)
    if (match) {
      const [, category, prop, value] = match
      const name = `$${category}.${prop}`

      // Determine type from property name
      let type: TokenType = 'other'
      if (/^(bg|col|color|fill|boc)$/i.test(prop) || /^#[0-9a-f]{3,6}$/i.test(value)) {
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
        value: value.trim(),
        type,
        category,
      })
    }
  }

  return tokens
}
