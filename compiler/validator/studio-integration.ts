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

function lineColToOffset(lines: string[], line: number, col: number): number {
  let offset = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) offset += lines[i].length + 1
  return offset + Math.max(0, col - 1)
}

function getTokenEndOffset(line: string, col: number, from: number): number {
  const rest = line.slice(col - 1)
  const match = rest.match(/^\S+/)
  return from + (match ? match[0].length : 1)
}

export function toCodeMirrorDiagnostics(
  result: ValidationResult,
  source: string
): CodeMirrorDiagnostic[] {
  const lines = source.split('\n')
  const convert = (err: ValidationError): CodeMirrorDiagnostic => {
    const from = lineColToOffset(lines, err.line, err.column)
    const to = getTokenEndOffset(lines[err.line - 1] || '', err.column, from)
    return {
      from,
      to,
      severity: err.severity,
      message: err.suggestion ? `${err.message}\n${err.suggestion}` : err.message,
    }
  }
  return [...result.errors.map(convert), ...result.warnings.map(convert)]
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

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`

export function toStatusBarInfo(result: ValidationResult): StatusBarInfo {
  const { errorCount, warningCount } = result
  const hasErrors = errorCount > 0,
    hasWarnings = warningCount > 0
  let text = 'No problems',
    icon = '✓'
  if (hasErrors) {
    text = plural(errorCount, 'error') + (hasWarnings ? `, ${plural(warningCount, 'warning')}` : '')
    icon = '✗'
  } else if (hasWarnings) {
    text = plural(warningCount, 'warning')
    icon = '⚠'
  }
  return { hasErrors, hasWarnings, errorCount, warningCount, text, icon }
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
export function getQuickFixes(error: ValidationError, source: string): QuickFix[] {
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
