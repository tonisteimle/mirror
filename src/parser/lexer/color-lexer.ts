/**
 * Color parsing logic for the Mirror DSL lexer.
 * Handles hex colors like #RGB, #RRGGBB, #RRGGBBAA.
 */

import type { Token } from './token-types'

export interface ColorLexResult {
  tokens: Token[]
  newPos: number
  newColumn: number
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
