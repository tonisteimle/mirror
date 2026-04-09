/**
 * Validator Types
 *
 * Type definitions for the Mirror DSL validator.
 */

import { PropertyDef } from '../schema/dsl'

// ============================================================================
// Validation Results
// ============================================================================

export type ErrorSeverity = 'error' | 'warning'

export interface ValidationError {
  /** Error or warning */
  severity: ErrorSeverity
  /** Error code (e.g., E001, W500) */
  code: string
  /** Human-readable message */
  message: string
  /** Source line (1-based) */
  line: number
  /** Source column (1-based) */
  column: number
  /** End column for range highlighting */
  endColumn?: number
  /** The problematic source text */
  source?: string
  /** Suggestion for fixing */
  suggestion?: string
}

export interface ValidationResult {
  /** True if no errors (warnings are allowed) */
  valid: boolean
  /** All validation errors */
  errors: ValidationError[]
  /** All validation warnings */
  warnings: ValidationError[]
  /** Total error count */
  errorCount: number
  /** Total warning count */
  warningCount: number
}

// ============================================================================
// Validation Rules (generated from schema)
// ============================================================================

export interface ValueValidationResult {
  valid: boolean
  errors: string[]
}

export type ValueValidator = (values: (string | number | boolean)[]) => ValueValidationResult

export interface ValidationRules {
  // Primitives
  validPrimitives: Set<string>
  primitiveAliases: Map<string, string>

  // Properties
  validProperties: Map<string, PropertyDef>
  propertyValueValidators: Map<string, ValueValidator>

  // Events
  validEvents: Set<string>
  eventsWithKeys: Set<string>

  // Keys
  validKeys: Set<string>

  // Actions
  validActions: Set<string>
  actionTargets: Map<string, string[]>

  // States
  validStates: Set<string>
  systemStates: Set<string>
}

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Lexer (E01x errors, W01x warnings)
  UNCLOSED_STRING: 'E010',
  INVALID_HEX_COLOR: 'E011',
  UNKNOWN_CHARACTER: 'E012',
  INDENTATION_TOO_DEEP: 'E013',
  INVALID_NUMBER: 'E014',
  INCONSISTENT_INDENTATION: 'W015',

  // Components (E0xx)
  UNKNOWN_COMPONENT: 'E001',
  UNDEFINED_COMPONENT: 'E002',
  RECURSIVE_COMPONENT: 'E003',

  // Properties (E1xx)
  UNKNOWN_PROPERTY: 'E100',
  INVALID_VALUE: 'E101',
  MISSING_VALUE: 'E102',
  INVALID_DIRECTION: 'E103',
  INVALID_COLOR: 'E104',
  VALUE_OUT_OF_RANGE: 'E105',
  INVALID_KEYWORD: 'E106',
  LAYOUT_CONFLICT: 'E110',
  DUPLICATE_PROPERTY: 'W110',
  INVALID_COMBINATION: 'E111',
  MISSING_REQUIRED: 'E120',

  // Events (E2xx)
  UNKNOWN_EVENT: 'E200',
  UNKNOWN_KEY: 'E201',
  UNEXPECTED_KEY: 'E202',
  MISSING_ACTION: 'E203',

  // Actions (E3xx)
  UNKNOWN_ACTION: 'E300',
  INVALID_TARGET: 'E301',
  MISSING_TARGET: 'E302',

  // States (E4xx)
  UNKNOWN_STATE: 'E400',
  DUPLICATE_STATE: 'E401',

  // Tokens (W5xx - warnings)
  UNDEFINED_TOKEN: 'W500',
  UNUSED_TOKEN: 'W501',
  INVALID_TOKEN_TYPE: 'W502',
  UNUSED_COMPONENT: 'W503',

  // Structure (E6xx)
  INVALID_NESTING: 'E600',
  DEFINITION_AFTER_USE: 'E601',
  CIRCULAR_REFERENCE: 'E602',
  DUPLICATE_DEFINITION: 'E603',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
