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

import { tokenizeWithErrors, LexerError } from '../parser/lexer'
import { Parser } from '../parser/parser'
import { AST } from '../parser/ast'
import { Validator } from './validator'
import { ValidationResult, ValidationError, ERROR_CODES } from './types'

/**
 * Map lexer error message to error code
 */
function getLexerErrorCode(message: string): string {
  if (message.includes('Unclosed string')) return ERROR_CODES.UNCLOSED_STRING
  if (message.includes('hex') || message.includes("'#'")) return ERROR_CODES.INVALID_HEX_COLOR
  if (message.includes('Unexpected character')) return ERROR_CODES.UNKNOWN_CHARACTER
  if (message.includes('too deep')) return ERROR_CODES.INDENTATION_TOO_DEEP
  if (message.includes('decimal') || message.includes('multiple')) return ERROR_CODES.INVALID_NUMBER
  if (message.includes('Inconsistent indentation')) return ERROR_CODES.INCONSISTENT_INDENTATION
  return 'E010' // Fallback
}

/**
 * Check if a lexer error should be treated as a warning
 */
function isLexerWarning(message: string): boolean {
  // These are style suggestions, not critical errors
  return message.includes('Leading decimal') ||
         message.includes('Trailing decimal') ||
         message.includes('Inconsistent indentation')
}

/**
 * Convert lexer errors to validation errors
 */
function convertLexerErrors(lexerErrors: LexerError[]): ValidationError[] {
  return lexerErrors.map(err => ({
    severity: isLexerWarning(err.message) ? 'warning' as const : 'error' as const,
    code: getLexerErrorCode(err.message),
    message: err.message,
    line: err.line,
    column: err.column,
    suggestion: err.hint,
  }))
}

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
  // Tokenize with error collection
  const lexerResult = tokenizeWithErrors(source)
  const lexerValidationErrors = convertLexerErrors(lexerResult.errors)

  // Parse
  const parser = new Parser(lexerResult.tokens, source)
  const ast = parser.parse()

  // Validate AST
  const validator = new Validator()
  const validatorResult = validator.validate(ast)

  // Merge lexer errors into validation result
  const allErrors = [...lexerValidationErrors.filter(e => e.severity === 'error'), ...validatorResult.errors]
  const allWarnings = [...lexerValidationErrors.filter(e => e.severity === 'warning'), ...validatorResult.warnings]

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    errorCount: allErrors.length,
    warningCount: allWarnings.length,
  }
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
