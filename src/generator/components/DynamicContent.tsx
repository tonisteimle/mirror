/**
 * DynamicContent Component
 *
 * Renders content that contains expressions (e.g., "Query: " + $query).
 * Evaluates the expression using runtime variables.
 */

import React from 'react'
import type { Expression } from '../../parser/types'
import { useRuntimeVariables } from '../runtime-context'
import { evaluateExpression } from '../utils/evaluators'
import { sanitizeTextContent } from '../../utils/sanitize'

interface DynamicContentProps {
  expression: Expression
}

/**
 * Component that evaluates and renders a content expression.
 * Uses runtime variables from context to resolve variable references.
 */
export function DynamicContent({ expression }: DynamicContentProps) {
  const { variables } = useRuntimeVariables()

  const value = evaluateExpression(expression, variables)
  const content = value != null ? String(value) : ''

  return <>{sanitizeTextContent(content)}</>
}
