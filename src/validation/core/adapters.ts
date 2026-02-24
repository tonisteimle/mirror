/**
 * @module validation/core/adapters
 * @description Adapter functions for backwards compatibility
 *
 * These functions convert between the unified Diagnostic type and legacy types
 * used in different parts of the codebase. This ensures existing code continues
 * to work while we migrate to the unified system.
 */

import type { Diagnostic, DiagnosticSeverity, DiagnosticCategory } from './diagnostic'
import type { ValidationResult } from './result'
import type { ParseError } from '../../parser/errors'

// Import legacy types (these will be deprecated)
import type {
  ValidationError as LegacyValidationError,
  ValidationWarning as LegacyValidationWarning,
  Correction as LegacyCorrection,
  ValidationResult as LegacyValidationResult,
  TabType,
} from '../types'

import type {
  ValidationDiagnostic as ValidatorDiagnostic,
  ValidationResult as ValidatorResult,
  ValidationCategory as ValidatorCategory,
} from '../../validator/types'

// ============================================
// ParseError Adapters
// ============================================

/**
 * Convert a Diagnostic to a ParseError
 */
export function diagnosticToParseError(diagnostic: Diagnostic): ParseError {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    location: diagnostic.location,
    source: diagnostic.source,
    hint: diagnostic.suggestions?.[0]?.label,
  }
}

/**
 * Convert a ParseError to a Diagnostic
 */
export function parseErrorToDiagnostic(error: ParseError): Diagnostic {
  // Infer category from code prefix
  let category: DiagnosticCategory = 'parser'
  if (error.code.startsWith('L')) category = 'lexer'
  else if (error.code.startsWith('S')) category = 'semantic'
  else if (error.code.startsWith('V')) category = 'property' // Will be refined
  else if (error.code.startsWith('W')) category = 'semantic'

  return {
    severity: error.severity,
    code: error.code,
    category,
    message: error.message,
    location: error.location,
    source: error.source,
    suggestions: error.hint ? [{ label: error.hint, replacement: '' }] : undefined,
  }
}

// ============================================
// Legacy ValidationError/Warning Adapters
// ============================================

/**
 * Convert a Diagnostic to legacy ValidationError
 */
export function diagnosticToLegacyError(diagnostic: Diagnostic, tab: TabType = 'components'): LegacyValidationError {
  return {
    type: mapDiagnosticToErrorType(diagnostic),
    tab,
    line: diagnostic.location.line,
    column: diagnostic.location.column,
    message: diagnostic.message,
    source: diagnostic.source || '',
  }
}

/**
 * Convert a Diagnostic to legacy ValidationWarning
 */
export function diagnosticToLegacyWarning(diagnostic: Diagnostic, tab: TabType = 'components'): LegacyValidationWarning {
  return {
    type: mapDiagnosticToWarningType(diagnostic),
    tab,
    line: diagnostic.location.line,
    message: diagnostic.message,
    suggestion: diagnostic.suggestions?.[0]?.replacement,
  }
}

/**
 * Convert legacy ValidationError to Diagnostic
 */
export function legacyErrorToDiagnostic(error: LegacyValidationError): Diagnostic {
  return {
    severity: 'error',
    code: mapErrorTypeToCode(error.type),
    category: mapErrorTypeToCategory(error.type),
    message: error.message,
    location: {
      line: error.line,
      column: error.column || 1,
    },
    source: error.source,
  }
}

/**
 * Convert legacy ValidationWarning to Diagnostic
 */
export function legacyWarningToDiagnostic(warning: LegacyValidationWarning): Diagnostic {
  return {
    severity: 'warning',
    code: mapWarningTypeToCode(warning.type),
    category: 'semantic',
    message: warning.message,
    location: {
      line: warning.line,
      column: 1,
    },
    suggestions: warning.suggestion ? [{ label: warning.suggestion, replacement: warning.suggestion }] : undefined,
  }
}

// ============================================
// Validator Types Adapters
// ============================================

/**
 * Convert a Diagnostic to ValidatorDiagnostic
 */
export function diagnosticToValidatorDiagnostic(diagnostic: Diagnostic): ValidatorDiagnostic {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    category: mapCategoryToValidatorCategory(diagnostic.category),
    message: diagnostic.message,
    location: diagnostic.location,
    source: diagnostic.source,
    context: diagnostic.context ? {
      validOptions: diagnostic.context.validOptions,
      expectedType: diagnostic.context.expectedType,
      actualValue: diagnostic.context.actualValue,
      propertyName: diagnostic.context.property,
      componentName: diagnostic.context.component,
    } : undefined,
    suggestions: diagnostic.suggestions?.map(s => ({
      label: s.label,
      replacement: s.replacement,
    })),
  }
}

/**
 * Convert ValidatorDiagnostic to Diagnostic
 */
export function validatorDiagnosticToDiagnostic(vd: ValidatorDiagnostic): Diagnostic {
  return {
    severity: vd.severity,
    code: vd.code,
    category: vd.category as DiagnosticCategory,
    message: vd.message,
    location: vd.location,
    source: vd.source,
    suggestions: vd.suggestions?.map(s => ({
      label: s.label,
      replacement: s.replacement,
    })),
    context: vd.context ? {
      validOptions: vd.context.validOptions,
      expectedType: vd.context.expectedType,
      actualValue: vd.context.actualValue,
      property: vd.context.propertyName,
      component: vd.context.componentName,
    } : undefined,
  }
}

/**
 * Convert ValidationResult to ValidatorResult
 */
export function resultToValidatorResult(result: ValidationResult): ValidatorResult {
  return {
    valid: result.valid,
    errors: result.diagnostics.filter(d => d.severity === 'error').map(diagnosticToValidatorDiagnostic),
    warnings: result.diagnostics.filter(d => d.severity === 'warning').map(diagnosticToValidatorDiagnostic),
    info: result.diagnostics.filter(d => d.severity === 'info').map(diagnosticToValidatorDiagnostic),
  }
}

/**
 * Convert ValidatorResult to ValidationResult
 */
export function validatorResultToResult(vr: ValidatorResult): ValidationResult {
  const diagnostics: Diagnostic[] = [
    ...vr.errors.map(validatorDiagnosticToDiagnostic),
    ...vr.warnings.map(validatorDiagnosticToDiagnostic),
    ...vr.info.map(validatorDiagnosticToDiagnostic),
  ]

  return {
    valid: vr.valid,
    diagnostics,
  }
}

// ============================================
// Legacy ValidationResult Adapter
// ============================================

/**
 * Convert ValidationResult to legacy format
 */
export function resultToLegacyResult(
  result: ValidationResult,
  componentsCode: string,
  layoutCode: string
): LegacyValidationResult {
  const errors: LegacyValidationError[] = []
  const warnings: LegacyValidationWarning[] = []
  const corrections: LegacyCorrection[] = []

  for (const d of result.diagnostics) {
    if (d.severity === 'error') {
      errors.push(diagnosticToLegacyError(d))
    } else if (d.severity === 'warning') {
      warnings.push(diagnosticToLegacyWarning(d))
    }

    // If there's a suggestion with high confidence, create a correction
    if (d.suggestions?.length && d.suggestions[0].confidence && d.suggestions[0].confidence > 0.8) {
      corrections.push({
        tab: 'components',
        line: d.location.line,
        original: d.source || '',
        corrected: d.suggestions[0].replacement,
        reason: d.suggestions[0].label,
        confidence: d.suggestions[0].confidence,
      })
    }
  }

  return {
    isValid: result.valid,
    components: componentsCode,
    layout: layoutCode,
    errors,
    warnings,
    corrections,
  }
}

// ============================================
// Helper Functions
// ============================================

type LegacyErrorType =
  | 'INVALID_SYNTAX'
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_VALUE'
  | 'MISSING_COMPONENT'
  | 'INVALID_REFERENCE'
  | 'PROPERTY_IN_LAYOUT'
  | 'DEFINITION_IN_LAYOUT'
  | 'INVALID_INDENTATION'
  | 'CIRCULAR_REFERENCE'
  | 'DUPLICATE_DEFINITION'
  | 'INVALID_COLOR'
  | 'MISSING_VALUE'
  | 'CONFLICTING_PROPERTIES'

type LegacyWarningType =
  | 'UNUSED_COMPONENT'
  | 'SIMILAR_PROPERTY'
  | 'POSSIBLE_TYPO'
  | 'LOW_CONFIDENCE_CORRECTION'
  | 'REDUNDANT_PROPERTY'
  | 'MISSING_CHILD_DEFINITION'

function mapDiagnosticToErrorType(diagnostic: Diagnostic): LegacyErrorType {
  const codeToType: Record<string, LegacyErrorType> = {
    P001: 'INVALID_SYNTAX',
    P006: 'INVALID_SYNTAX',
    V001: 'UNKNOWN_PROPERTY',
    V002: 'INVALID_VALUE',
    V003: 'INVALID_VALUE',
    V004: 'INVALID_VALUE',
    V005: 'CONFLICTING_PROPERTIES',
    V006: 'INVALID_COLOR',
    V020: 'INVALID_REFERENCE',
    V021: 'CIRCULAR_REFERENCE',
    V022: 'MISSING_COMPONENT',
    S001: 'INVALID_REFERENCE',
    S002: 'MISSING_COMPONENT',
    S003: 'DUPLICATE_DEFINITION',
    S004: 'CIRCULAR_REFERENCE',
    P005: 'INVALID_INDENTATION',
  }
  return codeToType[diagnostic.code] || 'INVALID_SYNTAX'
}

function mapDiagnosticToWarningType(diagnostic: Diagnostic): LegacyWarningType {
  const codeToType: Record<string, LegacyWarningType> = {
    W001: 'UNUSED_COMPONENT',
    W003: 'POSSIBLE_TYPO',
    W005: 'SIMILAR_PROPERTY',
    W006: 'REDUNDANT_PROPERTY',
    W007: 'MISSING_CHILD_DEFINITION',
    C008: 'LOW_CONFIDENCE_CORRECTION',
  }
  return codeToType[diagnostic.code] || 'POSSIBLE_TYPO'
}

function mapErrorTypeToCode(type: LegacyErrorType): string {
  const typeToCode: Record<LegacyErrorType, string> = {
    INVALID_SYNTAX: 'P006',
    UNKNOWN_PROPERTY: 'V001',
    INVALID_VALUE: 'V002',
    MISSING_COMPONENT: 'V022',
    INVALID_REFERENCE: 'V020',
    PROPERTY_IN_LAYOUT: 'C006',
    DEFINITION_IN_LAYOUT: 'P006',
    INVALID_INDENTATION: 'P005',
    CIRCULAR_REFERENCE: 'V021',
    DUPLICATE_DEFINITION: 'S003',
    INVALID_COLOR: 'V006',
    MISSING_VALUE: 'V002',
    CONFLICTING_PROPERTIES: 'V005',
  }
  return typeToCode[type]
}

function mapWarningTypeToCode(type: LegacyWarningType): string {
  const typeToCode: Record<LegacyWarningType, string> = {
    UNUSED_COMPONENT: 'W001',
    SIMILAR_PROPERTY: 'W005',
    POSSIBLE_TYPO: 'W003',
    LOW_CONFIDENCE_CORRECTION: 'C008',
    REDUNDANT_PROPERTY: 'W006',
    MISSING_CHILD_DEFINITION: 'W007',
  }
  return typeToCode[type]
}

function mapErrorTypeToCategory(type: LegacyErrorType): DiagnosticCategory {
  const typeToCategory: Record<LegacyErrorType, DiagnosticCategory> = {
    INVALID_SYNTAX: 'parser',
    UNKNOWN_PROPERTY: 'property',
    INVALID_VALUE: 'property',
    MISSING_COMPONENT: 'reference',
    INVALID_REFERENCE: 'reference',
    PROPERTY_IN_LAYOUT: 'correction',
    DEFINITION_IN_LAYOUT: 'parser',
    INVALID_INDENTATION: 'parser',
    CIRCULAR_REFERENCE: 'reference',
    DUPLICATE_DEFINITION: 'semantic',
    INVALID_COLOR: 'property',
    MISSING_VALUE: 'property',
    CONFLICTING_PROPERTIES: 'property',
  }
  return typeToCategory[type]
}

function mapCategoryToValidatorCategory(category: DiagnosticCategory): ValidatorCategory {
  const mapping: Record<DiagnosticCategory, ValidatorCategory> = {
    lexer: 'property',
    parser: 'property',
    semantic: 'reference',
    property: 'property',
    library: 'library',
    reference: 'reference',
    event: 'event',
    action: 'action',
    type: 'type',
    state: 'state',
    animation: 'animation',
    correction: 'property',
  }
  return mapping[category]
}
