/**
 * Studio Integration for Validator
 *
 * Provides real-time validation for the Mirror Studio editor.
 * Integrates with CodeMirror for inline error highlighting.
 */

import { validate, validateAST, ValidationResult, ValidationError } from './index'
import { AST } from '../parser/ast'

// ============================================================================
// Debounced Validator
// ============================================================================

export interface DebouncedValidatorOptions {
  /** Debounce delay in milliseconds (default: 300) */
  delay?: number
  /** Callback when validation completes */
  onValidation?: (result: ValidationResult) => void
  /** Callback when validation starts */
  onValidationStart?: () => void
}

export class DebouncedValidator {
  private timeout: ReturnType<typeof setTimeout> | null = null
  private delay: number
  private onValidation: ((result: ValidationResult) => void) | undefined
  private onValidationStart: (() => void) | undefined
  private lastResult: ValidationResult | null = null

  constructor(options: DebouncedValidatorOptions = {}) {
    this.delay = options.delay ?? 300
    this.onValidation = options.onValidation
    this.onValidationStart = options.onValidationStart
  }

  /**
   * Schedule validation with debouncing.
   */
  validate(source: string): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.onValidationStart?.()

    this.timeout = setTimeout(() => {
      const result = validate(source)
      this.lastResult = result
      this.onValidation?.(result)
    }, this.delay)
  }

  /**
   * Validate immediately without debouncing.
   */
  validateNow(source: string): ValidationResult {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    const result = validate(source)
    this.lastResult = result
    this.onValidation?.(result)
    return result
  }

  /**
   * Validate an already-parsed AST.
   */
  validateAST(ast: AST): ValidationResult {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    const result = validateAST(ast)
    this.lastResult = result
    this.onValidation?.(result)
    return result
  }

  /**
   * Get the last validation result.
   */
  getLastResult(): ValidationResult | null {
    return this.lastResult
  }

  /**
   * Cancel any pending validation.
   */
  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  /**
   * Dispose the validator.
   */
  dispose(): void {
    this.cancel()
    this.onValidation = undefined
    this.onValidationStart = undefined
    this.lastResult = null
  }
}

// ============================================================================
// CodeMirror Integration
// ============================================================================

export interface CodeMirrorDiagnostic {
  from: number
  to: number
  severity: 'error' | 'warning' | 'info'
  message: string
  actions?: Array<{
    name: string
    apply: () => void
  }>
}

/**
 * Convert validation errors to CodeMirror diagnostics.
 */
export function toCodeMirrorDiagnostics(
  result: ValidationResult,
  source: string
): CodeMirrorDiagnostic[] {
  const lines = source.split('\n')
  const diagnostics: CodeMirrorDiagnostic[] = []

  const convertError = (err: ValidationError): CodeMirrorDiagnostic | null => {
    // Calculate character offset from line/column
    let from = 0
    for (let i = 0; i < err.line - 1 && i < lines.length; i++) {
      from += lines[i].length + 1 // +1 for newline
    }
    from += Math.max(0, err.column - 1)

    // Calculate end position (end of word or line)
    const line = lines[err.line - 1] || ''
    let to = from

    // Try to find the end of the problematic token
    const restOfLine = line.slice(err.column - 1)
    const match = restOfLine.match(/^\S+/)
    if (match) {
      to = from + match[0].length
    } else {
      to = from + 1
    }

    return {
      from,
      to,
      severity: err.severity,
      message: err.suggestion ? `${err.message}\n${err.suggestion}` : err.message,
    }
  }

  for (const err of result.errors) {
    const diag = convertError(err)
    if (diag) diagnostics.push(diag)
  }

  for (const warn of result.warnings) {
    const diag = convertError(warn)
    if (diag) diagnostics.push(diag)
  }

  return diagnostics
}

// ============================================================================
// Problem Panel Data
// ============================================================================

export interface ProblemItem {
  type: 'error' | 'warning'
  code: string
  message: string
  line: number
  column: number
  suggestion?: string
}

/**
 * Convert validation result to problem panel items.
 */
export function toProblemPanelItems(result: ValidationResult): ProblemItem[] {
  const items: ProblemItem[] = []

  for (const err of result.errors) {
    items.push({
      type: 'error',
      code: err.code,
      message: err.message,
      line: err.line,
      column: err.column,
      suggestion: err.suggestion,
    })
  }

  for (const warn of result.warnings) {
    items.push({
      type: 'warning',
      code: warn.code,
      message: warn.message,
      line: warn.line,
      column: warn.column,
      suggestion: warn.suggestion,
    })
  }

  // Sort by line, then by type (errors first)
  items.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line
    if (a.type !== b.type) return a.type === 'error' ? -1 : 1
    return 0
  })

  return items
}

// ============================================================================
// Status Bar Data
// ============================================================================

export interface StatusBarInfo {
  hasErrors: boolean
  hasWarnings: boolean
  errorCount: number
  warningCount: number
  text: string
  icon: string
}

/**
 * Get status bar information from validation result.
 */
export function toStatusBarInfo(result: ValidationResult): StatusBarInfo {
  const errorCount = result.errorCount
  const warningCount = result.warningCount

  let text: string
  let icon: string

  if (errorCount === 0 && warningCount === 0) {
    text = 'No problems'
    icon = '✓'
  } else if (errorCount > 0) {
    text = `${errorCount} error${errorCount !== 1 ? 's' : ''}`
    if (warningCount > 0) {
      text += `, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    }
    icon = '✗'
  } else {
    text = `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    icon = '⚠'
  }

  return {
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
    errorCount,
    warningCount,
    text,
    icon,
  }
}

// ============================================================================
// Quick Fixes
// ============================================================================

export interface QuickFix {
  title: string
  /** The replacement text */
  replacement: string
  /** Start position in source */
  from: number
  /** End position in source */
  to: number
}

/**
 * Generate quick fixes for validation errors.
 */
export function getQuickFixes(
  error: ValidationError,
  source: string
): QuickFix[] {
  const fixes: QuickFix[] = []
  const lines = source.split('\n')

  // Calculate character offset
  let from = 0
  for (let i = 0; i < error.line - 1 && i < lines.length; i++) {
    from += lines[i].length + 1
  }
  from += Math.max(0, error.column - 1)

  // Find the problematic token
  const line = lines[error.line - 1] || ''
  const restOfLine = line.slice(error.column - 1)
  const match = restOfLine.match(/^\S+/)
  const tokenLength = match ? match[0].length : 1
  const to = from + tokenLength

  // Extract suggestion from error
  if (error.suggestion) {
    const suggestionMatch = error.suggestion.match(/Did you mean "([^"]+)"\?/)
    if (suggestionMatch) {
      fixes.push({
        title: `Replace with "${suggestionMatch[1]}"`,
        replacement: suggestionMatch[1],
        from,
        to,
      })
    }
  }

  return fixes
}
