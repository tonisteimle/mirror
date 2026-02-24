/**
 * Semantic Selection Extension
 *
 * Alt+Click to intelligently select based on what was clicked:
 * - Component name → entire block with children
 * - Property → property + value pair
 * - Color (#ABC) → just the color
 * - String ("...") → just the string
 * - Number → just the number
 */
import { EditorView } from '@codemirror/view'

interface SelectionRange {
  from: number
  to: number
}

/**
 * Find the indentation level (number of leading spaces) of a line.
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Check if position is on a component name (starts with uppercase, at line start after indent).
 */
function isOnComponentName(lineText: string, posInLine: number): boolean {
  const match = lineText.match(/^(\s*)([A-Z][a-zA-Z0-9]*)/)
  if (!match) return false
  const indent = match[1].length
  const nameEnd = indent + match[2].length
  return posInLine >= indent && posInLine <= nameEnd
}

/**
 * Select the entire component block (component + all indented children).
 */
function selectComponentBlock(view: EditorView, lineNum: number): SelectionRange | null {
  const doc = view.state.doc
  const startLine = doc.line(lineNum)
  const startIndent = getIndentLevel(startLine.text)

  // Find the end of the block (first line with same or less indentation)
  let endLineNum = lineNum
  for (let i = lineNum + 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    // Skip empty lines
    if (!text.trim()) {
      endLineNum = i
      continue
    }

    const indent = getIndentLevel(text)
    if (indent <= startIndent) {
      // Found a line at same or lower indent - block ends before this
      break
    }
    endLineNum = i
  }

  const endLine = doc.line(endLineNum)
  return {
    from: startLine.from,
    to: endLine.to
  }
}

/**
 * Find a property-value pair at the given position.
 * Properties are lowercase words followed by a value.
 * Supports property: value syntax.
 * Uses simple O(n) approach to avoid catastrophic backtracking.
 */
function findPropertyValue(lineText: string, posInLine: number, lineFrom: number): SelectionRange | null {
  // Syntax: property: value (with colon)
  // e.g., "padding: 16", "background: #FFF"
  const propRegex = /([a-z][-a-z]*)(?::\s*|\s+)(\S+)/gi
  let match: RegExpExecArray | null

  while ((match = propRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (posInLine >= start && posInLine <= end) {
      return {
        from: lineFrom + start,
        to: lineFrom + end
      }
    }
  }

  return null
}

/**
 * Find a color value (#RGB, #RRGGBB, #RRGGBBAA) at position.
 */
function findColor(lineText: string, posInLine: number, lineFrom: number): SelectionRange | null {
  const colorRegex = /#[0-9a-fA-F]{3,8}/g
  let match: RegExpExecArray | null

  while ((match = colorRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (posInLine >= start && posInLine <= end) {
      return {
        from: lineFrom + start,
        to: lineFrom + end
      }
    }
  }

  return null
}

/**
 * Find a string ("...") at position.
 */
function findString(lineText: string, posInLine: number, lineFrom: number): SelectionRange | null {
  const stringRegex = /"[^"]*"/g
  let match: RegExpExecArray | null

  while ((match = stringRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (posInLine >= start && posInLine <= end) {
      return {
        from: lineFrom + start,
        to: lineFrom + end
      }
    }
  }

  return null
}

/**
 * Find a number (with optional %) at position.
 */
function findNumber(lineText: string, posInLine: number, lineFrom: number): SelectionRange | null {
  const numberRegex = /-?\d+\.?\d*%?/g
  let match: RegExpExecArray | null

  while ((match = numberRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length

    if (posInLine >= start && posInLine <= end) {
      return {
        from: lineFrom + start,
        to: lineFrom + end
      }
    }
  }

  return null
}

/**
 * Determine what to select based on click position.
 */
function getSemanticSelection(view: EditorView, pos: number): SelectionRange | null {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const posInLine = pos - line.from

  // Priority order: most specific first

  // 1. Check if on a color
  const colorRange = findColor(lineText, posInLine, line.from)
  if (colorRange) return colorRange

  // 2. Check if on a string
  const stringRange = findString(lineText, posInLine, line.from)
  if (stringRange) return stringRange

  // 3. Check if on a number (but not part of color)
  const numberRange = findNumber(lineText, posInLine, line.from)
  if (numberRange) return numberRange

  // 4. Check if on component name → select block
  if (isOnComponentName(lineText, posInLine)) {
    return selectComponentBlock(view, line.number)
  }

  // 5. Check if on a property-value pair
  const propRange = findPropertyValue(lineText, posInLine, line.from)
  if (propRange) return propRange

  // Fallback: select the line
  return {
    from: line.from,
    to: line.to
  }
}

/**
 * Create the semantic selection extension.
 * Alt+Click triggers intelligent selection based on context.
 */
export function createSemanticSelectionExtension() {
  return EditorView.domEventHandlers({
    mousedown(event: MouseEvent, view: EditorView) {
      // Only handle Alt+Click (Option+Click on Mac)
      if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
        return false
      }

      // Get the position from the click
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      // Get semantic selection
      const selection = getSemanticSelection(view, pos)
      if (!selection) return false

      // Apply the selection
      view.dispatch({
        selection: { anchor: selection.from, head: selection.to }
      })

      // Prevent default behavior
      event.preventDefault()
      return true
    }
  })
}
