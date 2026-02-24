/**
 * @module number-lexer
 * @description Number-Parsing für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Integer, Dezimalzahlen und Prozente
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMATE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Integer
 *   42, 200, 0
 *   Beispiel: width 200 → NUMBER "200"
 *
 * @syntax Decimal
 *   0.5, 1.5, 2.75
 *   Beispiel: opacity 0.5 → NUMBER "0.5"
 *
 * @syntax Percentage
 *   50%, 100%, 33.33%
 *   Beispiel: width 50% → NUMBER "50%"
 *
 * @syntax Inline Token Definition
 *   16:spacing
 *   Beispiel: 16:base → NUMBER "16", TOKEN_DEF "base"
 *
 * @token NUMBER
 *   value enthält den String ("42", "0.5", "50%")
 *   Parser konvertiert zu echten Zahlen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @context Dimensionen
 *   width 200, height 150
 *   Box 300 400 → Dimension Shorthand
 *
 * @context Spacing
 *   padding 16, margin 8, gap 12
 *
 * @context Typography
 *   size 14, weight 600, line 1.5
 *
 * @context Visual
 *   opacity 0.5, radius 8, rotate 45
 */

import type { Token } from './token-types'

export interface NumberLexResult {
  tokens: Token[]
  newPos: number
  newColumn: number
}

/**
 * Parse a number token.
 * Supports integers (42), decimals (0.5), and percentages (50%).
 * Also handles inline token definitions after numbers (e.g., 16:spacing).
 */
export function parseNumber(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): NumberLexResult {
  const tokens: Token[] = []
  let value = ''

  while (pos < content.length && /[0-9]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  // Handle decimal point
  if (content[pos] === '.' && /[0-9]/.test(content[pos + 1] || '')) {
    value += content[pos] // add the '.'
    pos++
    while (pos < content.length && /[0-9]/.test(content[pos])) {
      value += content[pos]
      pos++
    }
  }

  // Handle percentage suffix
  if (content[pos] === '%') {
    value += content[pos]
    pos++
  }

  tokens.push({ type: 'NUMBER', value, line: lineNum, column })
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
