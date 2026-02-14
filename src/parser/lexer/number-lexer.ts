/**
 * Number parsing logic for the Mirror DSL lexer.
 * Handles integers, decimals, and percentages.
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
