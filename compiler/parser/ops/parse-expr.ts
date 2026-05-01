/**
 * Parser ops — parse-expr
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import type { Expression, ComputedExpression } from '../ast'
import { parseExpression as parseExpressionExtracted } from '../expression-parser'
import type { Parser } from '../parser'

/**
 * Collect the next operand in an expression, handling parenthesized sub-expressions.
 * For example: "Summe: €" + ($count * $price)
 * When called after the +, this collects everything inside the parentheses as a single sub-expression.
 *
 * Returns the operand and any additional operators/parts found (for nested expressions).
 */
export function collectExpressionOperand(
  this: Parser,
  parts: ComputedExpression['parts'],
  operators: string[]
): void {
  // Handle parenthesized sub-expression
  if (this.check('LPAREN')) {
    parts.push(this.advance().value) // (

    // Collect sub-expression inside parentheses
    this.collectSubExpression(parts, operators)

    // Expect closing paren
    if (this.check('RPAREN')) {
      parts.push(this.advance().value)
    }
    return
  }

  // Simple operand (not parenthesized)
  if (this.check('STRING')) {
    parts.push(this.advance().value)
  } else if (this.check('NUMBER')) {
    parts.push(parseFloat(this.advance().value))
  } else if (this.check('IDENTIFIER')) {
    let combined = this.advance().value
    while (this.check('DOT') && this.checkNextIsPropertyName()) {
      this.advance() // .
      combined += '.' + this.advancePropertyName()
    }
    // Handle array indexing: user.name[0]
    while (this.check('LBRACKET')) {
      this.advance() // [
      if (this.check('NUMBER')) {
        combined += '[' + this.advance().value + ']'
      }
      if (this.check('RBRACKET')) {
        this.advance() // ]
      }
    }
    // Handle method call arguments: $users.sum(hours), $items.sum(data.stats.value)
    if (this.check('LPAREN')) {
      this.advance() // consume (
      const args: string[] = []
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        if (this.check('IDENTIFIER') || this.check('DATA')) {
          // Collect full path: data.stats.value (DATA token) or item.name (IDENTIFIER)
          let argPath = this.advance().value
          while (this.check('DOT')) {
            this.advance() // consume .
            if (this.check('IDENTIFIER') || this.check('DATA')) {
              argPath += '.' + this.advance().value
            } else {
              break
            }
          }
          args.push(argPath)
        } else if (this.check('COMMA')) {
          this.advance() // skip comma
        } else {
          break
        }
      }
      if (this.check('RPAREN')) {
        this.advance() // consume )
      }
      combined += '(' + args.join(', ') + ')'
    }
    if (combined.startsWith('$')) {
      parts.push({ kind: 'token' as const, name: combined.slice(1) })
    } else {
      // Bare identifier (e.g., product.price) - treat as loop variable reference
      parts.push({ kind: 'loopVar' as const, name: combined })
    }
  }
}

/**
 * Collect a sub-expression inside parentheses.
 * Handles: operand operator operand operator ...
 */
export function collectSubExpression(
  this: Parser,
  parts: ComputedExpression['parts'],
  operators: string[]
): void {
  // Get first operand
  if (this.check('STRING')) {
    parts.push(this.advance().value)
  } else if (this.check('NUMBER')) {
    parts.push(parseFloat(this.advance().value))
  } else if (this.check('IDENTIFIER')) {
    let combined = this.advance().value
    while (this.check('DOT') && this.checkNextIsPropertyName()) {
      this.advance()
      combined += '.' + this.advancePropertyName()
    }
    // Handle array indexing: user.name[0]
    while (this.check('LBRACKET')) {
      this.advance() // [
      if (this.check('NUMBER')) {
        combined += '[' + this.advance().value + ']'
      }
      if (this.check('RBRACKET')) {
        this.advance() // ]
      }
    }
    if (combined.startsWith('$')) {
      parts.push({ kind: 'token' as const, name: combined.slice(1) })
    } else {
      // Bare identifier - treat as loop variable reference
      parts.push({ kind: 'loopVar' as const, name: combined })
    }
  } else if (this.check('LPAREN')) {
    // Nested parentheses
    parts.push(this.advance().value)
    this.collectSubExpression(parts, operators)
    if (this.check('RPAREN')) {
      parts.push(this.advance().value)
    }
  }

  // Collect operator and next operand pairs
  while (this.check('PLUS') || this.check('MINUS') || this.check('STAR') || this.check('SLASH')) {
    operators.push(this.advance().value)

    // Get next operand
    if (this.check('STRING')) {
      parts.push(this.advance().value)
    } else if (this.check('NUMBER')) {
      parts.push(parseFloat(this.advance().value))
    } else if (this.check('IDENTIFIER')) {
      let combined = this.advance().value
      while (this.check('DOT') && this.checkNextIsPropertyName()) {
        this.advance()
        combined += '.' + this.advancePropertyName()
      }
      // Handle array indexing: user.name[0]
      while (this.check('LBRACKET')) {
        this.advance() // [
        if (this.check('NUMBER')) {
          combined += '[' + this.advance().value + ']'
        }
        if (this.check('RBRACKET')) {
          this.advance() // ]
        }
      }
      if (combined.startsWith('$')) {
        parts.push({ kind: 'token' as const, name: combined.slice(1) })
      } else {
        // Bare identifier - treat as loop variable reference
        parts.push({ kind: 'loopVar' as const, name: combined })
      }
    } else if (this.check('LPAREN')) {
      // Nested parentheses
      parts.push(this.advance().value)
      this.collectSubExpression(parts, operators)
      if (this.check('RPAREN')) {
        parts.push(this.advance().value)
      }
    } else {
      break
    }
  }
}

export function parseExpression(this: Parser): Expression {
  return this.withSubParserContext(ctx => parseExpressionExtracted(ctx))
}
