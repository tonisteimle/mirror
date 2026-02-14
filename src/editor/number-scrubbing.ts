/**
 * Number Scrubbing Extension
 *
 * Allows incrementing/decrementing numbers with Shift+Arrow keys.
 * - Shift+↑/↓: ±2 (good for spacing values)
 * - Shift+Cmd+↑/↓: ±10 (larger jumps)
 * - Shift+Alt+↑/↓: ±1 (fine-tuning)
 *
 * If no number exists at cursor position, inserts a starting value.
 */
import { keymap } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'

interface NumberMatch {
  start: number      // Start position in line
  end: number        // End position in line
  value: number      // Numeric value
  text: string       // Original text (to preserve formatting like "50%")
  hasPercent: boolean
}

/**
 * Find the number at or nearest to cursor position on current line.
 * Returns null if no number found on the line.
 */
function findNumberAtCursor(lineText: string, cursorInLine: number): NumberMatch | null {
  // Match numbers (with optional %) - integers and decimals
  const numberRegex = /(-?\d+\.?\d*)(%)?/g
  let match: RegExpExecArray | null
  let best: NumberMatch | null = null
  let bestDistance = Infinity

  while ((match = numberRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const value = parseFloat(match[1])
    const hasPercent = match[2] === '%'

    // Calculate distance from cursor to this number
    let distance: number
    if (cursorInLine >= start && cursorInLine <= end) {
      // Cursor is inside the number
      distance = 0
    } else if (cursorInLine < start) {
      distance = start - cursorInLine
    } else {
      distance = cursorInLine - end
    }

    // Prefer numbers that cursor is on or immediately after
    if (distance < bestDistance) {
      bestDistance = distance
      best = { start, end, value, text: match[0], hasPercent }
    }
  }

  // Only return if cursor is close (within 2 chars) or on the number
  if (best && bestDistance <= 2) {
    return best
  }

  return null
}

/**
 * Get the property name before cursor position (e.g., "pad" from "pad 8")
 */
function getPropertyBeforeCursor(lineText: string, cursorInLine: number): string | null {
  const beforeCursor = lineText.slice(0, cursorInLine)
  // Match property name followed by optional space
  const match = beforeCursor.match(/([a-z][-a-z]*)\s*$/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Determine default starting value based on property type.
 */
function getDefaultValue(property: string | null): number {
  if (!property) return 2

  // Size properties - start higher
  if (['w', 'h', 'minw', 'maxw', 'minh', 'maxh', 'size'].includes(property)) {
    return 16
  }
  // Spacing - start at 8
  if (['pad', 'mar', 'gap'].includes(property)) {
    return 8
  }
  // Border width/radius - start small
  if (['bor', 'rad', 'boc'].includes(property)) {
    return 4
  }
  // Opacity - special case
  if (['opa', 'opacity'].includes(property)) {
    return 1
  }
  // Default
  return 2
}

/**
 * Scrub (increment/decrement) or insert a number.
 */
function scrubNumber(view: EditorView, delta: number): boolean {
  const state = view.state
  const cursor = state.selection.main.head
  const line = state.doc.lineAt(cursor)
  const lineText = line.text
  const cursorInLine = cursor - line.from

  // Try to find existing number
  const numberMatch = findNumberAtCursor(lineText, cursorInLine)

  if (numberMatch) {
    // Modify existing number
    let newValue = numberMatch.value + delta

    // Clamp to reasonable values
    if (numberMatch.hasPercent) {
      newValue = Math.max(0, Math.min(100, newValue))
    } else {
      newValue = Math.max(0, newValue) // Don't go negative for most values
    }

    // Format the new value
    const isDecimal = numberMatch.text.includes('.') || (numberMatch.value % 1 !== 0)
    let newText: string
    if (isDecimal) {
      newText = newValue.toFixed(1)
    } else {
      newText = String(Math.round(newValue))
    }
    if (numberMatch.hasPercent) {
      newText += '%'
    }

    // Apply the change
    const from = line.from + numberMatch.start
    const to = line.from + numberMatch.end
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from + newText.length },
    })
    return true
  }

  // No number found - check if we should insert one
  const property = getPropertyBeforeCursor(lineText, cursorInLine)
  if (property) {
    // Insert a starting value
    const defaultVal = getDefaultValue(property)
    const newValue = Math.max(0, defaultVal + delta)
    const insertText = ' ' + String(newValue)

    view.dispatch({
      changes: { from: cursor, to: cursor, insert: insertText },
      selection: { anchor: cursor + insertText.length },
    })
    return true
  }

  return false
}

/**
 * Create the number scrubbing keymap extension.
 * Uses Prec.high to ensure it takes precedence over default selection keymaps.
 */
export function createNumberScrubbingKeymap() {
  return Prec.high(keymap.of([
    // Shift+ArrowUp: increment by 2
    {
      key: 'Shift-ArrowUp',
      run: (view) => scrubNumber(view, 2),
    },
    // Shift+ArrowDown: decrement by 2
    {
      key: 'Shift-ArrowDown',
      run: (view) => scrubNumber(view, -2),
    },
    // Shift+Cmd+ArrowUp: increment by 10
    {
      key: 'Shift-Mod-ArrowUp',
      run: (view) => scrubNumber(view, 10),
    },
    // Shift+Cmd+ArrowDown: decrement by 10
    {
      key: 'Shift-Mod-ArrowDown',
      run: (view) => scrubNumber(view, -10),
    },
    // Shift+Alt+ArrowUp: increment by 1
    {
      key: 'Shift-Alt-ArrowUp',
      run: (view) => scrubNumber(view, 1),
    },
    // Shift+Alt+ArrowDown: decrement by 1
    {
      key: 'Shift-Alt-ArrowDown',
      run: (view) => scrubNumber(view, -1),
    },
  ]))
}
