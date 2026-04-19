/**
 * Draft Lines Extension
 *
 * CodeMirror extension that marks lines as "draft" (not yet validated by AI).
 * Draft lines are displayed with muted syntax highlighting colors.
 *
 * Usage:
 *   1. Add draftLinesExtension() to EditorView extensions
 *   2. Call setDraftLines(view, lineNumbers) to mark lines as draft
 *   3. Call clearDraftLines(view) to remove all draft markers
 */

import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'

// ===========================================
// Effects
// ===========================================

/** Effect to set which line numbers are drafts (1-indexed) */
export const setDraftLinesEffect = StateEffect.define<Set<number>>()

/** Effect to clear all draft lines */
export const clearDraftLinesEffect = StateEffect.define<void>()

// ===========================================
// Decoration
// ===========================================

const draftLineDecoration = Decoration.line({ class: 'cm-draft-line' })

// ===========================================
// State Field
// ===========================================

const draftLinesField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },

  update(decorations, tr) {
    // Map existing decorations through document changes
    decorations = decorations.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(setDraftLinesEffect)) {
        const draftLineNumbers = effect.value
        const builder: { from: number }[] = []

        for (const lineNum of draftLineNumbers) {
          try {
            const line = tr.state.doc.line(lineNum)
            builder.push({ from: line.from })
          } catch {
            // Line doesn't exist, skip
          }
        }

        // Create new decoration set
        decorations = Decoration.set(
          builder.map(({ from }) => draftLineDecoration.range(from)),
          true
        )
      }

      if (effect.is(clearDraftLinesEffect)) {
        decorations = Decoration.none
      }
    }

    return decorations
  },

  provide: field => EditorView.decorations.from(field),
})

// ===========================================
// CSS Theme
// ===========================================

const draftLinesTheme = EditorView.baseTheme({
  // Draft lines have muted syntax colors
  '.cm-draft-line': {
    // Subtle background to indicate draft status
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    // Fallback text color for any unstyled text
    color: '#666',
  },

  // Override token colors for draft lines
  '.cm-draft-line .tok-keyword': { color: '#6b5b7a !important' },
  '.cm-draft-line .tok-string': { color: '#5a6b4d !important' },
  '.cm-draft-line .tok-propertyName': { color: '#4a5f7a !important' },
  '.cm-draft-line .tok-number': { color: '#7a5a4a !important' },
  '.cm-draft-line .tok-punctuation': { color: '#4a6a6a !important' },
  '.cm-draft-line .tok-variableName': { color: '#555 !important' },
  '.cm-draft-line .tok-comment': { color: '#444 !important' },
})

// ===========================================
// Extension
// ===========================================

/**
 * CodeMirror extension for draft line decorations.
 * Add this to your EditorView extensions array.
 */
export function draftLinesExtension() {
  return [draftLinesField, draftLinesTheme]
}

// ===========================================
// API Functions
// ===========================================

/**
 * Mark specific lines as draft (muted colors).
 * @param view - The CodeMirror EditorView
 * @param lineNumbers - Set of 1-indexed line numbers to mark as draft
 */
export function setDraftLines(view: EditorView, lineNumbers: Set<number>): void {
  view.dispatch({
    effects: setDraftLinesEffect.of(lineNumbers),
  })
}

/**
 * Clear all draft line markers (all lines become validated/bright).
 * @param view - The CodeMirror EditorView
 */
export function clearDraftLines(view: EditorView): void {
  view.dispatch({
    effects: clearDraftLinesEffect.of(undefined),
  })
}

/**
 * Compare current content with validated content and return draft line numbers.
 * A line is considered draft if it differs from the validated version.
 *
 * @param currentContent - Current editor content
 * @param validatedContent - Last validated content
 * @returns Set of 1-indexed line numbers that are drafts
 */
export function detectDraftLines(currentContent: string, validatedContent: string): Set<number> {
  const currentLines = currentContent.split('\n')
  const validatedLines = validatedContent.split('\n')
  const draftLineNumbers = new Set<number>()

  for (let i = 0; i < currentLines.length; i++) {
    const lineNum = i + 1 // 1-indexed
    const isDraft = i >= validatedLines.length || currentLines[i] !== validatedLines[i]
    if (isDraft) {
      draftLineNumbers.add(lineNum)
    }
  }

  return draftLineNumbers
}
