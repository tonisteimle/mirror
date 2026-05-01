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

import { tokenizeWithErrors, LexerError, LexerErrorCode } from '../parser/lexer'
import { Parser } from '../parser/parser'
import { AST, ParseError, ParseErrorCode } from '../parser/ast'
import { Validator } from './validator'
import { ValidationResult, ValidationError, ERROR_CODES } from './types'
import { getBuiltinComponents, getBuiltinTokens } from './builtin-prelude'

/**
 * Map lexer error category to validator error code.
 * The lexer tags each error with a stable category — no string-matching needed.
 */
const LEXER_CODE_MAP: Record<LexerErrorCode, string> = {
  'unclosed-string': ERROR_CODES.UNCLOSED_STRING,
  'invalid-hex': ERROR_CODES.INVALID_HEX_COLOR,
  'unknown-character': ERROR_CODES.UNKNOWN_CHARACTER,
  'indent-too-deep': ERROR_CODES.INDENTATION_TOO_DEEP,
  'invalid-number': ERROR_CODES.INVALID_NUMBER,
  'inconsistent-indent': ERROR_CODES.INCONSISTENT_INDENTATION,
  'invalid-indent': ERROR_CODES.INCONSISTENT_INDENTATION,
  'leading-decimal': ERROR_CODES.INVALID_NUMBER,
  'trailing-decimal': ERROR_CODES.INVALID_NUMBER,
}

/**
 * Lexer error categories that are reported as warnings, not errors —
 * style suggestions the compiler can recover from.
 */
const LEXER_WARNING_CODES: ReadonlySet<LexerErrorCode> = new Set([
  'leading-decimal',
  'trailing-decimal',
  'inconsistent-indent',
])

/**
 * Map parser error category to validator error code.
 */
const PARSER_CODE_MAP: Record<ParseErrorCode, string> = {
  'missing-colon': ERROR_CODES.MISSING_COLON,
  'unexpected-token': ERROR_CODES.UNEXPECTED_TOKEN,
  'unrecognized-definition': ERROR_CODES.PARSER_ERROR,
}

/**
 * Convert parser errors to validation errors
 */
function convertParserErrors(parserErrors: ParseError[]): ValidationError[] {
  return parserErrors.map(err => ({
    severity: 'error' as const,
    code: err.code ? PARSER_CODE_MAP[err.code] : ERROR_CODES.PARSER_ERROR,
    message: err.message,
    line: err.line,
    column: err.column,
    suggestion: err.hint,
  }))
}

/**
 * Convert lexer errors to validation errors
 */
function convertLexerErrors(lexerErrors: LexerError[]): ValidationError[] {
  return lexerErrors.map(err => ({
    severity:
      err.code && LEXER_WARNING_CODES.has(err.code) ? ('warning' as const) : ('error' as const),
    code: err.code ? LEXER_CODE_MAP[err.code] : 'E010',
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
 * Options for validate function
 */
export interface ValidateOptions {
  /** Pre-defined tokens from other files (e.g., from prelude) */
  preludeTokens?: Set<string>
  /** Pre-defined components from other files (e.g., from prelude) */
  preludeComponents?: Set<string>
}

/**
 * Validate Mirror DSL source code.
 *
 * @param source - The Mirror DSL source code to validate
 * @param options - Optional: prelude tokens/components from other files
 * @returns Validation result with errors and warnings
 */
export function validate(source: string, options?: ValidateOptions): ValidationResult {
  // Tokenize with error collection
  const lexerResult = tokenizeWithErrors(source)
  const lexerValidationErrors = convertLexerErrors(lexerResult.errors)

  // Parse
  const parser = new Parser(lexerResult.tokens, source)
  const ast = parser.parse()

  // Convert parser errors
  const parserValidationErrors = convertParserErrors(ast.errors)

  // Validate AST
  const validator = new Validator()

  // Always seed the prelude with built-in components/tokens (templates,
  // chart primitives, Zag primitives, slot aliases). User-supplied prelude
  // entries are merged on top.
  const tokens = new Set<string>(getBuiltinTokens())
  const components = new Set<string>(getBuiltinComponents())
  if (options?.preludeTokens) for (const t of options.preludeTokens) tokens.add(t)
  if (options?.preludeComponents) for (const c of options.preludeComponents) components.add(c)
  validator.setPrelude(tokens, components)

  const validatorResult = validator.validate(ast)

  // Merge lexer errors, parser errors, and validator errors
  const allErrors = [
    ...lexerValidationErrors.filter(e => e.severity === 'error'),
    ...parserValidationErrors,
    ...validatorResult.errors,
  ]
  const allWarnings = [
    ...lexerValidationErrors.filter(e => e.severity === 'warning'),
    ...validatorResult.warnings,
  ]

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
