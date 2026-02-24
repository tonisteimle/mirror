/**
 * Inline Diagnostics
 *
 * Provides inline diagnostic information for the editor.
 * Part of Editor Integration (Increment 25).
 */

import { unifiedValidate } from '../../validation'
import type { Diagnostic } from '../../validation/core'
import { classifyError } from '../self-healing/error-classifier'
import type { ErrorClassification } from '../self-healing/error-classifier'
import { generateFixes, isSafeFix } from '../self-healing/fix-generator'
import type { GeneratedFix } from '../self-healing/fix-generator'

/**
 * Diagnostic severity levels
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

/**
 * Inline diagnostic
 */
export interface InlineDiagnostic {
  line: number
  column?: number
  endLine?: number
  endColumn?: number
  message: string
  severity: DiagnosticSeverity
  code: string
  source: string
  relatedInfo?: RelatedInfo[]
  quickFixes?: QuickFix[]
  tags?: DiagnosticTag[]
}

/**
 * Related diagnostic info
 */
export interface RelatedInfo {
  location: {
    line: number
    column?: number
  }
  message: string
}

/**
 * Quick fix action
 */
export interface QuickFix {
  title: string
  kind: QuickFixKind
  edit: TextEdit
  isPreferred?: boolean
  diagnostics?: string[]
}

/**
 * Quick fix kinds
 */
export type QuickFixKind =
  | 'quickfix'
  | 'refactor'
  | 'source'
  | 'organizeImports'

/**
 * Text edit operation
 */
export interface TextEdit {
  range: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  newText: string
}

/**
 * Diagnostic tags
 */
export type DiagnosticTag = 'unnecessary' | 'deprecated'

/**
 * Diagnostic options
 */
export interface DiagnosticOptions {
  includeWarnings?: boolean
  includeHints?: boolean
  generateQuickFixes?: boolean
  maxDiagnostics?: number
}

const DEFAULT_OPTIONS: Required<DiagnosticOptions> = {
  includeWarnings: true,
  includeHints: true,
  generateQuickFixes: true,
  maxDiagnostics: 100
}

/**
 * Maps unified DiagnosticCategory to legacy type for self-healing compatibility
 */
type LegacyErrorType = 'syntax' | 'semantic' | 'token' | 'layout'

function mapCategoryToLegacyType(category: string): LegacyErrorType {
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
    case 'correction':
      return 'syntax'
    default:
      return 'syntax'
  }
}

/**
 * Gets inline diagnostics for code
 */
export function getDiagnostics(
  code: string,
  options?: DiagnosticOptions
): InlineDiagnostic[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const inlineDiagnostics: InlineDiagnostic[] = []

  // Get unified validation result
  const result = unifiedValidate(code, { mode: 'live', includeInfo: opts.includeHints })

  // Convert unified diagnostics to inline diagnostics
  for (const diag of result.diagnostics) {
    if (inlineDiagnostics.length >= opts.maxDiagnostics) break

    // Map DiagnosticCategory to legacy type for self-healing compatibility
    const legacyType = mapCategoryToLegacyType(diag.category)

    // Create compatible error object for classification
    const errorForClassification = {
      type: legacyType,
      severity: diag.severity as 'error' | 'warning' | 'info',
      message: diag.message,
      line: diag.location.line,
      column: diag.location.column,
      code: diag.code
    }

    const classification = classifyError(errorForClassification, code)
    const severity = mapSeverity(diag.severity, classification)

    // Skip based on options
    if (severity === 'warning' && !opts.includeWarnings) continue
    if (severity === 'hint' && !opts.includeHints) continue

    const inlineDiagnostic: InlineDiagnostic = {
      line: diag.location.line,
      column: diag.location.column || getColumnFromLine(code, diag.location.line, diag.code),
      endLine: diag.location.endLine,
      endColumn: diag.location.endColumn,
      message: diag.message,
      severity,
      code: diag.code,
      source: 'mirror',
      tags: getTagsForError(diag.code)
    }

    // Add quick fixes if enabled
    if (opts.generateQuickFixes) {
      // Generate quick fixes from suggestions in unified diagnostic
      const quickFixes: QuickFix[] = []

      if (diag.suggestions) {
        for (const suggestion of diag.suggestions) {
          quickFixes.push({
            title: suggestion.label,
            kind: 'quickfix',
            edit: {
              range: {
                startLine: diag.location.line,
                startColumn: diag.location.column || 1,
                endLine: diag.location.endLine || diag.location.line,
                endColumn: diag.location.endColumn || 100
              },
              newText: suggestion.replacement
            },
            isPreferred: suggestion.confidence ? suggestion.confidence > 0.8 : false
          })
        }
      }

      // Also get fixes from self-healing system
      const healingFixes = generateQuickFixes(errorForClassification, code, classification)
      quickFixes.push(...healingFixes)

      if (quickFixes.length > 0) {
        inlineDiagnostic.quickFixes = quickFixes
      }
    }

    // Add related info for some error types
    const relatedInfo = getRelatedInfo(errorForClassification, code)
    if (relatedInfo.length > 0) {
      inlineDiagnostic.relatedInfo = relatedInfo
    }

    inlineDiagnostics.push(inlineDiagnostic)
  }

  return inlineDiagnostics
}

/**
 * Maps error severity to diagnostic severity
 */
function mapSeverity(
  errorSeverity: 'error' | 'warning' | 'info',
  classification: ErrorClassification
): DiagnosticSeverity {
  if (errorSeverity === 'error') {
    if (classification.severity === 'critical') {
      return 'error'
    }
    if (classification.severity === 'cosmetic' || classification.severity === 'minor') {
      return 'warning'
    }
    return 'error'
  }

  if (errorSeverity === 'info') {
    return 'hint'
  }

  return 'warning'
}

/**
 * Gets column position for an error
 */
function getColumnFromLine(code: string, line: number, errorType: string): number {
  const lines = code.split('\n')
  const lineText = lines[line - 1] || ''

  // Try to find the relevant position based on error type
  switch (errorType) {
    case 'LOWERCASE_COMPONENT': {
      const match = lineText.match(/([a-z][A-Za-z0-9]*)\s*\{/)
      return match ? lineText.indexOf(match[1]) + 1 : 1
    }

    case 'INVALID_TOKEN_NAME': {
      const match = lineText.match(/\$/)
      return match ? lineText.indexOf('$') + 1 : 1
    }

    case 'UNBALANCED_BRACES': {
      const openIndex = lineText.lastIndexOf('{')
      const closeIndex = lineText.lastIndexOf('}')
      return Math.max(openIndex, closeIndex) + 1 || lineText.length
    }

    default:
      return 1
  }
}

/**
 * Gets tags for error types
 */
function getTagsForError(errorType: string): DiagnosticTag[] | undefined {
  const tags: DiagnosticTag[] = []

  // Add unnecessary tag for certain errors
  if (errorType === 'EXTRA_COMMA' || errorType === 'UNUSED_TOKEN') {
    tags.push('unnecessary')
  }

  // Add deprecated tag
  if (errorType === 'DEPRECATED_PROPERTY' || errorType === 'DEPRECATED_SYNTAX') {
    tags.push('deprecated')
  }

  return tags.length > 0 ? tags : undefined
}

/**
 * Generates quick fixes for an error
 */
function generateQuickFixes(
  error: { type: string; line: number; message: string },
  code: string,
  classification: ErrorClassification
): QuickFix[] {
  const quickFixes: QuickFix[] = []

  // Get generated fixes from healing system
  const fixes = generateFixes(code).filter(f => f.error.line === error.line)

  for (const fix of fixes) {
    const quickFix = convertToQuickFix(fix, code)
    if (quickFix) {
      quickFixes.push(quickFix)
    }
  }

  // Add manual fix suggestions
  const manualFixes = getManualFixSuggestions(error, classification)
  quickFixes.push(...manualFixes)

  return quickFixes
}

/**
 * Converts a generated fix to a quick fix
 */
function convertToQuickFix(fix: GeneratedFix, code: string): QuickFix | null {
  const lines = code.split('\n')
  const line = lines[fix.error.line - 1]

  if (!line) return null

  // fix.fix is directly a FixOperation
  const operation = fix.fix
  if (!operation) return null

  let textEdit: TextEdit

  // Determine the column range based on operation type
  const startColumn = operation.column || 1
  const endColumn = operation.endColumn || line.length + 1
  const startLine = operation.line || fix.error.line
  const endLine = operation.endLine || startLine

  switch (operation.type) {
    case 'replace':
      textEdit = {
        range: {
          startLine,
          startColumn,
          endLine,
          endColumn
        },
        newText: operation.content || ''
      }
      break

    case 'insert':
      textEdit = {
        range: {
          startLine,
          startColumn,
          endLine: startLine,
          endColumn: startColumn
        },
        newText: operation.content || ''
      }
      break

    case 'delete':
      textEdit = {
        range: {
          startLine,
          startColumn,
          endLine,
          endColumn
        },
        newText: ''
      }
      break

    case 'wrap':
      // Wrap is more complex - for now just insert the content
      textEdit = {
        range: {
          startLine,
          startColumn,
          endLine,
          endColumn
        },
        newText: operation.content || ''
      }
      break

    default:
      return null
  }

  return {
    title: operation.description,
    kind: 'quickfix',
    edit: textEdit,
    isPreferred: isSafeFix(fix)
  }
}

/**
 * Gets manual fix suggestions based on error type
 */
function getManualFixSuggestions(
  error: { type: string; line: number; message: string },
  classification: ErrorClassification
): QuickFix[] {
  const suggestions: QuickFix[] = []

  // Add suggestions based on error type
  for (const action of classification.suggestedActions) {
    // Create quick fix suggestions for all action types
    suggestions.push({
      title: action.description,
      kind: 'quickfix',
      edit: {
        range: {
          startLine: error.line,
          startColumn: 1,
          endLine: error.line,
          endColumn: 1
        },
        newText: action.code ?? '' // Use suggested code if available
      }
    })
  }

  return suggestions
}

/**
 * Gets related info for certain error types
 */
function getRelatedInfo(
  error: { type: string; line: number; message: string },
  code: string
): RelatedInfo[] {
  const info: RelatedInfo[] = []

  switch (error.type) {
    case 'UNDEFINED_TOKEN': {
      // Find token definitions
      const tokenMatch = error.message.match(/\$[\w-]+/)
      if (tokenMatch) {
        const tokenName = tokenMatch[0]
        const lines = code.split('\n')

        // Look for similar tokens
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.match(/^\s*\$[\w-]+\s*:/)) {
            const definedToken = line.match(/\$([\w-]+)/)?.[0]
            if (definedToken && isSimilar(tokenName, definedToken)) {
              info.push({
                location: { line: i + 1 },
                message: `Did you mean ${definedToken}?`
              })
            }
          }
        }
      }
      break
    }

    case 'UNDEFINED_COMPONENT': {
      // Find component definitions
      const compMatch = error.message.match(/[A-Z][A-Za-z0-9]+/)
      if (compMatch) {
        const compName = compMatch[0]
        const lines = code.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.match(/^[A-Z][A-Za-z0-9]+\s*:/)) {
            const definedComp = line.match(/^([A-Z][A-Za-z0-9]+)/)?.[1]
            if (definedComp && isSimilar(compName, definedComp)) {
              info.push({
                location: { line: i + 1 },
                message: `Did you mean ${definedComp}?`
              })
            }
          }
        }
      }
      break
    }
  }

  return info
}

/**
 * Checks if two strings are similar (simple edit distance)
 */
function isSimilar(a: string, b: string): boolean {
  if (a === b) return false // Don't suggest the same

  const maxLen = Math.max(a.length, b.length)
  const threshold = Math.floor(maxLen * 0.3) // 30% difference allowed

  let diff = Math.abs(a.length - b.length)
  const minLen = Math.min(a.length, b.length)

  for (let i = 0; i < minLen; i++) {
    if (a[i].toLowerCase() !== b[i].toLowerCase()) {
      diff++
    }
  }

  return diff <= threshold
}

/**
 * Gets diagnostics for a specific line
 */
export function getDiagnosticsForLine(
  code: string,
  line: number
): InlineDiagnostic[] {
  const all = getDiagnostics(code)
  return all.filter(d => d.line === line)
}

/**
 * Gets the most severe diagnostic
 */
export function getMostSevereDiagnostic(
  diagnostics: InlineDiagnostic[]
): InlineDiagnostic | null {
  if (diagnostics.length === 0) return null

  const severityOrder: DiagnosticSeverity[] = ['error', 'warning', 'info', 'hint']

  return diagnostics.sort((a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  )[0]
}

/**
 * Groups diagnostics by line
 */
export function groupByLine(
  diagnostics: InlineDiagnostic[]
): Map<number, InlineDiagnostic[]> {
  const grouped = new Map<number, InlineDiagnostic[]>()

  for (const diagnostic of diagnostics) {
    const existing = grouped.get(diagnostic.line) || []
    existing.push(diagnostic)
    grouped.set(diagnostic.line, existing)
  }

  return grouped
}

/**
 * Formats diagnostic for display
 */
export function formatDiagnostic(diagnostic: InlineDiagnostic): string {
  const severityIcon = getSeverityIcon(diagnostic.severity)
  const location = diagnostic.column
    ? `${diagnostic.line}:${diagnostic.column}`
    : `${diagnostic.line}`

  return `${severityIcon} [${location}] ${diagnostic.message} (${diagnostic.code})`
}

/**
 * Gets icon for severity
 */
function getSeverityIcon(severity: DiagnosticSeverity): string {
  switch (severity) {
    case 'error': return '✗'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    case 'hint': return '💡'
  }
}

/**
 * Creates diagnostic summary
 */
export function createDiagnosticSummary(diagnostics: InlineDiagnostic[]): {
  errorCount: number
  warningCount: number
  infoCount: number
  hintCount: number
  hasErrors: boolean
  summary: string
} {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length
  const infoCount = diagnostics.filter(d => d.severity === 'info').length
  const hintCount = diagnostics.filter(d => d.severity === 'hint').length

  const parts: string[] = []
  if (errorCount > 0) parts.push(`${errorCount} Fehler`)
  if (warningCount > 0) parts.push(`${warningCount} Warnungen`)
  if (infoCount > 0) parts.push(`${infoCount} Infos`)
  if (hintCount > 0) parts.push(`${hintCount} Hinweise`)

  return {
    errorCount,
    warningCount,
    infoCount,
    hintCount,
    hasErrors: errorCount > 0,
    summary: parts.length > 0 ? parts.join(', ') : 'Keine Probleme'
  }
}
