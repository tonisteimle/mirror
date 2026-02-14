/**
 * Type Validator
 *
 * Validates type compatibility in expressions and comparisons.
 */

import type { ASTNode, ParseResult, ConditionExpr, Expression } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'

// ============================================
// Type Validator
// ============================================

type ValueType = 'string' | 'number' | 'boolean' | 'color' | 'unknown'

/**
 * Validate type compatibility in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateTypes(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Validate all nodes
  for (const node of result.nodes) {
    validateNodeTypes(node, diagnostics)
  }

  // Separate by severity
  const errors = diagnostics.filter(d => d.severity === 'error')
  const warnings = diagnostics.filter(d => d.severity === 'warning')
  const info = diagnostics.filter(d => d.severity === 'info')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  }
}

function validateNodeTypes(node: ASTNode, diagnostics: ValidationDiagnostic[]): void {
  const line = node.line || 0

  // Validate conditions
  if (node.condition) {
    validateConditionTypes(node.condition, line, diagnostics)
  }

  // Validate conditional properties
  if (node.conditionalProperties) {
    for (const condProp of node.conditionalProperties) {
      validateConditionTypes(condProp.condition, line, diagnostics)
    }
  }

  // Validate event handler conditions
  if (node.eventHandlers) {
    for (const handler of node.eventHandlers) {
      for (const action of handler.actions) {
        if ('condition' in action) {
          const conditional = action as { condition: ConditionExpr }
          validateConditionTypes(conditional.condition, handler.line || line, diagnostics)
        }
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeTypes(child, diagnostics)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeTypes(child, diagnostics)
    }
  }
}

function validateConditionTypes(
  cond: ConditionExpr,
  line: number,
  diagnostics: ValidationDiagnostic[]
): void {
  switch (cond.type) {
    case 'comparison':
      validateComparisonTypes(cond, line, diagnostics)
      break
    case 'not':
      if (cond.operand) {
        validateConditionTypes(cond.operand, line, diagnostics)
      }
      break
    case 'and':
    case 'or':
      if (cond.left) validateConditionTypes(cond.left, line, diagnostics)
      if (cond.right) validateConditionTypes(cond.right, line, diagnostics)
      break
  }
}

function validateComparisonTypes(
  cond: ConditionExpr,
  line: number,
  diagnostics: ValidationDiagnostic[]
): void {
  if (cond.type !== 'comparison') return

  const leftType = inferConditionType(cond.left)
  const rightType = cond.value !== undefined
    ? inferValueType(cond.value)
    : inferConditionType(cond.right)

  // Check type compatibility
  if (leftType !== 'unknown' && rightType !== 'unknown' && leftType !== rightType) {
    diagnostics.push(
      DiagnosticBuilder
        .warning(ValidatorErrorCodes.COMPARISON_TYPE_MISMATCH, 'type')
        .message(`Comparing ${leftType} with ${rightType} may produce unexpected results`)
        .at(line, 0)
        .build()
    )
  }

  // Check operator validity for types
  if (cond.operator) {
    const numericOperators = ['>', '<', '>=', '<=']
    if (numericOperators.includes(cond.operator)) {
      if (leftType === 'string' && rightType === 'string') {
        diagnostics.push(
          DiagnosticBuilder
            .info(ValidatorErrorCodes.INVALID_OPERATOR_FOR_TYPE, 'type')
            .message(`Numeric comparison "${cond.operator}" on strings compares lexicographically`)
            .at(line, 0)
            .build()
        )
      }
      if (leftType === 'boolean' || rightType === 'boolean') {
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.INVALID_OPERATOR_FOR_TYPE, 'type')
            .message(`Numeric comparison "${cond.operator}" is not meaningful for booleans`)
            .at(line, 0)
            .build()
        )
      }
    }
  }
}

function inferConditionType(cond: ConditionExpr | undefined): ValueType {
  if (!cond) return 'unknown'

  switch (cond.type) {
    case 'var':
      // Variable types are unknown without runtime info
      return 'unknown'
    case 'comparison':
      // Comparisons return boolean
      return 'boolean'
    case 'not':
    case 'and':
    case 'or':
      return 'boolean'
    default:
      return 'unknown'
  }
}

function inferValueType(value: string | number | boolean): ValueType {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    // Check if it's a color
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      return 'color'
    }
    // Check if it's a numeric string
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return 'number'
    }
    return 'string'
  }
  return 'unknown'
}

/**
 * Validate expression types (for assign actions)
 */
export function validateExpressionTypes(
  expr: Expression,
  expectedType: ValueType,
  line: number,
  diagnostics: ValidationDiagnostic[]
): void {
  const actualType = inferExpressionType(expr)

  if (actualType !== 'unknown' && expectedType !== 'unknown' && actualType !== expectedType) {
    diagnostics.push(
      DiagnosticBuilder
        .warning(ValidatorErrorCodes.COMPARISON_TYPE_MISMATCH, 'type')
        .message(`Expected ${expectedType} but expression evaluates to ${actualType}`)
        .at(line, 0)
        .build()
    )
  }

  // Check for division by zero
  if (expr.type === 'binary' && expr.operator === '/' && expr.right) {
    if (expr.right.type === 'literal' && expr.right.value === 0) {
      diagnostics.push(
        DiagnosticBuilder
          .error(ValidatorErrorCodes.DIVISION_BY_ZERO, 'type')
          .message('Division by zero')
          .at(line, 0)
          .build()
      )
    }
  }
}

function inferExpressionType(expr: Expression): ValueType {
  switch (expr.type) {
    case 'literal':
      return inferValueType(expr.value as string | number | boolean)
    case 'variable':
      return 'unknown'
    case 'binary':
      // Arithmetic operators return numbers
      if (['+', '-', '*', '/'].includes(expr.operator || '')) {
        return 'number'
      }
      return 'unknown'
    case 'unary':
      if (expr.operator === 'not') return 'boolean'
      return 'unknown'
    case 'property_access':
    case 'component_property':
      return 'unknown'
    default:
      return 'unknown'
  }
}
