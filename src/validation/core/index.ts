/**
 * @module validation/core
 * @description Unified validation core - types, error codes, and adapters
 *
 * This is the central module for all validation-related types and utilities.
 * All validation systems should use these unified types.
 */

// Diagnostic types and utilities
export {
  type Diagnostic,
  type DiagnosticLocation,
  type DiagnosticSuggestion,
  type DiagnosticContext,
  type DiagnosticCategory,
  type DiagnosticSeverity,
  DiagnosticBuilder,
  createDiagnostic,
  sortDiagnostics,
  filterBySeverity,
  filterByCategory,
  hasErrors,
  getErrors,
  getWarnings,
} from './diagnostic'

// Result types and utilities
export {
  type ValidationResult,
  type ValidationMetadata,
  ValidationResultBuilder,
  validResult,
  errorResult,
  mergeResults,
  getResultErrors,
  getResultWarnings,
  filterResultByCategory,
  countBySeverity,
} from './result'

// Error codes
export {
  ErrorCodes,
  LexerErrorCodes,
  ParserErrorCodes,
  SemanticErrorCodes,
  ValidatorErrorCodes,
  CorrectorErrorCodes,
  WarningCodes,
  type ErrorCode,
  ErrorCodeDescriptions,
  getErrorDescription,
} from './error-codes'

// Adapters for backwards compatibility
export {
  diagnosticToParseError,
  parseErrorToDiagnostic,
  diagnosticToLegacyError,
  diagnosticToLegacyWarning,
  legacyErrorToDiagnostic,
  legacyWarningToDiagnostic,
  diagnosticToValidatorDiagnostic,
  validatorDiagnosticToDiagnostic,
  resultToValidatorResult,
  validatorResultToResult,
  resultToLegacyResult,
} from './adapters'
