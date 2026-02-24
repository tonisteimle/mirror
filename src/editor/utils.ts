/**
 * Shared editor utility functions.
 * Consolidates common patterns used across editor components.
 */
import type { EditorView } from '@codemirror/view'
import type { Position } from '../types/common'

/**
 * Check if the cursor is inside a string literal.
 * Counts unescaped quotes - odd number means inside string.
 */
export function isInsideString(textBefore: string): boolean {
  // Count only unescaped quotes (not preceded by backslash)
  // Match quotes that are either at start or not preceded by backslash
  const unescapedQuotes = textBefore.match(/(?<!\\)"/g) || []
  return unescapedQuotes.length % 2 !== 0
}

/**
 * Get text before cursor on the current line.
 */
export function getTextBeforeCursor(view: EditorView): string {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  return line.text.slice(0, pos - line.from)
}

/**
 * Get cursor screen coordinates from editor view.
 * Returns null if coordinates cannot be determined.
 */
export function getCursorCoords(view: EditorView): Position | null {
  const cursorPos = view.state.selection.main.head
  const coords = view.coordsAtPos(cursorPos)
  if (!coords) return null

  return {
    x: coords.left,
    y: coords.bottom,
  }
}

/**
 * Get the current cursor position in the document.
 */
export function getCursorPosition(view: EditorView): number {
  return view.state.selection.main.head
}

/**
 * Get the current line at cursor.
 */
export function getCurrentLine(view: EditorView) {
  const pos = view.state.selection.main.head
  return view.state.doc.lineAt(pos)
}

/**
 * Prepare text for insertion, adding space before if needed.
 * Prevents inserting text directly adjacent to other text.
 */
export function prepareInsertText(
  view: EditorView,
  text: string,
  insertPos: number
): string {
  if (insertPos <= 0) return text

  const charBefore = view.state.doc.sliceString(insertPos - 1, insertPos)
  if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
    return ' ' + text
  }
  return text
}

/**
 * Insert text at a position, replacing text up to cursor.
 * Handles spacing automatically.
 */
export function insertTextWithSpacing(
  view: EditorView,
  text: string,
  fromPos: number,
  toPos?: number
): void {
  const insertText = prepareInsertText(view, text, fromPos)
  const cursorPos = toPos ?? view.state.selection.main.head

  view.dispatch({
    changes: { from: fromPos, to: cursorPos, insert: insertText },
  })
}

/**
 * Get the character before a position.
 */
export function getCharBefore(view: EditorView, pos: number): string {
  if (pos <= 0) return ''
  return view.state.doc.sliceString(pos - 1, pos)
}

/**
 * Get the character after a position.
 */
export function getCharAfter(view: EditorView, pos: number): string {
  if (pos >= view.state.doc.length) return ''
  return view.state.doc.sliceString(pos, pos + 1)
}
