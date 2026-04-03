/**
 * Mirror Validator
 *
 * Public API for validating Mirror DSL code.
 *
 * Usage:
 *   import { validate, Validator } from './validator'
 *
 *   // Simple validation
 *   const result = validate('Box w 100 h 100 bg #333')
 *   if (!result.valid) {
 *     console.log(result.errors)
 *   }
 *
 *   // Reusable validator instance
 *   const validator = new Validator()
 *   const result1 = validator.validate(ast1)
 *   const result2 = validator.validate(ast2)
 */

import { tokenize } from '../parser/lexer'
import { Parser } from '../parser/parser'
import { AST } from '../parser/ast'
import { Validator } from './validator'
import { ValidationResult, ValidationError, ERROR_CODES } from './types'

// Re-export types
export { Validator } from './validator'
export { ERROR_CODES } from './types'
export type { ValidationResult, ValidationError, ErrorCode } from './types'
export { generateValidationRules, clearRulesCache } from './generator'

// Studio integration
export {
  DebouncedValidator,
  toCodeMirrorDiagnostics,
  toProblemPanelItems,
  toStatusBarInfo,
  getQuickFixes,
} from './studio-integration'

export type {
  DebouncedValidatorOptions,
  CodeMirrorDiagnostic,
  ProblemItem,
  StatusBarInfo,
  QuickFix,
} from './studio-integration'

/**
 * Validate Mirror DSL source code.
 *
 * @param source - The Mirror DSL source code to validate
 * @returns Validation result with errors and warnings
 */
export function validate(source: string): ValidationResult {
  const tokens = tokenize(source)
  const parser = new Parser(tokens, source)
  const ast = parser.parse()

  const validator = new Validator()
  return validator.validate(ast)
}

/**
 * Validate an already-parsed AST.
 *
 * @param ast - The parsed AST to validate
 * @returns Validation result with errors and warnings
 */
export function validateAST(ast: AST): ValidationResult {
  const validator = new Validator()
  return validator.validate(ast)
}

/**
 * Format validation errors for console output.
 *
 * @param result - Validation result
 * @param source - Original source code (optional, for context)
 * @returns Formatted error string
 */
export function formatErrors(result: ValidationResult, source?: string): string {
  if (result.valid && result.warnings.length === 0) {
    return 'No errors or warnings'
  }

  const lines = source?.split('\n') || []
  const output: string[] = []

  const formatError = (err: ValidationError): string => {
    const prefix = err.severity === 'error' ? '✗' : '⚠'
    const color = err.severity === 'error' ? 'error' : 'warning'

    let msg = `${prefix} [${err.code}] ${err.message} (line ${err.line}, col ${err.column})`

    if (err.suggestion) {
      msg += `\n  → ${err.suggestion}`
    }

    // Add source context if available
    if (lines.length >= err.line) {
      const sourceLine = lines[err.line - 1]
      if (sourceLine) {
        msg += `\n  ${err.line} | ${sourceLine}`
        msg += `\n  ${' '.repeat(String(err.line).length)} | ${' '.repeat(err.column - 1)}^`
      }
    }

    return msg
  }

  if (result.errors.length > 0) {
    output.push(`Errors (${result.errors.length}):`)
    for (const err of result.errors) {
      output.push(formatError(err))
    }
  }

  if (result.warnings.length > 0) {
    if (output.length > 0) output.push('')
    output.push(`Warnings (${result.warnings.length}):`)
    for (const warn of result.warnings) {
      output.push(formatError(warn))
    }
  }

  return output.join('\n')
}

/**
 * Create a streaming validator for IDE integration.
 * Returns a function that validates ASTs efficiently.
 */
export function createValidator(): (ast: AST) => ValidationResult {
  const validator = new Validator()
  return (ast: AST) => validator.validate(ast)
}
