/**
 * @module parser/preprocessor/shorthand-expander
 * @description Expands CSS-like shorthand values to explicit directional properties
 *
 * Handles:
 * - padding 8 16 → padding top-bottom 8, padding left-right 16
 * - padding 8 16 12 24 → padding top 8, padding right 16, padding bottom 12, padding left 24
 * - margin (same patterns)
 * - radius (corner patterns)
 */

import type { Token } from './tokenizer'

/** Properties that support 2-4 value CSS shorthand */
const SHORTHAND_SPACING_PROPERTIES = new Set([
  'padding', 'pad', 'p',
  'margin', 'mar', 'm',
])

/** Properties that support corner shorthand (radius) */
const SHORTHAND_CORNER_PROPERTIES = new Set([
  'radius', 'rad',
])

/**
 * Expand CSS shorthand values in token stream.
 *
 * Input:  [PROPERTY:padding, NUMBER:8, NUMBER:16]
 * Output: [PROPERTY:padding, KEYWORD:top-bottom, NUMBER:8, COMMA, PROPERTY:padding, KEYWORD:left-right, NUMBER:16]
 */
export function expandShorthands(tokens: Token[]): Token[] {
  const result: Token[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'PROPERTY') {
      const propName = token.value.toLowerCase()

      if (SHORTHAND_SPACING_PROPERTIES.has(propName)) {
        const expanded = expandSpacingShorthand(tokens, i)
        result.push(...expanded.tokens)
        i = expanded.nextIndex
        continue
      }

      if (SHORTHAND_CORNER_PROPERTIES.has(propName)) {
        const expanded = expandCornerShorthand(tokens, i)
        result.push(...expanded.tokens)
        i = expanded.nextIndex
        continue
      }
    }

    result.push(token)
    i++
  }

  return result
}

interface ExpandResult {
  tokens: Token[]
  nextIndex: number
}

/**
 * Expand spacing shorthand (padding, margin)
 *
 * 1 value:  padding 8 → padding 8 (no change)
 * 2 values: padding 8 16 → padding top-bottom 8, padding left-right 16
 * 3 values: padding 8 16 12 → padding top 8, padding left-right 16, padding bottom 12
 * 4 values: padding 8 16 12 24 → padding top 8, padding right 16, padding bottom 12, padding left 24
 */
function expandSpacingShorthand(tokens: Token[], startIndex: number): ExpandResult {
  const propToken = tokens[startIndex]
  let i = startIndex + 1

  // Check if there's a direction keyword immediately after property
  if (i < tokens.length && isDirectionKeyword(tokens[i])) {
    // Already has direction, don't expand: padding left 8
    return collectUntilSeparator(tokens, startIndex)
  }

  // Collect numeric values
  const values: Token[] = []
  while (i < tokens.length && isNumericValue(tokens[i])) {
    values.push(tokens[i])
    i++
  }

  // Check for trailing content (not another property or separator)
  // If there's non-numeric content after, it's not a shorthand
  if (i < tokens.length && !isSeparator(tokens[i]) && tokens[i].type !== 'PROPERTY') {
    // Not a pure numeric shorthand, return as-is
    return collectUntilSeparator(tokens, startIndex)
  }

  // Expand based on number of values
  const result: Token[] = []
  const propName = propToken.value
  // Helper to create tokens with position info from propToken
  const dir = (value: string): Token => ({ type: 'DIRECTION', value, line: propToken.line, column: propToken.column, indent: propToken.indent })
  const comma = (): Token => ({ type: 'COMMA', value: ',', line: propToken.line, column: propToken.column, indent: propToken.indent })

  switch (values.length) {
    case 0:
    case 1:
      // No expansion needed
      result.push(propToken)
      if (values.length === 1) result.push(values[0])
      break

    case 2:
      // t-b (top-bottom), l-r (left-right) - using short forms for parser compatibility
      result.push(
        { ...propToken },
        dir('t-b'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        dir('l-r'),
        values[1],
      )
      break

    case 3:
      // t (top), l-r (left-right), b (bottom)
      result.push(
        { ...propToken },
        dir('t'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        dir('l-r'),
        values[1],
        comma(),
        { ...propToken, value: propName },
        dir('b'),
        values[2],
      )
      break

    case 4:
      // t, r, b, l (clockwise from top) - short forms
      result.push(
        { ...propToken },
        dir('t'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        dir('r'),
        values[1],
        comma(),
        { ...propToken, value: propName },
        dir('b'),
        values[2],
        comma(),
        { ...propToken, value: propName },
        dir('l'),
        values[3],
      )
      break

    default:
      // More than 4 values - not valid shorthand, return as-is
      result.push(propToken, ...values)
  }

  return { tokens: result, nextIndex: i }
}

/**
 * Expand corner shorthand (radius)
 *
 * 1 value:  radius 8 → radius 8 (no change)
 * 2 values: radius 8 16 → radius top-left 8, radius top-right 16, radius bottom-right 8, radius bottom-left 16
 * 4 values: radius 8 16 12 24 → radius top-left 8, radius top-right 16, radius bottom-right 12, radius bottom-left 24
 */
function expandCornerShorthand(tokens: Token[], startIndex: number): ExpandResult {
  const propToken = tokens[startIndex]
  let i = startIndex + 1

  // Check if there's a corner keyword immediately after property
  if (i < tokens.length && isCornerKeyword(tokens[i])) {
    // Already has corner, don't expand: radius top-left 8
    return collectUntilSeparator(tokens, startIndex)
  }

  // Collect numeric values
  const values: Token[] = []
  while (i < tokens.length && isNumericValue(tokens[i])) {
    values.push(tokens[i])
    i++
  }

  // Check for trailing content
  if (i < tokens.length && !isSeparator(tokens[i]) && tokens[i].type !== 'PROPERTY') {
    return collectUntilSeparator(tokens, startIndex)
  }

  const result: Token[] = []
  const propName = propToken.value
  // Helper to create tokens with position info from propToken
  const corner = (value: string): Token => ({ type: 'CORNER', value, line: propToken.line, column: propToken.column, indent: propToken.indent })
  const comma = (): Token => ({ type: 'COMMA', value: ',', line: propToken.line, column: propToken.column, indent: propToken.indent })

  switch (values.length) {
    case 0:
    case 1:
      // No expansion needed
      result.push(propToken)
      if (values.length === 1) result.push(values[0])
      break

    case 2:
      // tl/br, tr/bl - using short corner forms
      result.push(
        { ...propToken },
        corner('tl'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        corner('tr'),
        values[1],
        comma(),
        { ...propToken, value: propName },
        corner('br'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        corner('bl'),
        values[1],
      )
      break

    case 3:
      // tl, tr/bl, br
      result.push(
        { ...propToken },
        corner('tl'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        corner('tr'),
        values[1],
        comma(),
        { ...propToken, value: propName },
        corner('br'),
        values[2],
        comma(),
        { ...propToken, value: propName },
        corner('bl'),
        values[1],
      )
      break

    case 4:
      // tl, tr, br, bl (clockwise from top-left)
      result.push(
        { ...propToken },
        corner('tl'),
        values[0],
        comma(),
        { ...propToken, value: propName },
        corner('tr'),
        values[1],
        comma(),
        { ...propToken, value: propName },
        corner('br'),
        values[2],
        comma(),
        { ...propToken, value: propName },
        corner('bl'),
        values[3],
      )
      break

    default:
      result.push(propToken, ...values)
  }

  return { tokens: result, nextIndex: i }
}

/** Collect tokens until a separator (comma, newline) or property */
function collectUntilSeparator(tokens: Token[], startIndex: number): ExpandResult {
  const result: Token[] = []
  let i = startIndex

  while (i < tokens.length && !isSeparator(tokens[i])) {
    result.push(tokens[i])
    i++
  }

  return { tokens: result, nextIndex: i }
}

function isNumericValue(token: Token): boolean {
  return token.type === 'NUMBER' || token.type === 'TOKEN_REF'
}

function isSeparator(token: Token): boolean {
  return token.type === 'COMMA' || token.type === 'NEWLINE'
}

function isDirectionKeyword(token: Token): boolean {
  if (token.type !== 'KEYWORD') return false
  const directions = [
    'left', 'right', 'top', 'bottom',
    'l', 'r', 't', 'b', 'u', 'd',
    'left-right', 'top-bottom', 'l-r', 't-b', 'lr', 'tb', 'u-d', 'ud',
  ]
  return directions.includes(token.value.toLowerCase())
}

function isCornerKeyword(token: Token): boolean {
  if (token.type !== 'KEYWORD') return false
  const corners = [
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'tl', 'tr', 'bl', 'br',
  ]
  return corners.includes(token.value.toLowerCase())
}
