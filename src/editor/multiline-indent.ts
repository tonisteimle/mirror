/**
 * Multiline String Auto-Indent
 *
 * Provides smart Enter handling within multiline strings:
 * - Detects if cursor is inside a multiline string (single quotes)
 * - Preserves indentation from previous line when pressing Enter
 * - Falls back to plain newline outside multiline strings
 */

import { keymap } from '@codemirror/view'
import { insertNewline } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Find all multiline string ranges in the document.
 * Multiline strings are delimited by single quotes.
 */
function findMultilineStringRanges(text: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = []
  let pos = 0

  while (pos < text.length) {
    // Look for opening single quote (not escaped)
    if (text[pos] === "'" && (pos === 0 || text[pos - 1] !== '\\')) {
      const startPos = pos
      pos++ // skip opening quote

      // Find closing quote
      while (pos < text.length) {
        if (text[pos] === "'" && text[pos - 1] !== '\\') {
          ranges.push({ from: startPos, to: pos + 1 })
          pos++ // skip closing quote
          break
        }
        pos++
      }
      continue
    }
    pos++
  }

  return ranges
}

/**
 * Check if a position is inside a multiline string.
 */
export function isInsideMultilineString(view: EditorView, pos: number): boolean {
  const text = view.state.doc.toString()
  const ranges = findMultilineStringRanges(text)

  for (const range of ranges) {
    // Inside means: after opening quote, before or at closing quote
    if (pos > range.from && pos < range.to) {
      return true
    }
  }

  return false
}

/**
 * Get the indentation string from the current line.
 * Returns leading whitespace (spaces/tabs).
 */
function getLineIndent(view: EditorView, pos: number): string {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const match = lineText.match(/^(\s*)/)
  return match ? match[1] : ''
}

/**
 * Smart Enter handler that preserves indentation in multiline strings.
 */
function smartEnterHandler(view: EditorView): boolean {
  const pos = view.state.selection.main.head

  // Check if inside multiline string
  if (isInsideMultilineString(view, pos)) {
    // Get current line's indentation
    const indent = getLineIndent(view, pos)

    // Insert newline + same indentation
    view.dispatch({
      changes: { from: pos, to: pos, insert: '\n' + indent },
      selection: { anchor: pos + 1 + indent.length }
    })

    return true
  }

  // Outside multiline string: use default newline (no auto-indent)
  return insertNewline(view)
}

/**
 * Creates keymap with smart Enter handling.
 * - Inside multiline strings: preserves indentation
 * - Outside: plain newline (current behavior)
 */
export function createSmartEnterKeymap(): Extension {
  return keymap.of([
    { key: 'Enter', run: smartEnterHandler },
  ])
}

/**
 * Tab handler for multiline strings - inserts spaces instead of tab.
 * Useful for consistent indentation.
 */
function smartTabHandler(view: EditorView): boolean {
  const pos = view.state.selection.main.head

  // Check if inside multiline string
  if (isInsideMultilineString(view, pos)) {
    // Insert 2 spaces (standard Mirror indent)
    view.dispatch({
      changes: { from: pos, to: pos, insert: '  ' },
      selection: { anchor: pos + 2 }
    })
    return true
  }

  // Outside: let default Tab handling take over
  return false
}

/**
 * Creates keymap with smart Tab handling for multiline strings.
 */
export function createSmartTabKeymap(): Extension {
  return keymap.of([
    { key: 'Tab', run: smartTabHandler },
  ])
}

/**
 * Combined smart indent keymaps for multiline editing.
 */
export function createMultilineIndentKeymaps(): Extension[] {
  return [
    createSmartEnterKeymap(),
    createSmartTabKeymap(),
  ]
}
