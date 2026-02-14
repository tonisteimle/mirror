/**
 * Condition Parser Module
 *
 * Parses conditional expressions:
 * - Simple variable checks ($isLoggedIn)
 * - Negation (not $isLoggedIn)
 * - Comparisons ($count > 0, $status == "active")
 * - Logical operators (and, or)
 */

import type { ParserContext } from './parser-context'
import type { ConditionExpr } from './types'
import { isComparisonOperator } from './types'
import { parseValue } from './expression-parser'

/**
 * Parse a single (atomic) condition: var, not var, comparison
 */
function parseAtomicCondition(ctx: ParserContext): ConditionExpr | null {
  const token = ctx.current()
  if (!token) return null

  // Handle 'not'
  if (token.type === 'CONTROL' && token.value === 'not') {
    ctx.advance() // consume 'not'
    const operand = parseAtomicCondition(ctx)
    if (!operand) return null
    return { type: 'not', operand }
  }

  // Handle variable reference ($isLoggedIn, $user.active)
  if (token.type === 'TOKEN_REF') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const opToken = ctx.advance()
      const opValue = opToken.value
      if (!isComparisonOperator(opValue)) {
        ctx.addWarning(
          'P001',
          `Unknown comparison operator "${opValue}"`,
          opToken,
          `Valid operators: ==, !=, >, <, >=, <=`
        )
        return null
      }
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: opValue,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  // Handle plain variable name (ComponentName.property or plain name)
  if (token.type === 'COMPONENT_NAME') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const opToken = ctx.advance()
      const opValue = opToken.value
      if (!isComparisonOperator(opValue)) {
        ctx.addWarning(
          'P001',
          `Unknown comparison operator "${opValue}"`,
          opToken,
          `Valid operators: ==, !=, >, <, >=, <=`
        )
        return null
      }
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: opValue,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  return null
}

/**
 * Parse a condition expression with logical operators (and, or)
 */
export function parseCondition(ctx: ParserContext): ConditionExpr | null {
  const left = parseAtomicCondition(ctx)
  if (!left) return null

  // Check for 'and' or 'or'
  const current = ctx.current()
  if (current?.type === 'CONTROL' && (current.value === 'and' || current.value === 'or')) {
    const operator = ctx.advance().value as 'and' | 'or'
    const right = parseCondition(ctx) // recursive to handle chains
    if (!right) return left // if no right side, just return left

    return {
      type: operator,
      left,
      right
    }
  }

  return left
}
