/**
 * Token reference parsing logic for the Mirror DSL lexer.
 * Handles $variable references with dot notation and hyphens.
 */

import type { Token } from './token-types'

export interface TokenRefLexResult {
  token: Token
  newPos: number
  newColumn: number
}

/**
 * Parse a token reference: $primary, $dark, $user.avatar, $default-pad
 * Supports dot notation and hyphens in token names.
 */
export function parseTokenRef(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): TokenRefLexResult {
  let value = ''
  pos++ // skip $

  while (pos < content.length && /[a-zA-Z0-9_.\-]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  // Remove trailing dot or hyphen if any
  while (value.endsWith('.') || value.endsWith('-')) {
    value = value.slice(0, -1)
    pos--
  }

  return {
    token: { type: 'TOKEN_REF', value, line: lineNum, column },
    newPos: pos,
    newColumn: column + value.length + 1
  }
}
