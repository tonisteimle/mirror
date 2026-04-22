/**
 * Smart Paste Extension
 *
 * CodeMirror extension that automatically adjusts indentation
 * when pasting multi-line code. Normalizes indentation to match
 * the cursor position and converts tabs to 2-space indentation.
 *
 * Usage:
 *   Add smartPasteExtension() to EditorView extensions
 */

import { EditorView } from '@codemirror/view'

// ===========================================
// Configuration
// ===========================================

const INDENT_SIZE = 2 // 2 spaces per indent level in Mirror DSL

// ===========================================
// Indentation Helpers
// ===========================================

/**
 * Get the indentation string at the cursor position.
 * Returns the leading whitespace of the current line.
 */
function getCursorIndentation(view: EditorView): string {
  const cursor = view.state.selection.main.from
  const line = view.state.doc.lineAt(cursor)
  const match = line.text.match(/^(\s*)/)
  return match ? match[1] : ''
}

/**
 * Convert tabs to spaces (2 spaces per tab).
 */
function tabsToSpaces(text: string): string {
  return text.replace(/\t/g, '  ')
}

/**
 * Find the minimum indentation across all non-empty lines.
 */
function findMinIndentation(lines: string[]): number {
  let minIndent = Infinity

  for (const line of lines) {
    // Skip empty lines
    if (line.trim().length === 0) continue

    // Count leading spaces (after tab conversion)
    const normalized = tabsToSpaces(line)
    const match = normalized.match(/^(\s*)/)
    const indent = match ? match[1].length : 0

    minIndent = Math.min(minIndent, indent)
  }

  return minIndent === Infinity ? 0 : minIndent
}

/**
 * Adjust indentation of pasted text based on cursor position.
 *
 * Algorithm:
 * 1. Convert tabs to 2-space indentation
 * 2. Find minimum indentation in pasted text
 * 3. Remove base indentation from all lines
 * 4. Add cursor indentation to all lines (except first, which is inline)
 */
function adjustIndentation(text: string, view: EditorView): string {
  const lines = text.split('\n')

  // For single-line paste, just return as-is (with tab conversion)
  if (lines.length === 1) {
    return tabsToSpaces(text)
  }

  // Convert tabs to spaces first
  const normalized = lines.map(line => tabsToSpaces(line))

  // Find minimum indentation across all non-empty lines
  const minIndent = findMinIndentation(normalized)

  // Remove base indentation from all lines
  const dedented = normalized.map(line => {
    if (line.trim().length === 0) return ''
    return line.slice(minIndent)
  })

  // Get cursor indentation for re-indenting
  const cursorIndent = getCursorIndentation(view)

  // Re-indent lines:
  // - First line: no extra indentation (inline with cursor)
  // - Following lines: add cursor indentation
  return dedented
    .map((line, index) => {
      if (index === 0) return line
      if (line.length === 0) return ''
      return cursorIndent + line
    })
    .join('\n')
}

// ===========================================
// Paste Event Handler
// ===========================================

/**
 * DOM event handler for paste events.
 * Only intercepts multi-line pastes to adjust indentation.
 */
function handlePaste(event: ClipboardEvent, view: EditorView): boolean {
  const clipboardText = event.clipboardData?.getData('text/plain')

  // No clipboard text - let default handler work
  if (!clipboardText) return false

  // Single-line paste - let default handler work (but convert tabs)
  if (!clipboardText.includes('\n')) {
    // Only intercept if there are tabs to convert
    if (!clipboardText.includes('\t')) return false

    event.preventDefault()

    const converted = tabsToSpaces(clipboardText)
    const { from, to } = view.state.selection.main

    view.dispatch({
      changes: { from, to, insert: converted },
      selection: { anchor: from + converted.length },
    })

    return true
  }

  // Multi-line paste - apply smart indentation
  event.preventDefault()

  const adjusted = adjustIndentation(clipboardText, view)
  const { from, to } = view.state.selection.main

  view.dispatch({
    changes: { from, to, insert: adjusted },
    selection: { anchor: from + adjusted.length },
  })

  return true
}

// ===========================================
// Extension Export
// ===========================================

/**
 * CodeMirror extension for smart paste with indentation adjustment.
 * Add this to your EditorView extensions array.
 *
 * Features:
 * - Auto-adjusts indentation of pasted multi-line code
 * - Converts tabs to 2-space indentation
 * - Preserves relative indentation structure
 * - First line pastes inline with cursor
 *
 * @example
 * ```typescript
 * import { smartPasteExtension } from './editor/smart-paste'
 *
 * const editor = new EditorView({
 *   extensions: [
 *     smartPasteExtension(),
 *     // ... other extensions
 *   ]
 * })
 * ```
 */
export function smartPasteExtension() {
  return EditorView.domEventHandlers({
    paste: handlePaste,
  })
}
