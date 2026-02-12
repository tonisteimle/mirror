/**
 * Parser Errors Module
 *
 * Professional-grade error handling with:
 * - Structured error types with severity levels
 * - Source location tracking (line, column, end positions)
 * - Code context snippets with caret highlighting
 * - Helpful suggestions for common mistakes
 * - Error recovery support
 */

import type { Token } from './lexer'

// ============================================
// Error Severity Levels
// ============================================

export type ErrorSeverity = 'error' | 'warning' | 'info'

// ============================================
// Structured Parse Error
// ============================================

export interface ParseError {
  /** Error severity: error (blocks compilation), warning (advisory), info (informational) */
  severity: ErrorSeverity
  /** Error code for programmatic handling (e.g., 'E001', 'W002') */
  code: string
  /** Human-readable error message */
  message: string
  /** Source location */
  location: {
    line: number      // 1-indexed for display
    column: number    // 1-indexed for display
    endLine?: number
    endColumn?: number
  }
  /** The source text that caused the error */
  source?: string
  /** Helpful suggestion for fixing the error */
  hint?: string
}

// ============================================
// Error Codes
// ============================================

export const ErrorCodes = {
  // Lexer errors (L0xx)
  UNTERMINATED_STRING: 'L001',
  INVALID_CHARACTER: 'L002',
  INVALID_NUMBER: 'L003',

  // Parser errors (P0xx)
  UNEXPECTED_TOKEN: 'P001',
  MISSING_COMPONENT_NAME: 'P002',
  INVALID_PROPERTY_VALUE: 'P003',
  UNCLOSED_BLOCK: 'P004',
  INVALID_INDENT: 'P005',

  // Semantic errors (S0xx)
  UNDEFINED_TOKEN: 'S001',
  UNDEFINED_COMPONENT: 'S002',
  DUPLICATE_DEFINITION: 'S003',
  CIRCULAR_REFERENCE: 'S004',
  TYPE_MISMATCH: 'S005',
  CANNOT_INFER_PROPERTY: 'S006',

  // Warnings (W0xx)
  UNUSED_TOKEN: 'W001',
  DEPRECATED_SYNTAX: 'W002',
  POSSIBLE_TYPO: 'W003',
} as const

// ============================================
// Error Factory Functions
// ============================================

/**
 * Create a structured parse error.
 */
export function createError(
  severity: ErrorSeverity,
  code: string,
  message: string,
  line: number,
  column: number,
  options?: {
    endLine?: number
    endColumn?: number
    source?: string
    hint?: string
  }
): ParseError {
  return {
    severity,
    code,
    message,
    location: {
      line: line + 1,  // Convert to 1-indexed
      column: column + 1,
      endLine: options?.endLine !== undefined ? options.endLine + 1 : undefined,
      endColumn: options?.endColumn !== undefined ? options.endColumn + 1 : undefined,
    },
    source: options?.source,
    hint: options?.hint,
  }
}

/**
 * Create an error from a token.
 */
export function createErrorFromToken(
  severity: ErrorSeverity,
  code: string,
  message: string,
  token: Token,
  options?: { hint?: string; source?: string }
): ParseError {
  return createError(severity, code, message, token.line, token.column, {
    endColumn: token.column + token.value.length,
    ...options,
  })
}

// ============================================
// Error Formatting
// ============================================

/**
 * Format a parse error for display with code context.
 */
export function formatError(error: ParseError, sourceLines?: string[]): string {
  const parts: string[] = []

  // Header: severity, code, location
  const severityLabel = error.severity.toUpperCase()
  const locationStr = `${error.location.line}:${error.location.column}`
  parts.push(`${severityLabel} [${error.code}] at line ${locationStr}: ${error.message}`)

  // Code context (if source lines available)
  if (sourceLines && error.location.line <= sourceLines.length) {
    const lineIndex = error.location.line - 1
    const sourceLine = sourceLines[lineIndex]

    if (sourceLine !== undefined) {
      // Line number gutter
      const lineNum = String(error.location.line).padStart(4, ' ')
      parts.push(`${lineNum} | ${sourceLine}`)

      // Caret line pointing to error
      const caretCol = error.location.column - 1
      const caretLen = error.location.endColumn
        ? Math.max(1, error.location.endColumn - error.location.column)
        : Math.max(1, error.source?.length || 1)
      const caret = ' '.repeat(caretCol) + '^'.repeat(caretLen)
      parts.push(`     | ${caret}`)
    }
  }

  // Hint
  if (error.hint) {
    parts.push(`Hint: ${error.hint}`)
  }

  return parts.join('\n')
}

/**
 * Format multiple errors for display.
 */
export function formatErrors(errors: ParseError[], sourceLines?: string[]): string {
  return errors.map(e => formatError(e, sourceLines)).join('\n\n')
}

/**
 * Convert structured error to simple string (backwards compatibility).
 */
export function errorToString(error: ParseError): string {
  const prefix = error.severity === 'error' ? 'Error' :
                 error.severity === 'warning' ? 'Warning' : 'Info'
  return `${prefix}: Line ${error.location.line}: ${error.message}`
}

// ============================================
// Error Collection
// ============================================

/**
 * Error collector for accumulating errors during parsing.
 * Supports error recovery by continuing after errors.
 */
export class ErrorCollector {
  private errors: ParseError[] = []
  private sourceLines: string[] = []

  constructor(source?: string) {
    if (source) {
      this.sourceLines = source.split('\n')
    }
  }

  /** Add an error */
  add(error: ParseError): void {
    this.errors.push(error)
  }

  /** Add an error with shorthand syntax */
  addError(
    code: string,
    message: string,
    line: number,
    column: number,
    options?: { hint?: string; source?: string; endColumn?: number }
  ): void {
    this.add(createError('error', code, message, line, column, options))
  }

  /** Add a warning with shorthand syntax */
  addWarning(
    code: string,
    message: string,
    line: number,
    column: number,
    options?: { hint?: string; source?: string }
  ): void {
    this.add(createError('warning', code, message, line, column, options))
  }

  /** Check if there are any errors (not warnings) */
  hasErrors(): boolean {
    return this.errors.some(e => e.severity === 'error')
  }

  /** Check if there are any issues (errors or warnings) */
  hasIssues(): boolean {
    return this.errors.length > 0
  }

  /** Get all errors */
  getErrors(): ParseError[] {
    return [...this.errors]
  }

  /** Get only errors (not warnings) */
  getErrorsOnly(): ParseError[] {
    return this.errors.filter(e => e.severity === 'error')
  }

  /** Get only warnings */
  getWarnings(): ParseError[] {
    return this.errors.filter(e => e.severity === 'warning')
  }

  /** Get errors sorted by line number */
  getSorted(): ParseError[] {
    return [...this.errors].sort((a, b) => {
      if (a.location.line !== b.location.line) {
        return a.location.line - b.location.line
      }
      return a.location.column - b.location.column
    })
  }

  /** Convert to simple string array (backwards compatibility) */
  toStringArray(): string[] {
    return this.getSorted().map(errorToString)
  }

  /** Format all errors for display */
  format(): string {
    return formatErrors(this.getSorted(), this.sourceLines)
  }

  /** Clear all errors */
  clear(): void {
    this.errors = []
  }
}

// ============================================
// Common Error Helpers
// ============================================

/**
 * Create an "undefined token" error with suggestion.
 */
export function undefinedTokenError(tokenName: string, token: Token): ParseError {
  return createErrorFromToken(
    'warning',
    ErrorCodes.UNDEFINED_TOKEN,
    `Token "$${tokenName}" is not defined`,
    token,
    {
      hint: `Define it with: $${tokenName}: <value>`,
    }
  )
}

/**
 * Create a "cannot infer property" error with suggestion.
 */
export function cannotInferPropertyError(tokenName: string, token: Token): ParseError {
  return createErrorFromToken(
    'warning',
    ErrorCodes.CANNOT_INFER_PROPERTY,
    `Cannot infer property for token "$${tokenName}"`,
    token,
    {
      hint: `Add a suffix like '-col', '-pad', '-rad', or use explicit property: col $${tokenName}`,
    }
  )
}

/**
 * Create an "unexpected token" error.
 */
export function unexpectedTokenError(token: Token, expected?: string): ParseError {
  const message = expected
    ? `Unexpected token "${token.value}", expected ${expected}`
    : `Unexpected token "${token.value}"`

  return createErrorFromToken('error', ErrorCodes.UNEXPECTED_TOKEN, message, token)
}

/**
 * Create a "duplicate definition" error.
 */
export function duplicateDefinitionError(
  name: string,
  firstLine: number,
  secondLine: number,
  token: Token
): ParseError {
  return createErrorFromToken(
    'error',
    ErrorCodes.DUPLICATE_DEFINITION,
    `Duplicate definition of "${name}" (first defined on line ${firstLine + 1})`,
    token
  )
}
