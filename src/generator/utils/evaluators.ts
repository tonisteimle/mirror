/**
 * Expression and condition evaluators for the DSL runtime.
 */

import type { SyntheticEvent } from 'react'
import type { ConditionExpr, Expression } from '../../parser/parser'

/**
 * Get nested value from object by path.
 * Supports dot notation paths like ["user", "profile", "name"].
 */
export function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let value: unknown = obj
  for (const key of path) {
    if (value === null || value === undefined) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

/**
 * Get value from React event object.
 * Supports shortcuts like "value" -> "target.value".
 */
export function getEventValue(event: SyntheticEvent, path: string[]): unknown {
  if (path.length === 0) return event

  const first = path[0]

  // Common shortcuts
  if (first === 'value') {
    // $event.value is shorthand for $event.target.value
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    return target?.value
  }

  if (first === 'checked') {
    // $event.checked is shorthand for $event.target.checked
    const target = event.target as HTMLInputElement
    return target?.checked
  }

  // Navigate through the event object
  let value: unknown = event
  for (const key of path) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return value
}

/**
 * Evaluate a condition expression against variables.
 * Returns true/false based on the condition.
 */
export function evaluateCondition(
  condition: ConditionExpr,
  variables: Record<string, unknown>
): boolean {
  switch (condition.type) {
    case 'var': {
      // Support dot notation in variable names
      const varName = condition.name || ''
      const value = getNestedValue(variables, varName.split('.'))
      return Boolean(value)
    }
    case 'not':
      return !evaluateCondition(condition.operand!, variables)
    case 'and':
      return evaluateCondition(condition.left!, variables) && evaluateCondition(condition.right!, variables)
    case 'or':
      return evaluateCondition(condition.left!, variables) || evaluateCondition(condition.right!, variables)
    case 'comparison': {
      const leftVal = condition.left?.type === 'var'
        ? getNestedValue(variables, (condition.left.name || '').split('.'))
        : condition.left
      const rightVal = condition.value
      switch (condition.operator) {
        case '==': return leftVal === rightVal
        case '!=': return leftVal !== rightVal
        case '>': return Number(leftVal) > Number(rightVal)
        case '<': return Number(leftVal) < Number(rightVal)
        case '>=': return Number(leftVal) >= Number(rightVal)
        case '<=': return Number(leftVal) <= Number(rightVal)
        default: return false
      }
    }
    default:
      return false
  }
}

/**
 * Evaluate an expression to get its value.
 * Supports literals, variables, property access, and binary operations.
 */
export function evaluateExpression(
  expr: Expression,
  variables: Record<string, unknown>,
  event?: SyntheticEvent
): unknown {
  switch (expr.type) {
    case 'literal':
      return expr.value

    case 'variable': {
      const name = expr.name || ''
      // Handle $event reference
      if (name === 'event' && event) {
        return event
      }
      return variables[name]
    }

    case 'property_access': {
      const path = expr.path || []
      // Handle $event.X property access
      if (path[0] === 'event' && event) {
        return getEventValue(event, path.slice(1))
      }
      return getNestedValue(variables, path)
    }

    case 'binary': {
      const leftVal = evaluateExpression(expr.left!, variables, event)
      const rightVal = evaluateExpression(expr.right!, variables, event)

      // For + operator, check if either operand is a string → string concatenation
      if (expr.operator === '+') {
        if (typeof leftVal === 'string' || typeof rightVal === 'string') {
          return String(leftVal ?? '') + String(rightVal ?? '')
        }
      }

      // For arithmetic, convert to numbers
      const l = Number(leftVal)
      const r = Number(rightVal)
      switch (expr.operator) {
        case '+': return l + r
        case '-': return l - r
        case '*': return l * r
        case '/': return r !== 0 ? l / r : 0
        default: return 0
      }
    }

    case 'unary': {
      const operandVal = evaluateExpression(expr.operand!, variables, event)
      if (expr.operator === 'not') {
        return !operandVal
      }
      return undefined
    }
  }
  return undefined
}
