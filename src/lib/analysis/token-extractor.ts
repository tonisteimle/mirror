/**
 * Token Extractor
 *
 * Extracts and categorizes design tokens from Mirror DSL code.
 * Part of the Analysis Foundation (Increment 1).
 */

/**
 * Represents a single extracted token
 */
export interface ExtractedToken {
  name: string           // e.g., "$primary"
  value: string          // e.g., "#3B82F6"
  type: 'color' | 'spacing' | 'radius' | 'shadow' | 'other'
  line: number           // 0-indexed line number
}

/**
 * Tokens grouped by type
 */
export interface CategorizedTokens {
  colors: ExtractedToken[]
  spacing: ExtractedToken[]
  radius: ExtractedToken[]
  shadow: ExtractedToken[]
  other: ExtractedToken[]
  all: ExtractedToken[]
}

// Token definition pattern: $name: value
const TOKEN_DEFINITION_REGEX = /^\s*(\$[\w-]+)\s*:\s*(.+?)\s*(?:\/\/.*)?$/

// Color patterns
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/
const RGB_REGEX = /^rgba?\s*\(/i
const HSL_REGEX = /^hsla?\s*\(/i
const NAMED_COLORS = new Set([
  'transparent', 'white', 'black', 'red', 'green', 'blue', 'yellow',
  'orange', 'purple', 'pink', 'gray', 'grey', 'cyan', 'magenta'
])

// Shadow keywords
const SHADOW_KEYWORDS = new Set(['sm', 'md', 'lg', 'xl', '2xl', 'none', 'inner'])

/**
 * Determines the type of a token based on its name and value
 */
function determineTokenType(name: string, value: string): ExtractedToken['type'] {
  const nameLower = name.toLowerCase()
  const valueLower = value.toLowerCase().trim()

  // Check name-based hints first (more specific)
  if (nameLower.includes('-color') || nameLower.includes('color-')) {
    return 'color'
  }
  if (nameLower.includes('-spacing') || nameLower.includes('spacing-') ||
      nameLower.includes('-gap') || nameLower.includes('gap-') ||
      nameLower.includes('-padding') || nameLower.includes('padding-') ||
      nameLower.includes('-margin') || nameLower.includes('margin-')) {
    return 'spacing'
  }
  if (nameLower.includes('-radius') || nameLower.includes('radius-') ||
      nameLower.includes('-rounded') || nameLower.includes('rounded-')) {
    return 'radius'
  }
  if (nameLower.includes('-shadow') || nameLower.includes('shadow-')) {
    return 'shadow'
  }

  // Check value-based hints
  if (HEX_COLOR_REGEX.test(value) || RGB_REGEX.test(valueLower) ||
      HSL_REGEX.test(valueLower) || NAMED_COLORS.has(valueLower)) {
    return 'color'
  }

  // Shadow keywords
  if (SHADOW_KEYWORDS.has(valueLower)) {
    return 'shadow'
  }

  // Numeric values with specific name patterns
  if (/^\d+(\.\d+)?$/.test(value)) {
    // Pure numbers - check name for context
    if (nameLower.includes('size') || nameLower.includes('font')) {
      return 'other' // Font sizes go to other
    }
    if (nameLower.includes('rad')) {
      return 'radius'
    }
    // Default numeric to spacing (common case)
    if (nameLower.includes('sp') || nameLower.includes('pad') ||
        nameLower.includes('gap') || nameLower.includes('margin')) {
      return 'spacing'
    }
  }

  return 'other'
}

/**
 * Extracts all token definitions from Mirror DSL code
 */
export function extractTokens(code: string): ExtractedToken[] {
  const tokens: ExtractedToken[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(TOKEN_DEFINITION_REGEX)

    if (match) {
      const name = match[1]
      const value = match[2].trim()

      tokens.push({
        name,
        value,
        type: determineTokenType(name, value),
        line: i
      })
    }
  }

  return tokens
}

/**
 * Groups extracted tokens by their type
 */
export function categorizeTokens(tokens: ExtractedToken[]): CategorizedTokens {
  const result: CategorizedTokens = {
    colors: [],
    spacing: [],
    radius: [],
    shadow: [],
    other: [],
    all: [...tokens]
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'color':
        result.colors.push(token)
        break
      case 'spacing':
        result.spacing.push(token)
        break
      case 'radius':
        result.radius.push(token)
        break
      case 'shadow':
        result.shadow.push(token)
        break
      case 'other':
        result.other.push(token)
        break
    }
  }

  return result
}

/**
 * Finds a token by its value (for deduplication)
 */
export function findTokenByValue(tokens: ExtractedToken[], value: string): ExtractedToken | undefined {
  const normalizedValue = value.toLowerCase().trim()
  return tokens.find(t => t.value.toLowerCase().trim() === normalizedValue)
}

/**
 * Checks if a value is already defined as a token
 */
export function hasTokenForValue(tokens: ExtractedToken[], value: string): boolean {
  return findTokenByValue(tokens, value) !== undefined
}

/**
 * Gets all unique token values of a specific type
 */
export function getUniqueValues(tokens: ExtractedToken[], type?: ExtractedToken['type']): string[] {
  const filtered = type ? tokens.filter(t => t.type === type) : tokens
  return [...new Set(filtered.map(t => t.value))]
}
