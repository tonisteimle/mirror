/**
 * Expression Parser
 *
 * Captures a chain of tokens as a raw JavaScript expression string. Used by
 * `if` conditions, `where` filters, computed values, and similar contexts
 * where the parser hands a snippet straight to the runtime / IR rather than
 * decomposing it further.
 *
 * Stops at NEWLINE / INDENT / DEDENT (when not inside parentheses), `THEN`
 * (inline conditionals), `BY` (each-loop ordering), unmatched `)`, or EOF.
 *
 * Extracted from parser.ts. Pure-leaf: only uses ParserUtils for token I/O,
 * no callbacks needed.
 */

import type { Expression } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils, MAX_ITERATIONS } from './parser-context'

const U = ParserUtils

export function parseExpression(ctx: ParserContext): Expression {
  // Capture everything until NEWLINE, INDENT, or DEDENT as raw JavaScript expression
  let expr = ''
  let parenDepth = 0

  for (let iter = 0; !U.isAtEnd(ctx) && iter < MAX_ITERATIONS; iter++) {
    // Track parentheses depth
    if (U.check(ctx, 'LPAREN')) {
      parenDepth++
      // Add space before ( if needed (but not after . or !)
      if (expr && !expr.endsWith('(') && !expr.endsWith('.') && !expr.endsWith(' ')) {
        expr += ' '
      }
      expr += '('
      U.advance(ctx)
      continue
    }
    if (U.check(ctx, 'RPAREN')) {
      if (parenDepth > 0) {
        parenDepth--
        expr += ')'
        U.advance(ctx)
        continue
      }
      // Unmatched ) - stop
      break
    }

    // Stop at newline/indent when not inside parentheses
    if (
      parenDepth === 0 &&
      (U.check(ctx, 'NEWLINE') || U.check(ctx, 'INDENT') || U.check(ctx, 'DEDENT'))
    ) {
      break
    }

    // Stop at THEN for inline conditionals
    if (U.check(ctx, 'THEN')) {
      break
    }

    // Stop at BY for each loop ordering (each item in $items where x == y by field)
    if (U.check(ctx, 'BY')) {
      break
    }

    // Append token value with appropriate spacing
    const token = U.advance(ctx)

    // No space before/after DOT
    if (token.type === 'DOT') {
      expr += '.'
      continue
    }

    // BANG (!) - add space before if needed, no space after
    if (token.type === 'BANG') {
      if (expr && !expr.endsWith('(') && !expr.endsWith(' ')) {
        expr += ' '
      }
      expr += '!'
      continue
    }

    if (token.type === 'STRING') {
      if (expr && !expr.endsWith('(') && !expr.endsWith('!') && !expr.endsWith('.')) {
        expr += ' '
      }
      expr += `"${token.value}"`
    } else {
      // Add space before token if needed
      if (
        expr &&
        !expr.endsWith('(') &&
        !expr.endsWith('!') &&
        !expr.endsWith('.') &&
        !expr.endsWith(' ')
      ) {
        expr += ' '
      }
      expr += token.value
    }
  }

  return expr.trim()
}
