/**
 * Inline Token Handler
 *
 * Extracts inline token definitions like "$surface: #333" from lines
 * and handles adding them to the tokens file.
 */

export interface InlineTokenMatch {
  tokenName: string      // z.B. "surface"
  tokenValue: string     // z.B. "#333"
  propertyName: string   // z.B. "bg"
  fullMatch: string      // z.B. "$surface: #333"
  replacement: string    // z.B. "$surface"
}

// Regex: $tokenName: value (am Ende einer Property)
// Beispiele: bg $surface: #333, rad $m: 4, pad $spacing.md: 8
// Matches: $ followed by valid token name, then : and value
const INLINE_TOKEN_REGEX = /\$([a-zA-Z][a-zA-Z0-9._-]*):\s*(.+)$/

/**
 * Extract inline token definition from a line of code
 *
 * Examples:
 * - "Card bg $surface: #333" -> { tokenName: "surface", tokenValue: "#333", ... }
 * - "Button rad $m: 4" -> { tokenName: "m", tokenValue: "4", ... }
 * - "Text col $text.muted: #888" -> { tokenName: "text.muted", tokenValue: "#888", ... }
 *
 * @param lineText The full line text to parse
 * @returns InlineTokenMatch if found, null otherwise
 */
export function extractInlineToken(lineText: string): InlineTokenMatch | null {
  const match = lineText.match(INLINE_TOKEN_REGEX)
  if (!match) return null

  const tokenName = match[1]
  const tokenValue = match[2].trim()

  // Validate token name (must start with letter)
  if (!/^[a-zA-Z]/.test(tokenName)) return null

  // Validate value exists
  if (!tokenValue) return null

  // Find the property name (word before $)
  // Look for the property name that precedes the token
  const beforeToken = lineText.slice(0, match.index)
  const propertyMatch = beforeToken.match(/(\w+)\s*$/)
  const propertyName = propertyMatch ? propertyMatch[1] : ''

  return {
    tokenName,
    tokenValue,
    propertyName,
    fullMatch: match[0],  // "$surface: #333"
    replacement: `$${tokenName}`,  // "$surface"
  }
}

/**
 * Build a token definition line for the tokens file
 *
 * @param name Token name (without $)
 * @param value Token value
 * @returns Formatted token definition line
 */
export function buildTokenDefinition(name: string, value: string): string {
  return `$${name}: ${value}`
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
