/**
 * Mirror DSL Comprehensive Validator
 *
 * Entry point for code validation.
 *
 * Validates:
 * - Property names and values (V001-V009)
 * - Library component slots (V010-V019)
 * - Token and component references (V020-V029)
 * - Event handler names (V030-V039)
 * - Action syntax and targets (V040-V049)
 * - Type compatibility (V050-V059)
 * - State definitions (V060-V069)
 * - Animation definitions (V070-V079)
 */

import type { ParseResult } from '../parser/types'
import type { ValidationResult, ValidatorOptions } from './types'
import { mergeResults, diagnosticToParseError } from './types'
import { registerValidator } from '../parser/parser'

// Import validators
import { validateProperties } from './validators/property-validator'
import { validateReferences } from './validators/reference-validator'
import { validateEvents } from './validators/event-validator'
import { validateActions } from './validators/action-validator'
import { validateLibraryComponents } from './validators/library-validator'
import { validateStates } from './validators/state-validator'
import { validateAnimations } from './validators/animation-validator'
import { validateTypes } from './validators/type-validator'

// Re-export types
export type { ValidationResult, ValidationDiagnostic, ValidatorOptions, ValidationCategory } from './types'
export { diagnosticToParseError } from './types'
export { ValidatorErrorCodes, ErrorCodeDescriptions } from './error-codes'

// ============================================
// Main Validation Function
// ============================================

/**
 * Validate Mirror DSL code comprehensively.
 *
 * @param result - Parse result from the parser
 * @param source - Original source code (for better error messages)
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and info
 *
 * @example
 * ```typescript
 * import { parse } from './parser'
 * import { validateCode } from './validator'
 *
 * const result = parse(code)
 * const validation = validateCode(result, code)
 *
 * if (!validation.valid) {
 *   validation.errors.forEach(e => console.error(e.message))
 * }
 * ```
 */
export function validateCode(
  result: ParseResult,
  source?: string,
  options: ValidatorOptions = {}
): ValidationResult {
  const {
    strictMode = false,
    skip = [],
    includeInfo = true,
    maxDiagnostics = 100
  } = options

  // Run all validators that aren't skipped
  const results: ValidationResult[] = []

  if (!skip.includes('property')) {
    results.push(validateProperties(result, source))
  }

  if (!skip.includes('reference')) {
    results.push(validateReferences(result, source))
  }

  if (!skip.includes('event')) {
    results.push(validateEvents(result, source))
  }

  if (!skip.includes('action')) {
    results.push(validateActions(result, source))
  }

  if (!skip.includes('library')) {
    results.push(validateLibraryComponents(result, source))
  }

  if (!skip.includes('state')) {
    results.push(validateStates(result, source))
  }

  if (!skip.includes('animation')) {
    results.push(validateAnimations(result, source))
  }

  if (!skip.includes('type')) {
    results.push(validateTypes(result, source))
  }

  // Merge all results
  const merged = mergeResults(...results)

  // Apply strict mode
  if (strictMode) {
    merged.errors.push(...merged.warnings)
    merged.warnings = []
    merged.valid = merged.errors.length === 0
  }

  // Filter out info if not requested
  if (!includeInfo) {
    merged.info = []
  }

  // Limit total diagnostics
  if (maxDiagnostics > 0) {
    const total = merged.errors.length + merged.warnings.length + merged.info.length
    if (total > maxDiagnostics) {
      // Prioritize errors, then warnings, then info
      let remaining = maxDiagnostics

      if (merged.errors.length > remaining) {
        merged.errors = merged.errors.slice(0, remaining)
        merged.warnings = []
        merged.info = []
      } else {
        remaining -= merged.errors.length
        if (merged.warnings.length > remaining) {
          merged.warnings = merged.warnings.slice(0, remaining)
          merged.info = []
        } else {
          remaining -= merged.warnings.length
          merged.info = merged.info.slice(0, remaining)
        }
      }
    }
  }

  // Sort by line number
  merged.errors.sort((a, b) => a.location.line - b.location.line)
  merged.warnings.sort((a, b) => a.location.line - b.location.line)
  merged.info.sort((a, b) => a.location.line - b.location.line)

  return merged
}

/**
 * Quick validation check - returns only if valid.
 */
export function isValid(result: ParseResult, source?: string): boolean {
  const validation = validateCode(result, source, {
    skip: ['type'],  // Skip expensive type checking for quick checks
    includeInfo: false
  })
  return validation.valid
}

/**
 * Get all diagnostics as ParseErrors for parser integration.
 */
export function getParseErrors(result: ParseResult, source?: string) {
  const validation = validateCode(result, source)
  return [
    ...validation.errors.map(diagnosticToParseError),
    ...validation.warnings.map(diagnosticToParseError)
  ]
}

// ============================================
// Individual Validator Exports
// ============================================

export {
  validateProperties,
  validateReferences,
  validateEvents,
  validateActions,
  validateLibraryComponents,
  validateStates,
  validateAnimations,
  validateTypes
}

// ============================================
// Utility Exports
// ============================================

export { DiagnosticBuilder } from './utils/diagnostic-builder'
export { findSimilar, didYouMean, formatDidYouMean, getBestMatch } from './utils/suggestion-engine'

// ============================================
// Schema Exports
// ============================================

export {
  getPropertySchema,
  isValidProperty,
  isValidColor,
  isValidNumber,
  PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES
} from './schemas/property-schema'

export {
  getLibrarySchema,
  isValidSlot,
  getValidSlots,
  getRequiredSlots,
  isMultipleSlot,
  getLibraryComponentNames,
  isLibraryComponent
} from './schemas/library-schema'

export {
  isValidEvent,
  getValidEvents,
  isValidAction,
  getActionSchema,
  getValidActions,
  isValidAnimation,
  getValidAnimations,
  isValidPosition,
  getValidPositions,
  isSystemState,
  getSystemStates
} from './schemas/event-schema'

// ============================================
// Auto-register validator with parser
// ============================================

// Register the validator so diagnostics are added to parse results
registerValidator(validateCode, diagnosticToParseError)
