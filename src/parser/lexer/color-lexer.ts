/**
 * @module color-lexer
 * @description Color-Parsing für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Hex-Farben in verschiedenen Formaten
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMATE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax 3-Digit Hex (Shorthand)
 *   #RGB → #F50
 *   Expandiert zu: #FF5500
 *
 * @syntax 6-Digit Hex (Standard)
 *   #RRGGBB → #3B82F6
 *   Beispiel: background #3B82F6
 *
 * @syntax 8-Digit Hex (mit Alpha)
 *   #RRGGBBAA → #3B82F680
 *   AA = Transparenz (00=transparent, FF=opak)
 *
 * @syntax Inline Token Definition
 *   #3B82F6:primary
 *   Erzeugt: COLOR "#3B82F6", TOKEN_DEF "primary"
 *
 * @token COLOR
 *   value enthält vollständigen Hex-String inkl. #
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @context Background
 *   background #3B82F6
 *   bg #1E1E2E
 *
 * @context Text
 *   color #FFFFFF
 *   col #9CA3AF
 *
 * @context Border
 *   border-color #333
 *   border 1 #3B82F6
 *
 * @context Token Definition
 *   $primary: #3B82F6
 *   $dark: #1E1E2E
 *
 * @note Mirror unterstützt KEINE Farbnamen (red, blue, etc.)
 *       Verwende immer Hex oder Tokens
 */

import type { Token } from './token-types'

export interface ColorLexResult {
  tokens: Token[]
  newPos: number
  newColumn: number
}

/**
 * Check if content at position starts with rgba( or rgb(.
 */
export function isRgbaColor(content: string, pos: number): boolean {
  const slice = content.slice(pos, pos + 5).toLowerCase()
  return slice.startsWith('rgba(') || slice.startsWith('rgb(')
}

/**
 * Parse rgba(r, g, b, a) or rgb(r, g, b) color.
 * Returns the full rgba(...) or rgb(...) string as a COLOR token.
 */
export function parseRgbaColor(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): ColorLexResult {
  const startPos = pos
  const startColumn = column

  // Match the function name (rgb or rgba)
  let value = ''
  while (pos < content.length && /[a-zA-Z]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  // Expect opening paren
  if (content[pos] !== '(') {
    return { tokens: [], newPos: startPos, newColumn: startColumn }
  }
  value += content[pos]
  pos++

  // Parse until closing paren, handling nested content
  let parenDepth = 1
  while (pos < content.length && parenDepth > 0) {
    const char = content[pos]
    if (char === '(') parenDepth++
    if (char === ')') parenDepth--
    if (char === '\n') break // Don't cross line boundaries
    value += char
    pos++
  }

  // Check if we found a valid closing paren
  if (parenDepth !== 0) {
    return { tokens: [], newPos: startPos, newColumn: startColumn }
  }

  return {
    tokens: [{ type: 'COLOR', value, line: lineNum, column: startColumn }],
    newPos: pos,
    newColumn: startColumn + value.length
  }
}

/**
 * Parse a color token starting with #.
 * Also handles inline token definitions after colors (e.g., #3B82F6:primary).
 */
export function parseColor(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): ColorLexResult {
  const tokens: Token[] = []
  let value = '#'
  pos++ // skip #

  while (pos < content.length && /[0-9a-fA-F]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  tokens.push({ type: 'COLOR', value, line: lineNum, column })
  let newColumn = column + value.length

  // Check for inline token definition :name
  if (content[pos] === ':' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
    pos++ // skip :
    let tokenName = ''
    while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
      tokenName += content[pos]
      pos++
    }
    tokens.push({ type: 'TOKEN_DEF', value: tokenName, line: lineNum, column: newColumn })
    newColumn += tokenName.length + 1
  }

  return {
    tokens,
    newPos: pos,
    newColumn
  }
}
