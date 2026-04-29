/**
 * Property Parser
 *
 * Parses a single Mirror property: `name value [value ...]`. Examples:
 *
 *   bg #2271C1                       (color literal)
 *   pad 12 24                        (multi-value)
 *   bg $primary                      (token reference)
 *   col grad #a #b                   (function-like value)
 *   text $user.name                  (loop variable when `user` is in scope)
 *   width $a + $b                    (computed expression with arithmetic)
 *   align active ? center : left     (ternary — delegated to ternary-parser)
 *
 * Stops collecting at COMMA, SEMICOLON, NEWLINE, INDENT, DEDENT, EOF, or
 * when the next token starts a new property (PROPERTY_STARTERS) or an
 * inline state block (`hover:`, etc.).
 *
 * Extracted from parser.ts (Phase 5 — fifth incremental cut). Pure-ish:
 * mutates ctx.pos via U.advance, reads ctx.tokens and ctx.loopVariables.
 * No callbacks needed — the only cross-call is to ternary-parser, which
 * already accepts a ParserContext directly.
 */

import type { Token } from './lexer'
import type {
  Property,
  TokenReference,
  LoopVarReference,
  Conditional,
  ComputedExpression,
} from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils, MAX_LOOKAHEAD } from './parser-context'
import {
  PROPERTY_STARTERS,
  LAYOUT_BOOLEANS,
  KEYBOARD_KEYS,
  DIRECTIONAL_PROPERTIES,
  isDirectionForProperty,
} from '../schema/parser-helpers'
import { parseTernaryExpression } from './ternary-parser'

const U = ParserUtils

/** Property value type — union of all possible values in Property.values. */
type PropertyValue =
  | string
  | number
  | boolean
  | TokenReference
  | LoopVarReference
  | Conditional
  | ComputedExpression

/** Token captured during the value-collection phase, before we know its role. */
interface CollectedToken {
  type: string
  value: string
}

/** Operator/punctuation token types that participate in value expressions. */
const EXPRESSION_TOKEN_TYPES = new Set<string>([
  'STRICT_EQUAL',
  'STRICT_NOT_EQUAL',
  'NOT_EQUAL',
  'EQUALS', // `==` (Bug #25 — lexer emits EQUALS for ==)
  'GT',
  'LT',
  'GTE',
  'LTE',
  'AND_AND',
  'OR_OR',
  'BANG',
  'DOT',
  'PLUS',
  'MINUS',
  'STAR',
  'SLASH',
  'LPAREN',
  'RPAREN',
])

/** Token types that terminate the property-value collection loop. */
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

/* -------------------------------------------------------------------------- */

export function parseProperty(ctx: ParserContext): Property | null {
  if (!U.check(ctx, 'IDENTIFIER')) return null

  const name = U.advance(ctx)
  const values: PropertyValue[] = []
  const collectedTokens: CollectedToken[] = []

  while (!isPropertyTerminator(ctx)) {
    // Ternary detected — delegate the rest of the value to ternary-parser
    // and return the resulting Property directly.
    if (U.check(ctx, 'QUESTION')) {
      return parseTernaryExpression(ctx, name, collectedTokens)
    }

    if (EXPRESSION_TOKEN_TYPES.has(U.current(ctx).type)) {
      collectedTokens.push({ type: U.current(ctx).type, value: U.advance(ctx).value })
    } else if (U.check(ctx, 'NUMBER')) {
      collectedTokens.push({ type: 'NUMBER', value: U.advance(ctx).value })
    } else if (U.check(ctx, 'STRING')) {
      // Keep raw string value — quotes are added during IR/codegen if needed.
      collectedTokens.push({ type: 'STRING', value: U.advance(ctx).value })
    } else if (U.check(ctx, 'IDENTIFIER')) {
      if (shouldStopAtIdentifier(ctx, name, collectedTokens)) break
      collectFunctionCallOrIdentifier(ctx, collectedTokens)
    } else {
      break
    }
  }

  // No ternary — convert collected tokens to values.
  const hasArithmetic = collectedTokens.some(
    t => t.type === 'PLUS' || t.type === 'MINUS' || t.type === 'STAR' || t.type === 'SLASH'
  )

  if (hasArithmetic) {
    values.push(buildComputedExpression(collectedTokens, ctx.loopVariables))
  } else {
    flattenSimpleValues(collectedTokens, values, ctx.loopVariables)
  }

  return {
    type: 'Property',
    name: name.value,
    values,
    line: name.line,
    column: name.column,
  }
}

/* ---------------------------------------------------------------- helpers */

/**
 * Decide whether an IDENTIFIER token should terminate value collection
 * (because it starts a new property, an inline state block, or a layout
 * boolean) — or should be consumed as part of the current value.
 */
function shouldStopAtIdentifier(
  ctx: ParserContext,
  propName: Token,
  collected: CollectedToken[]
): boolean {
  const identValue = U.current(ctx).value

  // Inline state syntax: `hover:` / `selected:` (lowercase identifier + COLON).
  // Keyboard keys like `enter:` are NOT states.
  if (
    U.checkNext(ctx, 'COLON') &&
    identValue[0] === identValue[0].toLowerCase() &&
    !KEYBOARD_KEYS.has(identValue)
  ) {
    return true
  }

  const prevToken = collected[collected.length - 1]
  const isPropertyAccess = prevToken && prevToken.type === 'DOT'

  // PROPERTY_STARTERS start a new property, with two exceptions:
  // (1) directional keywords (`x`, `y`, `left`, ...) following a spacing/border
  //     property are values (`pad x 20` → pad: [x, 20]).
  // (2) Property-access continuation (`row.c` after `.` is a chain, not a new prop).
  const isDirectionValue =
    DIRECTIONAL_PROPERTIES.has(propName.value) && isDirectionForProperty(propName.value, identValue)

  if (PROPERTY_STARTERS.has(identValue) && !isDirectionValue && !isPropertyAccess) {
    return true
  }

  // LAYOUT_BOOLEANS (hor, ver, wrap, spread, ...) start a new property when
  // encountered after at least one collected value. Position booleans (left,
  // right, top, bottom, center) are NOT in this set — they're commonly used
  // as values for `align`. Property-access continuation is also exempt.
  if (LAYOUT_BOOLEANS.has(identValue) && collected.length > 0 && !isPropertyAccess) {
    return true
  }

  return false
}

/**
 * Consume an IDENTIFIER. If immediately followed by `(`, capture the entire
 * function-call form `funcName(...)` as a single IDENTIFIER token, balancing
 * parentheses. Used for `rgba(0,0,0,0.5)`, `grad(...)`, etc.
 */
function collectFunctionCallOrIdentifier(ctx: ParserContext, collected: CollectedToken[]): void {
  const funcIdent = U.advance(ctx)

  if (!U.check(ctx, 'LPAREN')) {
    collected.push({ type: 'IDENTIFIER', value: funcIdent.value })
    return
  }

  let funcValue = funcIdent.value + U.advance(ctx).value // ident + (
  let parenDepth = 1
  let parenIterations = 0

  // Use MAX_LOOKAHEAD to prevent DoS on malformed input with unmatched parens.
  while (parenDepth > 0 && !U.isAtEnd(ctx) && parenIterations++ < MAX_LOOKAHEAD) {
    if (U.check(ctx, 'LPAREN')) parenDepth++
    else if (U.check(ctx, 'RPAREN')) parenDepth--
    funcValue += U.advance(ctx).value
  }

  collected.push({ type: 'IDENTIFIER', value: funcValue })
}

/**
 * Build a ComputedExpression when arithmetic operators are present.
 * Handles property-access chains, $token refs, and loop-variable refs
 * inside the parts list.
 */
function buildComputedExpression(
  collected: CollectedToken[],
  loopVariables: Set<string>
): ComputedExpression {
  const parts: ComputedExpression['parts'] = []
  const operators: string[] = []

  let i = 0
  while (i < collected.length) {
    const token = collected[i]

    if (
      token.type === 'PLUS' ||
      token.type === 'MINUS' ||
      token.type === 'STAR' ||
      token.type === 'SLASH'
    ) {
      operators.push(token.value)
    } else if (token.type === 'LPAREN' || token.type === 'RPAREN') {
      parts.push(token.value)
    } else if (token.type === 'IDENTIFIER') {
      const { combined, advanceBy } = takePropertyAccessChain(collected, i)
      i += advanceBy
      parts.push(classifyValueAtom(combined, loopVariables))
    } else if (token.type === 'STRING') {
      parts.push(token.value.replace(/^"|"$/g, ''))
    } else if (token.type === 'NUMBER') {
      parts.push(parseFloat(token.value))
    }
    i++
  }

  return { kind: 'expression', parts, operators }
}

/**
 * Flatten the collected tokens into Property.values when no arithmetic is
 * present. Also handles property-access chains and $token / loop-var refs.
 */
function flattenSimpleValues(
  collected: CollectedToken[],
  values: PropertyValue[],
  loopVariables: Set<string>
): void {
  let i = 0
  while (i < collected.length) {
    const token = collected[i]

    if (token.type === 'IDENTIFIER') {
      const { combined, advanceBy } = takePropertyAccessChain(collected, i)
      i += advanceBy
      values.push(classifyValueAtom(combined, loopVariables))
    } else if (token.type === 'STRING') {
      values.push(token.value.replace(/^"|"$/g, ''))
    } else if (token.type !== 'DOT') {
      // DOTs are absorbed by takePropertyAccessChain above.
      values.push(token.value)
    }
    i++
  }
}

/**
 * Walk forward through `collected` from index `i`, joining IDENT.IDENT.IDENT
 * chains into a single dotted name. Returns the joined string and how many
 * extra positions were consumed (caller must add this to `i`, then `i++`
 * for the original token).
 */
function takePropertyAccessChain(
  collected: CollectedToken[],
  i: number
): { combined: string; advanceBy: number } {
  let combined = collected[i].value
  let advanceBy = 0
  while (
    i + 2 + advanceBy < collected.length &&
    collected[i + 1 + advanceBy].type === 'DOT' &&
    collected[i + 2 + advanceBy].type === 'IDENTIFIER'
  ) {
    combined += '.' + collected[i + 2 + advanceBy].value
    advanceBy += 2
  }
  return { combined, advanceBy }
}

/**
 * Decide whether a dotted identifier is a $token reference, a loop-variable
 * reference, or a plain string value.
 */
function classifyValueAtom(
  combined: string,
  loopVariables: Set<string>
): TokenReference | LoopVarReference | string {
  if (combined.startsWith('$')) {
    return { kind: 'token', name: combined.slice(1) }
  }
  const firstPart = combined.split('.')[0]
  if (loopVariables.has(firstPart)) {
    return { kind: 'loopVar', name: combined }
  }
  return combined
}
