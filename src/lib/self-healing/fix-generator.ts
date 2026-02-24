/**
 * Fix Generator
 *
 * Generates fixes for Mirror DSL errors.
 * Part of Self-Healing System (Increment 20).
 */

import { unifiedValidate } from '../../validation'
import type { Diagnostic } from '../../validation/core'
import { classifyError } from './error-classifier'
import type { ErrorClassification, SuggestedAction, ValidationError } from './error-classifier'

/**
 * Generated fix
 */
export interface GeneratedFix {
  error: ValidationError
  classification: ErrorClassification
  fix: FixOperation
  preview: string
  confidence: number
  requiresConfirmation: boolean
}

/**
 * Fix operation
 */
export interface FixOperation {
  type: 'replace' | 'insert' | 'delete' | 'wrap'
  line: number
  column?: number
  endLine?: number
  endColumn?: number
  content?: string
  description: string
}

/**
 * Fix generation options
 */
export interface FixGenerationOptions {
  maxFixes?: number
  minConfidence?: number
  includeManual?: boolean
  safeOnly?: boolean
}

const DEFAULT_OPTIONS: Required<FixGenerationOptions> = {
  maxFixes: 50,
  minConfidence: 0.5,
  includeManual: false,
  safeOnly: true
}

/**
 * Helper to convert unified diagnostics to legacy ValidationError format
 */
function diagnosticToValidationError(diag: Diagnostic): ValidationError {
  return {
    type: mapCategoryToLegacyType(diag.category),
    severity: diag.severity as 'error' | 'warning' | 'info',
    message: diag.message,
    line: diag.location.line,
    column: diag.location.column,
    code: diag.code,
    fix: diag.suggestions?.[0] ? {
      description: diag.suggestions[0].label,
      replacement: diag.suggestions[0].replacement
    } : undefined
  }
}

function mapCategoryToLegacyType(category: string): 'syntax' | 'semantic' | 'token' | 'layout' {
  switch (category) {
    case 'lexer':
    case 'parser':
      return 'syntax'
    case 'semantic':
    case 'type':
    case 'reference':
      return 'semantic'
    default:
      return 'layout'
  }
}

/**
 * Generates fixes for all errors in code
 */
export function generateFixes(code: string, options?: FixGenerationOptions): GeneratedFix[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const result = unifiedValidate(code, { mode: 'live' })
  const fixes: GeneratedFix[] = []

  // Convert diagnostics to legacy ValidationError format
  const errors = result.diagnostics.map(diagnosticToValidationError)

  for (const error of errors) {
    const classification = classifyError(error, code)

    // Skip if not healable and not including manual
    if (!opts.includeManual && classification.healability === 'manual') {
      continue
    }

    // Skip complex fixes in safe mode
    if (opts.safeOnly && classification.healability === 'complex') {
      continue
    }

    const fix = generateFixForError(error, classification, code)
    if (fix && fix.confidence >= opts.minConfidence) {
      fixes.push(fix)
    }

    if (fixes.length >= opts.maxFixes) {
      break
    }
  }

  // Sort by confidence
  return fixes.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Generates a fix for a single error
 */
export function generateFixForError(
  error: ValidationError,
  classification: ErrorClassification,
  code: string
): GeneratedFix | null {
  const operation = createFixOperation(error, classification, code)

  if (!operation) {
    return null
  }

  const preview = applyOperation(code, operation)
  const confidence = calculateConfidence(error, classification, operation)

  return {
    error,
    classification,
    fix: operation,
    preview,
    confidence,
    requiresConfirmation: classification.healability !== 'auto'
  }
}

/**
 * Creates a fix operation based on error type
 */
function createFixOperation(
  error: ValidationError,
  classification: ErrorClassification,
  code: string
): FixOperation | null {
  const lines = code.split('\n')
  const lineIndex = error.line - 1
  const line = lines[lineIndex] || ''

  switch (error.code) {
    case 'LOWERCASE_COMPONENT':
      return createCapitalizeOperation(error, line)

    case 'UNCLOSED_BRACE':
      return createInsertBraceOperation(error, code)

    case 'UNEXPECTED_CLOSE_BRACE':
      return createRemoveBraceOperation(error, line)

    case 'UNCLOSED_STRING':
      return createCloseStringOperation(error, line)

    case 'DOUBLE_COLON':
      return createReplaceDoubleColonOperation(error, line)

    case 'INVALID_COLOR':
      return createFixColorOperation(error, line)

    case 'MISSING_SPACE_INHERITANCE':
      return createAddSpaceOperation(error, line)

    case 'CONFLICTING_DIRECTIONS':
      return createRemoveDirectionOperation(error, line)

    case 'MANY_CHILDREN_NO_WRAP':
      return createAddWrapOperation(error, line)

    default:
      // Try to use the validation fix
      if (error.fix?.replacement) {
        return {
          type: 'replace',
          line: error.line,
          content: error.fix.replacement,
          description: error.fix.description
        }
      }
      return null
  }
}

/**
 * Creates operation to capitalize component name
 */
function createCapitalizeOperation(error: ValidationError, line: string): FixOperation | null {
  const match = line.match(/^(\s*)([a-z])([A-Za-z0-9]*\s*\{)/)
  if (!match) return null

  const capitalized = `${match[1]}${match[2].toUpperCase()}${match[3]}`
  const newLine = line.replace(match[0], capitalized)

  return {
    type: 'replace',
    line: error.line,
    content: newLine,
    description: `Kapitalisiere "${match[2]}${match[3].replace(/\s*\{/, '')}" zu "${match[2].toUpperCase()}${match[3].replace(/\s*\{/, '')}"`
  }
}

/**
 * Creates operation to insert closing brace
 */
function createInsertBraceOperation(error: ValidationError, code: string): FixOperation {
  const lines = code.split('\n')
  const insertLine = lines.length + 1

  return {
    type: 'insert',
    line: insertLine,
    content: '}',
    description: 'Füge schließende Klammer hinzu'
  }
}

/**
 * Creates operation to remove unexpected brace
 */
function createRemoveBraceOperation(error: ValidationError, line: string): FixOperation {
  return {
    type: 'replace',
    line: error.line,
    content: line.replace(/\}/, ''),
    description: 'Entferne überschüssige Klammer'
  }
}

/**
 * Creates operation to close string
 */
function createCloseStringOperation(error: ValidationError, line: string): FixOperation {
  let newLine = line
  if (line.includes('}')) {
    newLine = line.replace(/([^"}]*)}/, '$1"}')
  } else {
    newLine = line + '"'
  }

  return {
    type: 'replace',
    line: error.line,
    content: newLine,
    description: 'Schließe String mit Anführungszeichen'
  }
}

/**
 * Creates operation to replace double colon
 */
function createReplaceDoubleColonOperation(error: ValidationError, line: string): FixOperation {
  return {
    type: 'replace',
    line: error.line,
    content: line.replace('::', ':'),
    description: 'Ersetze :: durch :'
  }
}

/**
 * Creates operation to fix invalid color
 */
function createFixColorOperation(error: ValidationError, line: string): FixOperation | null {
  const match = line.match(/#([A-Fa-f0-9]+)/)
  if (!match) return null

  const hex = match[1]
  let fixedHex = hex

  // Fix to valid length
  if (hex.length === 5) {
    fixedHex = hex + '0'
  } else if (hex.length === 7) {
    fixedHex = hex + '0'
  } else if (hex.length === 2) {
    fixedHex = hex + hex.charAt(1)
  } else if (hex.length === 1) {
    fixedHex = hex + hex + hex
  }

  return {
    type: 'replace',
    line: error.line,
    content: line.replace(`#${hex}`, `#${fixedHex}`),
    description: `Korrigiere Farbe #${hex} zu #${fixedHex}`
  }
}

/**
 * Creates operation to add space after colon
 */
function createAddSpaceOperation(error: ValidationError, line: string): FixOperation {
  return {
    type: 'replace',
    line: error.line,
    content: line.replace(/:([A-Z])/, ': $1'),
    description: 'Füge Leerzeichen nach Doppelpunkt hinzu'
  }
}

/**
 * Creates operation to remove conflicting direction
 */
function createRemoveDirectionOperation(error: ValidationError, line: string): FixOperation {
  // Remove vertical, keep horizontal (arbitrary choice, user should confirm)
  const newLine = line.replace(/,?\s*vertical\b/, '').replace(/\bvertical\s*,?\s*/, '')

  return {
    type: 'replace',
    line: error.line,
    content: newLine,
    description: 'Entferne "vertical" (behalte "horizontal")'
  }
}

/**
 * Creates operation to add wrap
 */
function createAddWrapOperation(error: ValidationError, line: string): FixOperation {
  // Add wrap after opening brace
  const newLine = line.replace(/\{/, '{ wrap,')

  return {
    type: 'replace',
    line: error.line,
    content: newLine,
    description: 'Füge "wrap" hinzu'
  }
}

/**
 * Applies a fix operation to code
 */
export function applyOperation(code: string, operation: FixOperation): string {
  const lines = code.split('\n')

  switch (operation.type) {
    case 'replace':
      if (operation.line > 0 && operation.line <= lines.length) {
        lines[operation.line - 1] = operation.content || ''
      }
      break

    case 'insert':
      if (operation.line > lines.length) {
        lines.push(operation.content || '')
      } else {
        lines.splice(operation.line - 1, 0, operation.content || '')
      }
      break

    case 'delete':
      if (operation.line > 0 && operation.line <= lines.length) {
        lines.splice(operation.line - 1, 1)
      }
      break
  }

  return lines.join('\n')
}

/**
 * Calculates confidence for a fix
 */
function calculateConfidence(
  error: ValidationError,
  classification: ErrorClassification,
  operation: FixOperation
): number {
  let confidence = 0.5

  // Higher confidence for auto-healable
  if (classification.healability === 'auto') {
    confidence += 0.3
  } else if (classification.healability === 'assisted') {
    confidence += 0.15
  }

  // Higher confidence for simple operations
  if (operation.type === 'replace' && operation.content) {
    confidence += 0.1
  }

  // Use suggested action confidence if available
  if (classification.suggestedActions.length > 0) {
    confidence = Math.max(confidence, classification.suggestedActions[0].confidence)
  }

  // Cap at 0.99
  return Math.min(0.99, confidence)
}

/**
 * Applies multiple fixes sequentially
 */
export function applyFixes(code: string, fixes: GeneratedFix[]): string {
  let result = code

  // Sort by line number (descending) to avoid offset issues
  const sortedFixes = [...fixes].sort((a, b) => b.fix.line - a.fix.line)

  for (const fix of sortedFixes) {
    result = applyOperation(result, fix.fix)
  }

  return result
}

/**
 * Gets safe fixes that don't require confirmation
 */
export function getSafeFixes(code: string): GeneratedFix[] {
  const fixes = generateFixes(code, { safeOnly: true })
  return fixes.filter(f => !f.requiresConfirmation)
}

/**
 * Generates quick fixes for a specific line
 */
export function generateLineFixes(code: string, lineNumber: number): GeneratedFix[] {
  const result = unifiedValidate(code, { mode: 'live' })
  const allErrors = result.diagnostics.map(diagnosticToValidationError)
  const lineErrors = allErrors.filter(e => e.line === lineNumber)

  const fixes: GeneratedFix[] = []
  for (const error of lineErrors) {
    const classification = classifyError(error, code)
    const fix = generateFixForError(error, classification, code)
    if (fix) {
      fixes.push(fix)
    }
  }

  return fixes.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Checks if a fix is safe to apply automatically
 */
export function isSafeFix(fix: GeneratedFix): boolean {
  return (
    !fix.requiresConfirmation &&
    fix.confidence >= 0.8 &&
    fix.classification.healability === 'auto'
  )
}

/**
 * Gets fix description for UI
 */
export function getFixDescription(fix: GeneratedFix): string {
  return `${fix.fix.description} (${Math.round(fix.confidence * 100)}% Konfidenz)`
}
