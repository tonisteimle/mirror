/**
 * Operator parsing logic for the Mirror DSL lexer.
 * Handles comparison operators, arithmetic operators, and assignment.
 */

import type { Token } from './token-types'

export interface OperatorLexResult {
  token: Token
  newPos: number
  newColumn: number
}

/**
 * Parse arithmetic operators: +, *, /
 */
export function parseArithmeticOperator(
  char: string,
  pos: number,
  column: number,
  lineNum: number
): OperatorLexResult {
  return {
    token: { type: 'ARITHMETIC', value: char, line: lineNum, column },
    newPos: pos + 1,
    newColumn: column + 1
  }
}

/**
 * Parse comparison and assignment operators: ==, !=, >=, <=, >, <, =
 * Returns null if the character sequence doesn't form an operator.
 */
export function parseComparisonOperator(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): OperatorLexResult | null {
  const char = content[pos]
  const nextChar = content[pos + 1] || ''

  if (char === '=' && nextChar === '=') {
    return {
      token: { type: 'OPERATOR', value: '==', line: lineNum, column },
      newPos: pos + 2,
      newColumn: column + 2
    }
  }
  if (char === '!' && nextChar === '=') {
    return {
      token: { type: 'OPERATOR', value: '!=', line: lineNum, column },
      newPos: pos + 2,
      newColumn: column + 2
    }
  }
  if (char === '>' && nextChar === '=') {
    return {
      token: { type: 'OPERATOR', value: '>=', line: lineNum, column },
      newPos: pos + 2,
      newColumn: column + 2
    }
  }
  if (char === '<' && nextChar === '=') {
    return {
      token: { type: 'OPERATOR', value: '<=', line: lineNum, column },
      newPos: pos + 2,
      newColumn: column + 2
    }
  }
  if (char === '>') {
    return {
      token: { type: 'OPERATOR', value: '>', line: lineNum, column },
      newPos: pos + 1,
      newColumn: column + 1
    }
  }
  if (char === '<') {
    return {
      token: { type: 'OPERATOR', value: '<', line: lineNum, column },
      newPos: pos + 1,
      newColumn: column + 1
    }
  }
  // Single = is assignment
  if (char === '=') {
    return {
      token: { type: 'ASSIGNMENT', value: '=', line: lineNum, column },
      newPos: pos + 1,
      newColumn: column + 1
    }
  }

  return null
}

/**
 * Parse arithmetic minus: - followed by space, number, or $ (for expressions like $count - 1)
 * Returns null if this doesn't look like arithmetic minus.
 */
export function parseArithmeticMinus(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): OperatorLexResult | null {
  const char = content[pos]
  if (char !== '-') return null

  // - followed by space, number, $, or end of content
  if (/[0-9\s$]/.test(content[pos + 1] || '') || pos + 1 >= content.length) {
    return {
      token: { type: 'ARITHMETIC', value: '-', line: lineNum, column },
      newPos: pos + 1,
      newColumn: column + 1
    }
  }

  return null
}
