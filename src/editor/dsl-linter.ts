/**
 * DSL Linter for CodeMirror - provides live validation
 */

import type { Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'
import { ValidationService } from '../validation'
import type { ValidationError, ValidationWarning, TabType } from '../validation'

const validator = new ValidationService({
  autoCorrect: false, // Don't auto-correct in linter, just report
  strictMode: false,
  allowMissingDefinitions: true
})

/**
 * Create diagnostics from validation errors and warnings
 */
function createDiagnostics(
  view: EditorView,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const doc = view.state.doc

  // Process errors
  for (const error of errors) {
    const lineNum = error.line
    if (lineNum < 1 || lineNum > doc.lines) continue

    const line = doc.line(lineNum)

    diagnostics.push({
      from: line.from,
      to: line.to,
      severity: 'error',
      message: error.message,
      source: 'dsl'
    })
  }

  // Process warnings
  for (const warning of warnings) {
    const lineNum = warning.line
    if (lineNum < 1 || lineNum > doc.lines) continue

    const line = doc.line(lineNum)

    let message = warning.message
    if (warning.suggestion) {
      message += ` (${warning.suggestion})`
    }

    diagnostics.push({
      from: line.from,
      to: line.to,
      severity: 'warning',
      message,
      source: 'dsl'
    })
  }

  return diagnostics
}

/**
 * Linter function for components tab
 */
export function lintComponents(view: EditorView): Diagnostic[] {
  const code = view.state.doc.toString()
  if (!code.trim()) return []

  const result = validator.check(code, '')

  // Filter to only components tab errors/warnings
  const errors = result.errors.filter(e => e.tab === 'components')
  const warnings = result.warnings.filter(w => w.tab === 'components')

  return createDiagnostics(view, errors, warnings)
}

/**
 * Linter function for layout tab
 */
export function lintLayout(view: EditorView): Diagnostic[] {
  const code = view.state.doc.toString()
  if (!code.trim()) return []

  const result = validator.check('', code)

  // Filter to only layout tab errors/warnings
  const errors = result.errors.filter(e => e.tab === 'layout')
  const warnings = result.warnings.filter(w => w.tab === 'layout')

  return createDiagnostics(view, errors, warnings)
}

/**
 * Combined linter that checks both tabs with context
 */
export function createDSLLinter(tab: TabType, getOtherTabCode: () => string) {
  return (view: EditorView): Diagnostic[] => {
    const code = view.state.doc.toString()
    if (!code.trim()) return []

    const otherCode = getOtherTabCode()

    const result = tab === 'components'
      ? validator.check(code, otherCode)
      : validator.check(otherCode, code)

    // Filter to current tab
    const errors = result.errors.filter(e => e.tab === tab)
    const warnings = result.warnings.filter(w => w.tab === tab)

    return createDiagnostics(view, errors, warnings)
  }
}
