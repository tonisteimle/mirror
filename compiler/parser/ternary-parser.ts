/**
 * Ternary Expression Parser
 *
 * Handles Mirror's inline ternary syntax inside property values:
 *
 *   Text active ? "Aktiv" : "Inaktiv"
 *   Frame bg done ? #10b981 : #ef4444
 *   Icon task.done ? "check" : "circle"
 *   Text level == 1 ? "A" : "B"
 *
 * Plus nested ternaries in the else branch:
 *   Text level == 1 ? "A" : level == 2 ? "B" : "C"
 *
 * Two historical bug fixes are preserved here and explicitly documented:
 *
 *   Bug #23 — comparison-op prefix: when collected tokens start with a
 *   comparison operator, the original "property name" was actually the LHS
 *   of the comparison. Without this fix `Text level == 1 ? "A" : "B"` would
 *   produce a Property named `level` with garbled condition `== 1`.
 *
 *   Bug #26 — re-quoting strings: the lexer strips quotes off STRING
 *   token values, but the IR's `__conditional:cond?then:else` format uses
 *   colons and breaks if the then/else strings contain colons. Strings
 *   are re-wrapped in quotes here so the JS expression survives.
 *
 * Extracted from parser.ts (Phase 5 — third incremental cut). Pure-ish:
 * mutates ctx.pos via U.advance, reads ctx tokens. No callbacks needed.
 */

import type { Token } from './lexer'
import type { Property } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { KEYBOARD_KEYS } from '../schema/parser-helpers'

const U = ParserUtils

/** Token types recognised as comparison operators in the condition prefix. */
const COMPARISON_OPS = new Set([
  'STRICT_EQUAL',
  'STRICT_NOT_EQUAL',
  'NOT_EQUAL',
  'EQUALS',
  'GT',
  'LT',
  'GTE',
  'LTE',
])

/**
 * Lightweight projection of a Token kept by parseProperty before it sees `?`.
 * (Defined here to avoid leaking parser internals into the public API.)
 */
export interface CollectedToken {
  type: string
  value: string
}

/**
 * Stop tokens that terminate a property-value expression at the top level.
 * (Used by the else-branch collector below.)
 */
function isPropertyTerminator(ctx: ParserContext): boolean {
  return (
    U.check(ctx, 'COMMA') ||
    U.check(ctx, 'SEMICOLON') ||
    U.check(ctx, 'NEWLINE') ||
    U.check(ctx, 'INDENT') ||
    U.check(ctx, 'DEDENT') ||
    U.isAtEnd(ctx)
  )
}

/**
 * If the next two tokens are `<lowercase-ident>:` and the identifier isn't a
 * keyboard key, the inline state syntax `hover:` has begun and we must stop
 * collecting expression tokens. (Without this, `bg #333 hover: bg light`
 * would absorb the whole tail.)
 */
function isInlineStateAhead(ctx: ParserContext): boolean {
  if (!(U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'COLON'))) return false
  const ident = U.current(ctx).value
  return ident[0] === ident[0].toLowerCase() && !KEYBOARD_KEYS.has(ident)
}

/** Re-wrap a STRING token's value in quotes, escaping inner quotes. */
function quoteString(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

/**
 * Build the JS-style condition string from the tokens collected before `?`.
 *
 * Three modes (mutually-exclusive markers):
 * - dotPrefix: collected starts with DOT → property name was the head
 * - simple: no tokens collected → property name IS the condition
 * - comparisonPrefix: collected starts with comparison op → property name
 *   was LHS of comparison (Bug #23)
 *
 * In all three cases the original "property name" is part of the condition,
 * not a property name in the AST sense — caller should use 'content' instead.
 */
function buildCondition(
  name: Token,
  collected: CollectedToken[]
): { condition: string; consumesName: boolean } {
  const startsWithDot = collected.length > 0 && collected[0].type === 'DOT'
  const isSimple = collected.length === 0
  const startsWithComparison = collected.length > 0 && COMPARISON_OPS.has(collected[0].type)
  const consumesName = startsWithDot || isSimple || startsWithComparison

  let condition = consumesName ? name.value : ''

  for (let j = 0; j < collected.length; j++) {
    const t = collected[j]
    const tokenText = t.type === 'STRING' ? quoteString(t.value) : t.value

    if (t.type === 'DOT') {
      condition += '.'
    } else if (j > 0 && collected[j - 1].type !== 'DOT' && t.type !== 'DOT') {
      condition += ' ' + tokenText
    } else if (condition && !condition.endsWith('.')) {
      condition += ' ' + tokenText
    } else {
      condition += tokenText
    }
  }

  return { condition, consumesName }
}

/** Parse the then-branch: a single STRING/NUMBER/IDENTIFIER token. */
function parseThenValue(ctx: ParserContext): string | number {
  if (U.check(ctx, 'STRING')) {
    return quoteString(U.advance(ctx).value)
  }
  if (U.check(ctx, 'NUMBER')) {
    return U.advance(ctx).value
  }
  if (U.check(ctx, 'IDENTIFIER')) {
    return U.advance(ctx).value
  }
  return ''
}

/**
 * Parse the else-branch as a flat string. Supports nested ternaries by
 * collecting all tokens (including `?`/`:`) until a property terminator
 * or the start of an inline state block.
 */
function parseElseValue(ctx: ParserContext): string {
  if (!U.check(ctx, 'COLON')) return ''
  U.advance(ctx) // consume :

  const elseTokens: string[] = []

  while (!isPropertyTerminator(ctx)) {
    if (isInlineStateAhead(ctx)) break

    const token = U.current(ctx)

    if (token.type === 'STRING') {
      elseTokens.push(quoteString(U.advance(ctx).value))
    } else if (token.type === 'DOT') {
      elseTokens.push(U.advance(ctx).value)
    } else if (token.type === 'QUESTION') {
      elseTokens.push(' ? ')
      U.advance(ctx)
    } else if (token.type === 'COLON') {
      elseTokens.push(' : ')
      U.advance(ctx)
    } else if (token.type === 'STRICT_EQUAL') {
      elseTokens.push(' === ')
      U.advance(ctx)
    } else if (token.type === 'STRICT_NOT_EQUAL') {
      elseTokens.push(' !== ')
      U.advance(ctx)
    } else if (token.type === 'NOT_EQUAL') {
      elseTokens.push(' != ')
      U.advance(ctx)
    } else if (
      token.type === 'GT' ||
      token.type === 'LT' ||
      token.type === 'GTE' ||
      token.type === 'LTE'
    ) {
      elseTokens.push(` ${U.advance(ctx).value} `)
    } else {
      // Add a separator before regular tokens (except after a DOT).
      if (elseTokens.length > 0 && elseTokens[elseTokens.length - 1] !== '.') {
        elseTokens.push(' ')
      }
      elseTokens.push(U.advance(ctx).value)
    }
  }

  return elseTokens.join('').trim()
}

/**
 * Parse a ternary expression. Caller has just seen `?` as the current token
 * (still unconsumed). `name` is the property-name token, `collected` is the
 * list of tokens collected before `?`.
 *
 * Returns the full Property — the caller should return this directly.
 */
export function parseTernaryExpression(
  ctx: ParserContext,
  name: Token,
  collected: CollectedToken[]
): Property {
  U.advance(ctx) // consume `?`

  const { condition, consumesName } = buildCondition(name, collected)
  const thenValue = parseThenValue(ctx)
  const elseValue = parseElseValue(ctx)

  const propertyName = consumesName ? 'content' : name.value

  return {
    type: 'Property',
    name: propertyName,
    values: [
      {
        kind: 'conditional',
        condition,
        then: thenValue,
        else: elseValue,
      },
    ],
    line: name.line,
    column: name.column,
  }
}
