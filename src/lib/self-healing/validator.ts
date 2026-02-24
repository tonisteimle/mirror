/**
 * Self-Healing Validator
 *
 * Validates Mirror code and generates structured feedback.
 */

import { parse } from '../../parser/parser'
import { unifiedValidate } from '../../validation'
import type { Diagnostic } from '../../validation/core'
import type { ParseIssue } from '../../parser/types'
import type { ValidationFeedback, CodeIssue, PromptLanguage } from './types'
import { generateCorrectionPrompt } from './correction-prompt'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract line number from error message if present.
 */
function extractLineFromError(error: string): number {
  const match = error.match(/(?:Line|line|Zeile)\s+(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate Mirror code and generate structured feedback.
 *
 * @param code - The Mirror code to validate
 * @param includeWarnings - Whether to include warnings in feedback
 * @param language - Language for correction prompts
 * @returns Validation feedback with issues and optional correction prompt
 */
export function validateMirrorCode(
  code: string,
  includeWarnings = false,
  language: PromptLanguage = 'de'
): ValidationFeedback {
  const issues: CodeIssue[] = []

  // Parse the code
  const parseResult = parse(code)

  // Collect parse errors with proper line extraction
  parseResult.errors.forEach((error) => {
    const errorStr = typeof error === 'string' ? error : String(error)
    issues.push({
      type: 'parse_error',
      line: extractLineFromError(errorStr),
      message: errorStr
    })
  })

  // Collect parse issues (lexer-level typos)
  parseResult.parseIssues.forEach((issue: ParseIssue) => {
    issues.push({
      type: 'parse_issue',
      line: issue.line + 1,
      message: issue.message,
      suggestion: issue.suggestion
    })
  })

  // Run unified validation (reuses parseResult)
  const validation = unifiedValidate(parseResult, { mode: 'ast', includeInfo: false })

  // Collect validation diagnostics
  validation.diagnostics.forEach((diag: Diagnostic) => {
    const isWarning = diag.severity === 'warning'

    // Skip warnings if not requested
    if (isWarning && !includeWarnings) return

    issues.push({
      type: isWarning ? 'validation_warning' : 'validation_error',
      line: diag.location.line,
      message: diag.message,
      suggestion: diag.suggestions?.[0]?.label
    })
  })

  // Deduplicate issues (same line + message)
  const seen = new Set<string>()
  const uniqueIssues = issues.filter(i => {
    const key = `${i.line}:${i.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by line number
  uniqueIssues.sort((a, b) => a.line - b.line)

  const valid = uniqueIssues.filter(i => i.type !== 'validation_warning').length === 0

  return {
    valid,
    issues: uniqueIssues,
    correctionPrompt: valid ? undefined : generateCorrectionPrompt(code, uniqueIssues, language)
  }
}

/**
 * Quick check if code is valid (for UI feedback).
 */
export function isValidMirrorCode(code: string): boolean {
  const feedback = validateMirrorCode(code, false)
  return feedback.valid
}

/**
 * Get a summary of issues for display.
 */
export function getIssueSummary(code: string): string[] {
  const feedback = validateMirrorCode(code, false)
  return feedback.issues.map(i => {
    if (i.suggestion) {
      return `Line ${i.line}: ${i.message} (${i.suggestion})`
    }
    return `Line ${i.line}: ${i.message}`
  })
}
