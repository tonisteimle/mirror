/**
 * Multiline String Auto-Indent
 *
 * Provides smart Enter handling within multiline strings:
 * - Detects if cursor is inside a multiline string (single quotes)
 * - Preserves indentation from previous line when pressing Enter
 * - Falls back to plain newline outside multiline strings
 */

import { keymap } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Find multiline string ranges in text.
 * H4 fix: Scan from start but stop early once we've found ranges past pos.
 */
function findMultilineStringRanges(text: string, maxPos: number): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = []
  let i = 0

  while (i < text.length) {
    // Look for opening single quote (not escaped)
    if (text[i] === "'" && (i === 0 || text[i - 1] !== '\\')) {
      const startPos = i
      i++ // skip opening quote

      // Find closing quote
      let foundClose = false
      while (i < text.length) {
        if (text[i] === "'" && text[i - 1] !== '\\') {
          ranges.push({ from: startPos, to: i + 1 })
          i++ // skip closing quote
          foundClose = true
          break
        }
        i++
      }
      // If we didn't find closing quote, this is an unclosed string - don't add it
      if (!foundClose) break

      // Early exit if we've passed the position we care about
      if (startPos > maxPos) break
      continue
    }
    i++
  }

  return ranges
}

/**
 * Check if a position is inside a multiline string.
 * H4 fix: Only scan necessary portion of document for better performance.
 */
export function isInsideMultilineString(view: EditorView, pos: number): boolean {
  // Scan enough text to find the string boundary around pos
  // We need to scan from start to find opening quotes, but can stop after pos+buffer
  const scanEnd = Math.min(pos + 200, view.state.doc.length)
  const text = view.state.doc.sliceString(0, scanEnd)
  const ranges = findMultilineStringRanges(text, pos)

  for (const range of ranges) {
    // Inside means: after opening quote (pos > range.from)
    // and before closing quote (pos < range.to)
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
 * Smart Enter handler that preserves indentation from current line.
 * Always preserves indentation, whether inside or outside multiline strings.
 */
function smartEnterHandler(view: EditorView): boolean {
  const { from, to } = view.state.selection.main

  // Get current line's indentation (from the line where selection starts)
  const indent = getLineIndent(view, from)

  // Insert newline + same indentation, replacing any selected text
  view.dispatch({
    changes: { from, to, insert: '\n' + indent },
    selection: { anchor: from + 1 + indent.length }
  })

  return true
}

/**
 * Creates keymap with smart Enter handling.
 * Preserves indentation from the current line on Enter.
 */
export function createSmartEnterKeymap(): Extension {
  return keymap.of([
    { key: 'Enter', run: smartEnterHandler },
  ])
}

/**
 * Tab handler - handles both single cursor and multi-line selection.
 * - Single cursor or selection within one line: insert 2 spaces
 * - Selection spanning multiple lines: indent all selected lines by 2 spaces
 */
function smartTabHandler(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const startLine = view.state.doc.lineAt(from)
  const endLine = view.state.doc.lineAt(to)

  // Multiple lines selected: indent each line by 2 spaces
  if (startLine.number !== endLine.number) {
    const changes: Array<{ from: number; to: number; insert: string }> = []

    // Add 2 spaces at the start of each line in selection
    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
      const line = view.state.doc.line(lineNum)
      changes.push({ from: line.from, to: line.from, insert: '  ' })
    }

    // Calculate new selection: expand to include added spaces
    const linesCount = endLine.number - startLine.number + 1
    const newFrom = from + 2 // First line gets 2 spaces added before selection start
    const newTo = to + (linesCount * 2) // Each line adds 2 spaces

    view.dispatch({
      changes,
      selection: { anchor: newFrom, head: newTo }
    })
    return true
  }

  // Single line: insert 2 spaces (replacing selection if any)
  view.dispatch({
    changes: { from, to, insert: '  ' },
    selection: { anchor: from + 2 }
  })
  return true
}

/**
 * Shift+Tab handler - removes indentation from selected lines.
 * Removes up to 2 spaces from the beginning of each line.
 */
function smartShiftTabHandler(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const startLine = view.state.doc.lineAt(from)
  const endLine = view.state.doc.lineAt(to)

  const changes: Array<{ from: number; to: number; insert: string }> = []
  let totalRemoved = 0
  let firstLineRemoved = 0

  // Remove up to 2 spaces from the start of each line
  for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
    const line = view.state.doc.line(lineNum)
    const lineText = line.text

    // Count leading spaces (max 2)
    let spacesToRemove = 0
    if (lineText.startsWith('  ')) {
      spacesToRemove = 2
    } else if (lineText.startsWith(' ')) {
      spacesToRemove = 1
    }

    if (spacesToRemove > 0) {
      changes.push({ from: line.from, to: line.from + spacesToRemove, insert: '' })
      totalRemoved += spacesToRemove
      if (lineNum === startLine.number) {
        firstLineRemoved = spacesToRemove
      }
    }
  }

  // If no changes, nothing to do
  if (changes.length === 0) {
    return true // Consumed the key but made no changes
  }

  // Calculate new selection
  const newFrom = Math.max(startLine.from, from - firstLineRemoved)
  const newTo = Math.max(newFrom, to - totalRemoved)

  view.dispatch({
    changes,
    selection: { anchor: newFrom, head: newTo }
  })
  return true
}

/**
 * Creates keymap with smart Tab handling for multiline strings.
 */
export function createSmartTabKeymap(): Extension {
  return keymap.of([
    { key: 'Tab', run: smartTabHandler },
    { key: 'Shift-Tab', run: smartShiftTabHandler },
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
