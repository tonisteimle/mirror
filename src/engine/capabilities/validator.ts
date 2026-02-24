/**
 * Validator Capability
 *
 * Standalone validation for Mirror DSL code and AST.
 * Uses the unified validation pipeline.
 */

import { parse } from '../../parser/parser'
import { unifiedValidate } from '../../validation'
import { toMirror } from './serializer'
import type { ASTNode } from '../../parser/types'
import type { ParsedCode } from '../types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate Mirror DSL code string.
 */
export function validateCode(code: string): ValidationResult {
  // Parse first
  const parseResult = parse(code)

  // Collect parse errors as strings
  const errors: string[] = [...parseResult.errors]

  // Run unified validation on the parse result
  const validation = unifiedValidate(parseResult, { mode: 'ast', includeInfo: false })

  // Add validation errors
  validation.diagnostics.forEach(diag => {
    if (diag.severity === 'error') {
      errors.push(`Line ${diag.location.line}: ${diag.message}`)
    }
  })

  // Collect warnings from parse issues and validation
  const warnings: string[] = parseResult.parseIssues.map(
    (issue) => `Line ${issue.line}: ${issue.message}`
  )

  validation.diagnostics.forEach(diag => {
    if (diag.severity === 'warning') {
      warnings.push(`Line ${diag.location.line}: ${diag.message}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate AST nodes by serializing and reparsing.
 *
 * This ensures the AST can be round-tripped correctly.
 */
export function validateNodes(nodes: ASTNode[]): ValidationResult {
  try {
    const code = toMirror(nodes)
    return validateCode(code)
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    }
  }
}

/**
 * Validate a ParsedCode result.
 */
export function validateParsed(parsed: ParsedCode): ValidationResult {
  if (!parsed.valid) {
    return {
      valid: false,
      errors: parsed.errors,
      warnings: [],
    }
  }

  // Re-validate the nodes for extra safety
  return validateNodes(parsed.nodes)
}

/**
 * Quick check if code is valid.
 */
export function isValid(code: string): boolean {
  return validateCode(code).valid
}
