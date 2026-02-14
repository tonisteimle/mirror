/**
 * Diagnostic Builder
 *
 * Fluent API for creating validation diagnostics.
 */

import type { ValidationDiagnostic, ValidationCategory, FixSuggestion } from '../types'

/**
 * Builder for creating validation diagnostics with a fluent API.
 */
export class DiagnosticBuilder {
  private diagnostic: Partial<ValidationDiagnostic> = {}

  private constructor() {}

  /**
   * Start building an error diagnostic
   */
  static error(code: string, category: ValidationCategory): DiagnosticBuilder {
    const builder = new DiagnosticBuilder()
    builder.diagnostic.severity = 'error'
    builder.diagnostic.code = code
    builder.diagnostic.category = category
    return builder
  }

  /**
   * Start building a warning diagnostic
   */
  static warning(code: string, category: ValidationCategory): DiagnosticBuilder {
    const builder = new DiagnosticBuilder()
    builder.diagnostic.severity = 'warning'
    builder.diagnostic.code = code
    builder.diagnostic.category = category
    return builder
  }

  /**
   * Start building an info diagnostic
   */
  static info(code: string, category: ValidationCategory): DiagnosticBuilder {
    const builder = new DiagnosticBuilder()
    builder.diagnostic.severity = 'info'
    builder.diagnostic.code = code
    builder.diagnostic.category = category
    return builder
  }

  /**
   * Set the error message
   */
  message(msg: string): this {
    this.diagnostic.message = msg
    return this
  }

  /**
   * Set the location
   */
  at(line: number, column: number, endLine?: number, endColumn?: number): this {
    this.diagnostic.location = {
      line: line + 1,  // Convert to 1-indexed
      column: column + 1,
      endLine: endLine !== undefined ? endLine + 1 : undefined,
      endColumn: endColumn !== undefined ? endColumn + 1 : undefined
    }
    return this
  }

  /**
   * Set location from 1-indexed values (already display-ready)
   */
  atDisplay(line: number, column: number, endLine?: number, endColumn?: number): this {
    this.diagnostic.location = { line, column, endLine, endColumn }
    return this
  }

  /**
   * Set the source text
   */
  source(text: string): this {
    this.diagnostic.source = text
    return this
  }

  /**
   * Add valid options context
   */
  withValidOptions(options: string[]): this {
    this.diagnostic.context = {
      ...this.diagnostic.context,
      validOptions: options
    }
    return this
  }

  /**
   * Add expected type context
   */
  withExpectedType(type: string): this {
    this.diagnostic.context = {
      ...this.diagnostic.context,
      expectedType: type
    }
    return this
  }

  /**
   * Add actual value context
   */
  withActualValue(value: string): this {
    this.diagnostic.context = {
      ...this.diagnostic.context,
      actualValue: value
    }
    return this
  }

  /**
   * Add property name context
   */
  withProperty(name: string): this {
    this.diagnostic.context = {
      ...this.diagnostic.context,
      propertyName: name
    }
    return this
  }

  /**
   * Add component name context
   */
  withComponent(name: string): this {
    this.diagnostic.context = {
      ...this.diagnostic.context,
      componentName: name
    }
    return this
  }

  /**
   * Add a fix suggestion
   */
  suggest(label: string, replacement: string): this {
    if (!this.diagnostic.suggestions) {
      this.diagnostic.suggestions = []
    }
    this.diagnostic.suggestions.push({ label, replacement })
    return this
  }

  /**
   * Add multiple fix suggestions
   */
  suggestAll(suggestions: FixSuggestion[]): this {
    this.diagnostic.suggestions = [
      ...(this.diagnostic.suggestions || []),
      ...suggestions
    ]
    return this
  }

  /**
   * Build the final diagnostic
   */
  build(): ValidationDiagnostic {
    // Validate required fields
    if (!this.diagnostic.severity) {
      throw new Error('Diagnostic severity is required')
    }
    if (!this.diagnostic.code) {
      throw new Error('Diagnostic code is required')
    }
    if (!this.diagnostic.category) {
      throw new Error('Diagnostic category is required')
    }
    if (!this.diagnostic.message) {
      throw new Error('Diagnostic message is required')
    }
    if (!this.diagnostic.location) {
      // Default to line 1, column 1 if not specified
      this.diagnostic.location = { line: 1, column: 1 }
    }

    return this.diagnostic as ValidationDiagnostic
  }
}

/**
 * Shorthand function for creating error diagnostics
 */
export function error(
  code: string,
  category: ValidationCategory,
  message: string,
  line: number,
  column: number
): ValidationDiagnostic {
  return DiagnosticBuilder
    .error(code, category)
    .message(message)
    .at(line, column)
    .build()
}

/**
 * Shorthand function for creating warning diagnostics
 */
export function warning(
  code: string,
  category: ValidationCategory,
  message: string,
  line: number,
  column: number
): ValidationDiagnostic {
  return DiagnosticBuilder
    .warning(code, category)
    .message(message)
    .at(line, column)
    .build()
}

/**
 * Shorthand function for creating info diagnostics
 */
export function info(
  code: string,
  category: ValidationCategory,
  message: string,
  line: number,
  column: number
): ValidationDiagnostic {
  return DiagnosticBuilder
    .info(code, category)
    .message(message)
    .at(line, column)
    .build()
}
