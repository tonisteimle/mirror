/**
 * Error Classifier
 *
 * Classifies Mirror DSL errors for self-healing.
 * Part of Self-Healing System (Increment 19).
 */

import { unifiedValidate } from '../../validation'
import type { Diagnostic } from '../../validation/core'

// Legacy type alias for backwards compatibility
export type ValidationError = {
  type: 'syntax' | 'semantic' | 'token' | 'layout'
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column?: number
  code?: string
  fix?: { description: string; replacement: string }
}

/**
 * Error classification
 */
export interface ErrorClassification {
  category: ErrorCategory
  severity: ErrorSeverity
  healability: Healability
  context: ErrorContext
  suggestedActions: SuggestedAction[]
}

/**
 * Error categories
 */
export type ErrorCategory =
  | 'structural'    // Brace/bracket issues
  | 'naming'        // Component/token naming
  | 'reference'     // Undefined references
  | 'type'          // Type mismatches
  | 'layout'        // Layout conflicts
  | 'style'         // Style/property issues
  | 'logic'         // Conditional/event logic
  | 'unknown'       // Unclassified

/**
 * Error severity for healing priority
 */
export type ErrorSeverity =
  | 'critical'      // Blocks parsing completely
  | 'major'         // Prevents rendering
  | 'minor'         // Affects appearance/behavior
  | 'cosmetic'      // Style suggestions

/**
 * How easily can this error be fixed automatically
 */
export type Healability =
  | 'auto'          // Can be fixed automatically
  | 'assisted'      // Needs minimal user input
  | 'manual'        // Requires user decision
  | 'complex'       // Multiple possible fixes

/**
 * Error context for better healing decisions
 */
export interface ErrorContext {
  line: number
  column?: number
  surroundingCode?: string
  affectedComponent?: string
  relatedErrors?: string[]
}

/**
 * Suggested action for healing
 */
export interface SuggestedAction {
  type: 'fix' | 'replace' | 'add' | 'remove' | 'rename'
  description: string
  confidence: number  // 0-1
  code?: string       // Suggested fix
}

// Error code to category mapping
const ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  // Structural
  'UNCLOSED_BRACE': 'structural',
  'UNEXPECTED_CLOSE_BRACE': 'structural',
  'UNCLOSED_STRING': 'structural',

  // Naming
  'LOWERCASE_COMPONENT': 'naming',
  'INVALID_TOKEN_NAME': 'naming',
  'UNKNOWN_PROPERTY': 'naming',

  // Reference
  'UNDEFINED_TOKEN': 'reference',
  'UNKNOWN_PARENT_COMPONENT': 'reference',
  'CIRCULAR_TOKEN_REFERENCE': 'reference',

  // Type
  'INVALID_COLOR': 'type',
  'INVALID_PROPERTY_TYPE': 'type',
  'INVALID_COLOR_TOKEN': 'type',
  'INVALID_NUMERIC_TOKEN': 'type',
  'EMPTY_TOKEN_VALUE': 'type',

  // Layout
  'CONFLICTING_DIRECTIONS': 'layout',
  'STACKED_WITH_DIRECTION': 'layout',
  'GRID_WITH_DIRECTION': 'layout',
  'DEEP_NESTING': 'layout',
  'MANY_CHILDREN_NO_WRAP': 'layout',
  'CONFLICTING_SIZING': 'layout',
  'DIRECTION_WITHOUT_CHILDREN': 'layout',

  // Style
  'DOUBLE_COLON': 'style',
  'MISSING_SPACE_INHERITANCE': 'style',
  'MISSING_COLON': 'style',
  'UNUSED_TOKEN': 'style',
  'DUPLICATE_TOKEN': 'style'
}

// Error code to severity mapping
const ERROR_SEVERITIES: Record<string, ErrorSeverity> = {
  // Critical - blocks parsing
  'UNCLOSED_BRACE': 'critical',
  'UNEXPECTED_CLOSE_BRACE': 'critical',
  'UNCLOSED_STRING': 'critical',
  'CIRCULAR_TOKEN_REFERENCE': 'critical',

  // Major - prevents rendering
  'UNDEFINED_TOKEN': 'major',
  'UNKNOWN_PARENT_COMPONENT': 'major',
  'INVALID_COLOR': 'major',
  'EMPTY_TOKEN_VALUE': 'major',
  'CONFLICTING_DIRECTIONS': 'major',

  // Minor - affects behavior
  'LOWERCASE_COMPONENT': 'minor',
  'INVALID_TOKEN_NAME': 'minor',
  'INVALID_PROPERTY_TYPE': 'minor',
  'DEEP_NESTING': 'minor',

  // Cosmetic - suggestions
  'DOUBLE_COLON': 'cosmetic',
  'MISSING_SPACE_INHERITANCE': 'cosmetic',
  'UNUSED_TOKEN': 'cosmetic',
  'DUPLICATE_TOKEN': 'cosmetic'
}

// Error code to healability mapping
const ERROR_HEALABILITY: Record<string, Healability> = {
  // Auto-fixable
  'LOWERCASE_COMPONENT': 'auto',
  'DOUBLE_COLON': 'auto',
  'MISSING_SPACE_INHERITANCE': 'auto',
  'UNEXPECTED_CLOSE_BRACE': 'auto',

  // Assisted - simple fix with context
  'UNCLOSED_BRACE': 'assisted',
  'UNCLOSED_STRING': 'assisted',
  'INVALID_COLOR': 'assisted',

  // Manual - needs user decision
  'UNDEFINED_TOKEN': 'manual',
  'UNKNOWN_PARENT_COMPONENT': 'manual',
  'UNUSED_TOKEN': 'manual',

  // Complex - multiple possible fixes
  'CONFLICTING_DIRECTIONS': 'complex',
  'CIRCULAR_TOKEN_REFERENCE': 'complex',
  'DEEP_NESTING': 'complex'
}

/**
 * Classifies a single error
 */
export function classifyError(error: ValidationError, code: string): ErrorClassification {
  const category = getCategory(error)
  const severity = getSeverity(error)
  const healability = getHealability(error)
  const context = buildContext(error, code)
  const suggestedActions = generateSuggestedActions(error, category, code)

  return {
    category,
    severity,
    healability,
    context,
    suggestedActions
  }
}

/**
 * Converts a unified Diagnostic to legacy ValidationError format
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

/**
 * Maps unified DiagnosticCategory to legacy type
 */
function mapCategoryToLegacyType(category: string): 'syntax' | 'semantic' | 'token' | 'layout' {
  switch (category) {
    case 'lexer':
    case 'parser':
      return 'syntax'
    case 'semantic':
    case 'type':
    case 'reference':
      return 'semantic'
    case 'property':
    case 'event':
    case 'action':
    case 'animation':
    case 'state':
    case 'library':
      return 'layout'
    default:
      return 'syntax'
  }
}

/**
 * Classifies all errors in code
 */
export function classifyErrors(code: string): Map<ValidationError, ErrorClassification> {
  const result = unifiedValidate(code, { mode: 'live' })
  const classifications = new Map<ValidationError, ErrorClassification>()

  for (const diag of result.diagnostics) {
    const error = diagnosticToValidationError(diag)
    classifications.set(error, classifyError(error, code))
  }

  return classifications
}

/**
 * Gets error category
 */
function getCategory(error: ValidationError): ErrorCategory {
  if (error.code && ERROR_CATEGORIES[error.code]) {
    return ERROR_CATEGORIES[error.code]
  }

  // Fallback based on error type
  switch (error.type) {
    case 'syntax': return 'structural'
    case 'semantic': return 'reference'
    case 'token': return 'reference'
    case 'layout': return 'layout'
    default: return 'unknown'
  }
}

/**
 * Gets error severity
 */
function getSeverity(error: ValidationError): ErrorSeverity {
  if (error.code && ERROR_SEVERITIES[error.code]) {
    return ERROR_SEVERITIES[error.code]
  }

  // Fallback based on error severity
  return error.severity === 'error' ? 'major' : 'cosmetic'
}

/**
 * Gets error healability
 */
function getHealability(error: ValidationError): Healability {
  if (error.code && ERROR_HEALABILITY[error.code]) {
    return ERROR_HEALABILITY[error.code]
  }

  // Fallback: if it has a fix, it's at least assisted
  if (error.fix) {
    return 'assisted'
  }

  return 'manual'
}

/**
 * Builds error context
 */
function buildContext(error: ValidationError, code: string): ErrorContext {
  const lines = code.split('\n')
  const lineIndex = error.line - 1

  const context: ErrorContext = {
    line: error.line,
    column: error.column
  }

  // Get surrounding code
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const start = Math.max(0, lineIndex - 1)
    const end = Math.min(lines.length, lineIndex + 2)
    context.surroundingCode = lines.slice(start, end).join('\n')
  }

  // Try to find affected component
  const affectedComp = findAffectedComponent(code, error.line)
  if (affectedComp) {
    context.affectedComponent = affectedComp
  }

  return context
}

/**
 * Finds the component affected by an error
 */
function findAffectedComponent(code: string, errorLine: number): string | undefined {
  const lines = code.split('\n')

  // Look backwards for component definition
  for (let i = errorLine - 1; i >= 0; i--) {
    const line = lines[i]
    const match = line.match(/^\s*([A-Z][A-Za-z0-9]*)\s*(?:\{|:)/)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

/**
 * Generates suggested actions for an error
 */
function generateSuggestedActions(
  error: ValidationError,
  category: ErrorCategory,
  code: string
): SuggestedAction[] {
  const actions: SuggestedAction[] = []

  // Use existing fix if available
  if (error.fix) {
    actions.push({
      type: 'fix',
      description: error.fix.description,
      confidence: 0.9,
      code: error.fix.replacement
    })
  }

  // Generate category-specific suggestions
  switch (category) {
    case 'structural':
      actions.push(...generateStructuralActions(error, code))
      break
    case 'naming':
      actions.push(...generateNamingActions(error, code))
      break
    case 'reference':
      actions.push(...generateReferenceActions(error, code))
      break
    case 'layout':
      actions.push(...generateLayoutActions(error, code))
      break
  }

  // Sort by confidence
  return actions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Generates actions for structural errors
 */
function generateStructuralActions(error: ValidationError, code: string): SuggestedAction[] {
  const actions: SuggestedAction[] = []

  switch (error.code) {
    case 'UNCLOSED_BRACE':
      actions.push({
        type: 'add',
        description: 'Schließende Klammer hinzufügen',
        confidence: 0.8,
        code: '}'
      })
      break

    case 'UNCLOSED_STRING':
      actions.push({
        type: 'add',
        description: 'Anführungszeichen schließen',
        confidence: 0.8,
        code: '"'
      })
      break
  }

  return actions
}

/**
 * Generates actions for naming errors
 */
function generateNamingActions(error: ValidationError, code: string): SuggestedAction[] {
  const actions: SuggestedAction[] = []

  if (error.code === 'LOWERCASE_COMPONENT') {
    // Extract component name and capitalize
    const match = error.message.match(/"([a-z][A-Za-z0-9]*)"/)
    if (match) {
      const fixed = match[1].charAt(0).toUpperCase() + match[1].slice(1)
      actions.push({
        type: 'rename',
        description: `Umbenennen zu "${fixed}"`,
        confidence: 0.95,
        code: fixed
      })
    }
  }

  return actions
}

/**
 * Generates actions for reference errors
 */
function generateReferenceActions(error: ValidationError, code: string): SuggestedAction[] {
  const actions: SuggestedAction[] = []

  if (error.code === 'UNDEFINED_TOKEN') {
    // Extract token name
    const match = error.message.match(/\$([a-zA-Z][\w-]*)/)
    if (match) {
      const tokenName = match[1]
      actions.push({
        type: 'add',
        description: `Token $${tokenName} definieren`,
        confidence: 0.7,
        code: `$${tokenName}: #3B82F6  // TODO: Wert anpassen`
      })
    }
  }

  if (error.code === 'UNKNOWN_PARENT_COMPONENT') {
    actions.push({
      type: 'add',
      description: 'Eltern-Komponente definieren',
      confidence: 0.6
    })
  }

  return actions
}

/**
 * Generates actions for layout errors
 */
function generateLayoutActions(error: ValidationError, code: string): SuggestedAction[] {
  const actions: SuggestedAction[] = []

  if (error.code === 'CONFLICTING_DIRECTIONS') {
    actions.push(
      {
        type: 'remove',
        description: 'Verwende nur horizontal',
        confidence: 0.5
      },
      {
        type: 'remove',
        description: 'Verwende nur vertical',
        confidence: 0.5
      }
    )
  }

  if (error.code === 'MANY_CHILDREN_NO_WRAP') {
    actions.push({
      type: 'add',
      description: 'wrap hinzufügen',
      confidence: 0.8,
      code: 'wrap'
    })
  }

  return actions
}

/**
 * Gets errors by category
 */
export function getErrorsByCategory(
  code: string
): Record<ErrorCategory, ValidationError[]> {
  const classifications = classifyErrors(code)
  const byCategory: Record<ErrorCategory, ValidationError[]> = {
    structural: [],
    naming: [],
    reference: [],
    type: [],
    layout: [],
    style: [],
    logic: [],
    unknown: []
  }

  for (const [error, classification] of classifications) {
    byCategory[classification.category].push(error)
  }

  return byCategory
}

/**
 * Gets healable errors
 */
export function getHealableErrors(code: string): ValidationError[] {
  const classifications = classifyErrors(code)
  const healable: ValidationError[] = []

  for (const [error, classification] of classifications) {
    if (classification.healability === 'auto' || classification.healability === 'assisted') {
      healable.push(error)
    }
  }

  return healable
}

/**
 * Gets critical errors
 */
export function getCriticalErrors(code: string): ValidationError[] {
  const classifications = classifyErrors(code)
  const critical: ValidationError[] = []

  for (const [error, classification] of classifications) {
    if (classification.severity === 'critical') {
      critical.push(error)
    }
  }

  return critical
}

/**
 * Checks if code has critical errors
 */
export function hasCriticalErrors(code: string): boolean {
  return getCriticalErrors(code).length > 0
}

/**
 * Gets healing priority (higher = more urgent)
 */
export function getHealingPriority(classification: ErrorClassification): number {
  let priority = 0

  // Severity factor
  switch (classification.severity) {
    case 'critical': priority += 100; break
    case 'major': priority += 50; break
    case 'minor': priority += 20; break
    case 'cosmetic': priority += 5; break
  }

  // Healability factor (easier = higher priority)
  switch (classification.healability) {
    case 'auto': priority += 30; break
    case 'assisted': priority += 20; break
    case 'manual': priority += 5; break
    case 'complex': priority += 0; break
  }

  // Suggested actions factor
  if (classification.suggestedActions.length > 0) {
    const maxConfidence = Math.max(...classification.suggestedActions.map(a => a.confidence))
    priority += Math.round(maxConfidence * 20)
  }

  return priority
}

/**
 * Sorts errors by healing priority
 */
export function sortByHealingPriority(code: string): ValidationError[] {
  const classifications = classifyErrors(code)
  const errorsWithPriority: Array<{ error: ValidationError; priority: number }> = []

  for (const [error, classification] of classifications) {
    errorsWithPriority.push({
      error,
      priority: getHealingPriority(classification)
    })
  }

  return errorsWithPriority
    .sort((a, b) => b.priority - a.priority)
    .map(e => e.error)
}
