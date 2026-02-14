/**
 * Validator Types
 *
 * Type definitions for the comprehensive validation system.
 */

import type { ParseError } from '../parser/errors'

// ============================================
// Validation Categories
// ============================================

export type ValidationCategory =
  | 'property'    // Property name and value validation
  | 'library'     // Library component slots and structure
  | 'reference'   // Token and component references
  | 'event'       // Event handler names
  | 'action'      // Action syntax and targets
  | 'animation'   // Animation names and timing
  | 'type'        // Type checking (operators, comparisons)
  | 'state'       // State existence validation

// ============================================
// Validation Diagnostic
// ============================================

export interface ValidationDiagnostic {
  severity: 'error' | 'warning' | 'info'
  code: string                // e.g., 'V001'
  category: ValidationCategory
  message: string
  location: {
    line: number      // 1-indexed
    column: number    // 1-indexed
    endLine?: number
    endColumn?: number
  }
  source?: string             // The problematic text
  context?: ValidationContext
  suggestions?: FixSuggestion[]
}

export interface ValidationContext {
  validOptions?: string[]     // List of valid alternatives
  expectedType?: string       // Expected type name
  actualValue?: string        // The actual value provided
  propertyName?: string       // Related property name
  componentName?: string      // Related component name
}

export interface FixSuggestion {
  label: string               // Human-readable description
  replacement: string         // The suggested replacement
}

// ============================================
// Validation Result
// ============================================

export interface ValidationResult {
  /** True if no errors (warnings allowed) */
  valid: boolean
  /** Errors - prevent valid interpretation */
  errors: ValidationDiagnostic[]
  /** Warnings - potential issues but not blocking */
  warnings: ValidationDiagnostic[]
  /** Info - suggestions and improvements */
  info: ValidationDiagnostic[]
}

// ============================================
// Validator Options
// ============================================

export interface ValidatorOptions {
  /** Treat warnings as errors */
  strictMode?: boolean
  /** Skip certain validation categories */
  skip?: ValidationCategory[]
  /** Include info-level diagnostics */
  includeInfo?: boolean
  /** Maximum number of diagnostics to report */
  maxDiagnostics?: number
}

// ============================================
// Conversion utilities
// ============================================

/**
 * Convert a ValidationDiagnostic to a ParseError for compatibility
 */
export function diagnosticToParseError(diagnostic: ValidationDiagnostic): ParseError {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    location: diagnostic.location,
    source: diagnostic.source,
    hint: diagnostic.suggestions?.[0]?.replacement
      ? `Did you mean: ${diagnostic.suggestions[0].replacement}`
      : undefined
  }
}

/**
 * Merge multiple validation results
 */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const merged: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  }

  for (const result of results) {
    merged.errors.push(...result.errors)
    merged.warnings.push(...result.warnings)
    merged.info.push(...result.info)
  }

  merged.valid = merged.errors.length === 0
  return merged
}

/**
 * Create an empty valid result
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [], info: [] }
}
