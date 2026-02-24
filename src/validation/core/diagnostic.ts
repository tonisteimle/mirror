/**
 * @module validation/core/diagnostic
 * @description Unified Diagnostic Structure for all validation systems
 *
 * This is the SINGLE diagnostic type used across:
 * - Parser errors (lexer, parser, semantic)
 * - Validator diagnostics (property, reference, event, action, state, animation)
 * - LLM output validation and correction
 * - Editor real-time validation
 */

// ============================================
// Diagnostic Categories
// ============================================

export type DiagnosticCategory =
  // Parser categories
  | 'lexer'       // L0xx - tokenization errors
  | 'parser'      // P0xx - parsing errors
  | 'semantic'    // S0xx - semantic analysis
  // Validator categories
  | 'property'    // V001-V009 - property validation
  | 'library'     // V010-V019 - library component validation
  | 'reference'   // V020-V029 - token/component references
  | 'event'       // V030-V039 - event validation
  | 'action'      // V040-V049 - action validation
  | 'type'        // V050-V059 - type checking
  | 'state'       // V060-V069 - state validation
  | 'animation'   // V070-V079 - animation validation
  // Corrector categories
  | 'correction'  // C0xx - auto-correction diagnostics

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

// ============================================
// Unified Diagnostic Interface
// ============================================

export interface Diagnostic {
  /** Severity level: error (blocks), warning (advisory), info (informational) */
  severity: DiagnosticSeverity

  /** Error code for programmatic handling (e.g., 'V001', 'P001', 'C001') */
  code: string

  /** Category for filtering and grouping */
  category: DiagnosticCategory

  /** Human-readable error message */
  message: string

  /** Source location */
  location: DiagnosticLocation

  /** The source text that caused the error */
  source?: string

  /** Suggested fixes */
  suggestions?: DiagnosticSuggestion[]

  /** Additional context for error messages and fixes */
  context?: DiagnosticContext
}

export interface DiagnosticLocation {
  /** Line number (1-indexed) */
  line: number
  /** Column number (1-indexed) */
  column: number
  /** End line (for range highlighting) */
  endLine?: number
  /** End column (for range highlighting) */
  endColumn?: number
}

export interface DiagnosticSuggestion {
  /** Human-readable description of the fix */
  label: string
  /** The suggested replacement text */
  replacement: string
  /** Confidence level (0-1) for auto-correction */
  confidence?: number
}

export interface DiagnosticContext {
  /** List of valid alternatives (for typo suggestions) */
  validOptions?: string[]
  /** Expected type name */
  expectedType?: string
  /** Actual value provided */
  actualValue?: string
  /** Related property name */
  property?: string
  /** Related component name */
  component?: string
  /** Related token name */
  token?: string
  /** Related event name */
  event?: string
  /** Related action name */
  action?: string
}

// ============================================
// Diagnostic Builder (Fluent API)
// ============================================

export class DiagnosticBuilder {
  private diagnostic: Partial<Diagnostic> = {}

  static error(code: string, message: string): DiagnosticBuilder {
    return new DiagnosticBuilder().withSeverity('error').withCode(code).withMessage(message)
  }

  static warning(code: string, message: string): DiagnosticBuilder {
    return new DiagnosticBuilder().withSeverity('warning').withCode(code).withMessage(message)
  }

  static info(code: string, message: string): DiagnosticBuilder {
    return new DiagnosticBuilder().withSeverity('info').withCode(code).withMessage(message)
  }

  withSeverity(severity: DiagnosticSeverity): this {
    this.diagnostic.severity = severity
    return this
  }

  withCode(code: string): this {
    this.diagnostic.code = code
    // Infer category from code prefix
    this.diagnostic.category = inferCategoryFromCode(code)
    return this
  }

  withMessage(message: string): this {
    this.diagnostic.message = message
    return this
  }

  withCategory(category: DiagnosticCategory): this {
    this.diagnostic.category = category
    return this
  }

  at(line: number, column: number): this {
    this.diagnostic.location = { line, column }
    return this
  }

  atRange(line: number, column: number, endLine: number, endColumn: number): this {
    this.diagnostic.location = { line, column, endLine, endColumn }
    return this
  }

  withSource(source: string): this {
    this.diagnostic.source = source
    return this
  }

  suggest(label: string, replacement: string, confidence?: number): this {
    if (!this.diagnostic.suggestions) {
      this.diagnostic.suggestions = []
    }
    this.diagnostic.suggestions.push({ label, replacement, confidence })
    return this
  }

  withContext(context: DiagnosticContext): this {
    this.diagnostic.context = { ...this.diagnostic.context, ...context }
    return this
  }

  build(): Diagnostic {
    if (!this.diagnostic.severity) throw new Error('Diagnostic requires severity')
    if (!this.diagnostic.code) throw new Error('Diagnostic requires code')
    if (!this.diagnostic.message) throw new Error('Diagnostic requires message')
    if (!this.diagnostic.location) {
      this.diagnostic.location = { line: 1, column: 1 }
    }
    if (!this.diagnostic.category) {
      this.diagnostic.category = 'parser'
    }
    return this.diagnostic as Diagnostic
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Infer category from error code prefix
 */
function inferCategoryFromCode(code: string): DiagnosticCategory {
  const prefix = code.charAt(0)
  switch (prefix) {
    case 'L': return 'lexer'
    case 'P': return 'parser'
    case 'S': return 'semantic'
    case 'V': {
      // V001-V009: property, V010-V019: library, etc.
      const num = parseInt(code.slice(1), 10)
      if (num < 10) return 'property'
      if (num < 20) return 'library'
      if (num < 30) return 'reference'
      if (num < 40) return 'event'
      if (num < 50) return 'action'
      if (num < 60) return 'type'
      if (num < 70) return 'state'
      return 'animation'
    }
    case 'C': return 'correction'
    case 'W': return 'semantic' // Warnings typically semantic
    default: return 'parser'
  }
}

/**
 * Create a simple diagnostic
 */
export function createDiagnostic(
  severity: DiagnosticSeverity,
  code: string,
  message: string,
  line: number,
  column: number,
  options?: {
    endLine?: number
    endColumn?: number
    source?: string
    suggestions?: DiagnosticSuggestion[]
    context?: DiagnosticContext
  }
): Diagnostic {
  return {
    severity,
    code,
    category: inferCategoryFromCode(code),
    message,
    location: {
      line,
      column,
      endLine: options?.endLine,
      endColumn: options?.endColumn,
    },
    source: options?.source,
    suggestions: options?.suggestions,
    context: options?.context,
  }
}

/**
 * Sort diagnostics by location
 */
export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.location.line !== b.location.line) {
      return a.location.line - b.location.line
    }
    return a.location.column - b.location.column
  })
}

/**
 * Filter diagnostics by severity
 */
export function filterBySeverity(
  diagnostics: Diagnostic[],
  severity: DiagnosticSeverity
): Diagnostic[] {
  return diagnostics.filter(d => d.severity === severity)
}

/**
 * Filter diagnostics by category
 */
export function filterByCategory(
  diagnostics: Diagnostic[],
  categories: DiagnosticCategory[]
): Diagnostic[] {
  return diagnostics.filter(d => categories.includes(d.category))
}

/**
 * Check if diagnostics contain errors
 */
export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(d => d.severity === 'error')
}

/**
 * Get only errors from diagnostics
 */
export function getErrors(diagnostics: Diagnostic[]): Diagnostic[] {
  return filterBySeverity(diagnostics, 'error')
}

/**
 * Get only warnings from diagnostics
 */
export function getWarnings(diagnostics: Diagnostic[]): Diagnostic[] {
  return filterBySeverity(diagnostics, 'warning')
}
