/**
 * Condition Parser Module
 *
 * Parses conditional expressions:
 * - Simple variable checks ($isLoggedIn)
 * - Negation (not $isLoggedIn)
 * - Comparisons ($count > 0, $status == "active")
 */

import type { ParserContext } from './parser-context'
import type { ConditionExpr } from './types'
import { parseValue } from './expression-parser'

/**
 * Parse a condition expression: varName, not varName, $isLoggedIn, etc.
 */
export function parseCondition(ctx: ParserContext): ConditionExpr | null {
  const token = ctx.current()
  if (!token) return null

  // Handle 'not'
  if (token.type === 'CONTROL' && token.value === 'not') {
    ctx.advance() // consume 'not'
    const operand = parseCondition(ctx)
    if (!operand) return null
    return { type: 'not', operand }
  }

  // Handle variable reference ($isLoggedIn, $user.active)
  if (token.type === 'TOKEN_REF') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const op = ctx.advance().value as ConditionExpr['operator']
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: op,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  // Handle plain variable name
  if (token.type === 'COMPONENT_NAME') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const op = ctx.advance().value as ConditionExpr['operator']
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: op,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  return null
}
