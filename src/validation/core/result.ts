/**
 * @module validation/core/result
 * @description Unified ValidationResult for all validation systems
 */

import type { Diagnostic, DiagnosticCategory } from './diagnostic'
import { hasErrors, getErrors, getWarnings, sortDiagnostics } from './diagnostic'

// ============================================
// ValidationResult Interface
// ============================================

export interface ValidationResult {
  /** True if no errors (warnings allowed) */
  valid: boolean
  /** All diagnostics */
  diagnostics: Diagnostic[]
  /** Corrected code (for LLM mode) */
  correctedCode?: string
  /** Additional metadata */
  metadata?: ValidationMetadata
}

export interface ValidationMetadata {
  /** Total number of corrections applied */
  correctionsApplied?: number
  /** Categories with issues */
  affectedCategories?: DiagnosticCategory[]
  /** Processing time in ms */
  processingTime?: number
}

// ============================================
// ValidationResult Builder
// ============================================

export class ValidationResultBuilder {
  private diagnostics: Diagnostic[] = []
  private correctedCode?: string
  private metadata: ValidationMetadata = {}

  add(diagnostic: Diagnostic): this {
    this.diagnostics.push(diagnostic)
    return this
  }

  addAll(diagnostics: Diagnostic[]): this {
    this.diagnostics.push(...diagnostics)
    return this
  }

  withCorrectedCode(code: string): this {
    this.correctedCode = code
    return this
  }

  withMetadata(metadata: Partial<ValidationMetadata>): this {
    this.metadata = { ...this.metadata, ...metadata }
    return this
  }

  build(): ValidationResult {
    const sorted = sortDiagnostics(this.diagnostics)

    // Calculate affected categories
    const categories = new Set<DiagnosticCategory>()
    for (const d of sorted) {
      categories.add(d.category)
    }

    return {
      valid: !hasErrors(sorted),
      diagnostics: sorted,
      correctedCode: this.correctedCode,
      metadata: {
        ...this.metadata,
        affectedCategories: Array.from(categories),
      },
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create an empty valid result
 */
export function validResult(): ValidationResult {
  return { valid: true, diagnostics: [] }
}

/**
 * Create a result with a single error
 */
export function errorResult(diagnostic: Diagnostic): ValidationResult {
  return { valid: false, diagnostics: [diagnostic] }
}

/**
 * Merge multiple validation results
 */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const diagnostics: Diagnostic[] = []
  let correctedCode: string | undefined

  for (const result of results) {
    diagnostics.push(...result.diagnostics)
    if (result.correctedCode) {
      correctedCode = result.correctedCode
    }
  }

  const sorted = sortDiagnostics(diagnostics)

  return {
    valid: !hasErrors(sorted),
    diagnostics: sorted,
    correctedCode,
  }
}

/**
 * Get errors from result
 */
export function getResultErrors(result: ValidationResult): Diagnostic[] {
  return getErrors(result.diagnostics)
}

/**
 * Get warnings from result
 */
export function getResultWarnings(result: ValidationResult): Diagnostic[] {
  return getWarnings(result.diagnostics)
}

/**
 * Filter result by categories
 */
export function filterResultByCategory(
  result: ValidationResult,
  categories: DiagnosticCategory[]
): ValidationResult {
  const filtered = result.diagnostics.filter(d => categories.includes(d.category))
  return {
    valid: !hasErrors(filtered),
    diagnostics: filtered,
    correctedCode: result.correctedCode,
    metadata: result.metadata,
  }
}

/**
 * Count diagnostics by severity
 */
export function countBySeverity(result: ValidationResult): { errors: number; warnings: number; info: number } {
  let errors = 0
  let warnings = 0
  let info = 0

  for (const d of result.diagnostics) {
    switch (d.severity) {
      case 'error': errors++; break
      case 'warning': warnings++; break
      case 'info': info++; break
    }
  }

  return { errors, warnings, info }
}
