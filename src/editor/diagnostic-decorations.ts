/**
 * @module diagnostic-decorations
 * @description Shows diagnostics (like undefined tokens) as inline decorations
 *
 * Performance notes:
 * - Uses StateField to store diagnostics, only updates on explicit dispatch
 * - Decorations are rebuilt only when diagnostics change
 * - Separate from syntax highlighting cache - no interference
 */

import { EditorView, Decoration } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

export interface DiagnosticLocation {
  line: number
  column: number
  endColumn?: number
  length?: number
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  location: DiagnosticLocation
  source?: string
}

// Effect to update diagnostics
export const setDiagnostics = StateEffect.define<Diagnostic[]>()

// Decoration marks for different severities
const errorMark = Decoration.mark({ class: 'cm-lintRange-error' })
const warningMark = Decoration.mark({ class: 'cm-lintRange-warning' })

// StateField that holds the current decorations
const diagnosticDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    // Check for diagnostic update effect
    for (const effect of tr.effects) {
      if (effect.is(setDiagnostics)) {
        return buildDecorations(tr.state.doc, effect.value)
      }
    }
    // Map decorations through document changes
    if (tr.docChanged) {
      decorations = decorations.map(tr.changes)
    }
    return decorations
  },
  provide: f => EditorView.decorations.from(f)
})

/**
 * Build decoration set from diagnostics
 */
function buildDecorations(doc: { line: (n: number) => { from: number; to: number; text: string } }, diagnostics: Diagnostic[]): DecorationSet {
  const decorations: { from: number; to: number; decoration: Decoration }[] = []

  for (const diag of diagnostics) {
    try {
      const line = doc.line(diag.location.line)
      // Column is 1-indexed from parser, convert to 0-indexed for CodeMirror
      const column = diag.location.column - 1
      const from = line.from + column

      // Calculate end position
      let to: number
      if (diag.location.endColumn !== undefined) {
        to = line.from + (diag.location.endColumn - 1)
      } else if (diag.location.length !== undefined) {
        to = from + diag.location.length
      } else if (diag.source) {
        // Use source length (e.g., token name)
        to = from + diag.source.length + 1 // +1 for $ prefix
      } else {
        // Default: mark until end of word
        const rest = line.text.slice(column)
        const match = rest.match(/^[\w$-]+/)
        to = from + (match ? match[0].length : 1)
      }

      // Ensure bounds are valid
      if (from >= 0 && to > from && to <= line.to) {
        const mark = diag.severity === 'error' ? errorMark : warningMark
        decorations.push({ from, to, decoration: mark })
      }
    } catch {
      // Skip invalid line numbers
    }
  }

  // Sort by position and create decoration set
  decorations.sort((a, b) => a.from - b.from)
  return Decoration.set(decorations.map(d => d.decoration.range(d.from, d.to)))
}

/**
 * Extension that shows diagnostics as inline decorations
 */
export function diagnosticDecorationsExtension(): Extension {
  return [diagnosticDecorations]
}

/**
 * Update diagnostics in the editor
 */
export function updateDiagnostics(view: EditorView, diagnostics: Diagnostic[]): void {
  view.dispatch({
    effects: setDiagnostics.of(diagnostics)
  })
}
