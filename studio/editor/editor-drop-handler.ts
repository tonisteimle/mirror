/**
 * Editor Drop Handler - Handle component drops into CodeMirror editor
 *
 * Uses mouse coordinates for precise drop positioning:
 * - Calculates line from Y coordinate (snaps to line boundaries)
 * - Calculates indentation from X coordinate (snaps to 2-space increments)
 * - Shows visual drop indicator during drag
 *
 * Uses CodeMirror's native extension system (EditorView.domEventHandlers)
 * to properly intercept drops and prevent default text insertion.
 */

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { ComponentDragData } from '../panels/components/types'
import {
  getComponentDefinition,
  hasComponentDefinition,
  findDefinitionInsertPosition,
} from '../panels/components/component-templates'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('ComponentDrop')

export interface EditorDropPosition {
  /** Line number (1-indexed, or 0 for "before first line") */
  line: number
  /** Column number (0-indexed) */
  column: number
  /** Character offset in document */
  offset: number
  /** Chosen indentation level (number of spaces, snapped to 2-space increments) */
  indent: number
}

export interface ComponentDropConfig {
  /** Called when a component is dropped */
  onDrop: (data: ComponentDragData, position: EditorDropPosition, view: EditorView) => void
}

// Store for drop indicator element
let dropIndicator: HTMLElement | null = null
let currentView: EditorView | null = null

/**
 * Create drop indicator element
 */
function ensureDropIndicator(view: EditorView): HTMLElement {
  if (!dropIndicator || currentView !== view) {
    dropIndicator?.remove()
    dropIndicator = document.createElement('div')
    dropIndicator.className = 'editor-drop-indicator'
    dropIndicator.style.display = 'none'
    dropIndicator.style.position = 'absolute'
    dropIndicator.style.height = '2px'
    dropIndicator.style.pointerEvents = 'none'
    view.dom.appendChild(dropIndicator)
    currentView = view
  }
  return dropIndicator
}

/**
 * Get the current cursor position in the editor.
 * This is the SIMPLIFIED approach: always insert at cursor.
 */
function getCursorPosition(view: EditorView): EditorDropPosition {
  const doc = view.state.doc
  const selection = view.state.selection.main
  const offset = selection.head

  // Get line info at cursor
  const line = doc.lineAt(offset)
  const lineNumber = line.number
  const column = offset - line.from

  // Calculate indent from the current line's leading whitespace
  const lineText = line.text
  const leadingSpaces = lineText.match(/^(\s*)/)?.[1].length || 0
  const indent = Math.floor(leadingSpaces / 2) * 2 // Snap to even numbers

  return {
    line: lineNumber,
    column: column,
    offset: offset,
    indent: indent,
  }
}

/**
 * Convert mouse coordinates to editor position (legacy, kept for compatibility)
 */
function getPositionFromCoords(view: EditorView, x: number, y: number): EditorDropPosition | null {
  const doc = view.state.doc

  // Get position from CodeMirror
  const offset = view.posAtCoords({ x, y })
  if (offset === null) return null

  // Convert offset to line/column
  const line = doc.lineAt(offset)
  const lineNumber = line.number

  // Get the visual coordinates for this line
  const lineCoords = view.coordsAtPos(line.from)
  if (!lineCoords) {
    return {
      line: lineNumber,
      column: 0,
      offset: line.to,
      indent: 0,
    }
  }

  // Calculate line height
  const lineHeight = view.defaultLineHeight

  // Determine if cursor is in top or bottom half of line (for Y snapping)
  const lineMiddle = lineCoords.top + lineHeight / 2
  const isInTopHalf = y < lineMiddle

  // Determine target line (the line AFTER which we insert)
  let targetLine: number

  if (lineNumber === 1 && isInTopHalf) {
    targetLine = 0
  } else if (isInTopHalf && lineNumber > 1) {
    targetLine = lineNumber - 1
  } else {
    targetLine = lineNumber
  }

  // Calculate indent level from X position
  const contentLeft = view.contentDOM.getBoundingClientRect().left
  const relativeX = x - contentLeft
  const charWidth = view.defaultCharacterWidth
  const rawColumn = Math.max(0, Math.floor(relativeX / charWidth))
  const indent = Math.floor(rawColumn / 2) * 2 // Snap to even numbers

  // Handle edge case for line 0 (before first line)
  if (targetLine === 0) {
    return {
      line: 0,
      column: 0,
      offset: 0,
      indent: indent,
    }
  }

  const targetLineInfo = doc.line(targetLine)

  return {
    line: targetLine,
    column: 0,
    offset: targetLineInfo.to,
    indent: indent,
  }
}

/**
 * Show drop indicator at position
 */
function showDropIndicator(view: EditorView, pos: EditorDropPosition): void {
  const indicator = ensureDropIndicator(view)
  const doc = view.state.doc
  const editorRect = view.dom.getBoundingClientRect()
  const contentRect = view.contentDOM.getBoundingClientRect()
  const lineHeight = view.defaultLineHeight
  const charWidth = view.defaultCharacterWidth

  let indicatorTop: number

  if (pos.line === 0) {
    const firstLineCoords = view.coordsAtPos(0)
    if (!firstLineCoords) return
    indicatorTop = firstLineCoords.top - editorRect.top
  } else if (pos.line >= doc.lines) {
    const lastLine = doc.line(doc.lines)
    const lastLineCoords = view.coordsAtPos(lastLine.from)
    if (!lastLineCoords) return
    indicatorTop = lastLineCoords.top - editorRect.top + lineHeight
  } else {
    const targetLine = doc.line(pos.line)
    const coords = view.coordsAtPos(targetLine.from)
    if (!coords) return
    indicatorTop = coords.top - editorRect.top + lineHeight
  }

  const contentLeftOffset = contentRect.left - editorRect.left
  const indentLeft = contentLeftOffset + pos.indent * charWidth

  indicator.style.display = 'block'
  indicator.style.left = `${indentLeft}px`
  indicator.style.right = '0'
  indicator.style.top = `${indicatorTop}px`
}

/**
 * Hide drop indicator
 */
function hideDropIndicator(): void {
  if (dropIndicator) {
    dropIndicator.style.display = 'none'
  }
}

/**
 * Insert component code at the drop position
 */
export function insertComponentCode(view: EditorView, code: string, pos: EditorDropPosition): void {
  const doc = view.state.doc
  const totalLines = doc.lines

  // Base indent string from user's X position
  const baseIndent = ' '.repeat(pos.indent)

  // Add base indent to each line (preserving relative indentation)
  const lines = code.split('\n')
  const indentedLines = lines
    .map(line => {
      if (!line.trim()) return ''
      return baseIndent + line
    })
    .filter(line => line.trim() !== '' || lines.length === 1)

  const indentedCode = indentedLines.join('\n')

  // Special case: insert BEFORE first line
  if (pos.line === 0) {
    const insertText = indentedCode + '\n'
    view.dispatch({
      changes: { from: 0, to: 0, insert: insertText },
      selection: { anchor: insertText.length },
    })
    view.focus()
    return
  }

  // Normal case: insert AFTER target line
  const lineNumber = Math.max(1, Math.min(pos.line, totalLines))
  const targetLine = doc.line(lineNumber)
  const insertPos = targetLine.to
  const insertText = '\n' + indentedCode

  view.dispatch({
    changes: { from: insertPos, to: insertPos, insert: insertText },
    selection: { anchor: insertPos + insertText.length },
  })

  view.focus()
}

/**
 * Insert component code WITH its definition (if not already present)
 *
 * Component Definition Pattern:
 * 1. Check if a definition (e.g., "Select:") exists in the code
 * 2. If not, insert the definition at the top (after tokens)
 * 3. Insert the instance at the drop position
 *
 * @param view - CodeMirror editor view
 * @param code - Instance code to insert at drop position
 * @param pos - Drop position for the instance
 * @param componentName - Name of the component (e.g., "Select")
 */
export function insertComponentWithDefinition(
  view: EditorView,
  code: string,
  pos: EditorDropPosition,
  componentName: string
): void {
  const doc = view.state.doc
  const currentCode = doc.toString()

  // Check if definition is needed
  const definition = getComponentDefinition(componentName)
  const needsDefinition = definition && !hasComponentDefinition(currentCode, componentName)

  if (needsDefinition && definition) {
    // Find where to insert the definition
    const defPos = findDefinitionInsertPosition(currentCode)

    // Calculate the actual character offset for the definition insertion
    let defOffset: number
    if (defPos === 0) {
      defOffset = 0
    } else {
      const defLine = doc.line(defPos)
      defOffset = defLine.to
    }

    // Insert definition first (this will shift the instance position)
    const defText = defPos === 0 ? definition + '\n\n' : '\n\n' + definition

    // Calculate the new instance position after definition insertion
    const defInsertLength = defText.length

    // Prepare instance insertion
    const totalLines = doc.lines
    const baseIndent = ' '.repeat(pos.indent)
    const lines = code.split('\n')
    const indentedLines = lines
      .map(line => {
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .filter(line => line.trim() !== '' || lines.length === 1)
    const indentedCode = indentedLines.join('\n')

    // Calculate instance offset
    let instanceOffset: number
    if (pos.line === 0) {
      instanceOffset = 0
    } else {
      const lineNumber = Math.max(1, Math.min(pos.line, totalLines))
      const targetLine = doc.line(lineNumber)
      instanceOffset = targetLine.to
    }

    // Adjust instance offset if definition is inserted before it
    if (defOffset <= instanceOffset) {
      instanceOffset += defInsertLength
    }

    const instanceText = pos.line === 0 ? indentedCode + '\n' : '\n' + indentedCode

    // Apply both changes in a single transaction
    view.dispatch({
      changes: [
        { from: defOffset, to: defOffset, insert: defText },
        {
          from: instanceOffset + defInsertLength,
          to: instanceOffset + defInsertLength,
          insert: instanceText,
        },
      ],
      selection: { anchor: instanceOffset + defInsertLength + instanceText.length },
    })

    log.info(`Inserted definition for ${componentName} and instance`)
  } else {
    // Just insert the instance (definition already exists or not needed)
    insertComponentCode(view, code, pos)
  }

  view.focus()
}

/**
 * Create CodeMirror extension for component drop handling
 *
 * This is the PROPER way to handle drops in CodeMirror 6.
 * Returning `true` from the handler prevents CodeMirror's default text insertion.
 */
export function createComponentDropExtension(config: ComponentDropConfig): Extension {
  return EditorView.domEventHandlers({
    dragover(event: DragEvent, view: EditorView) {
      // Only handle component drops
      if (!event.dataTransfer?.types.includes('application/mirror-component')) {
        return false
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'

      // Add visual highlight to editor
      view.dom.classList.add('editor-drop-target')

      // Show drop indicator at mouse position
      const pos = getPositionFromCoords(view, event.clientX, event.clientY)
      if (pos) {
        showDropIndicator(view, pos)
      }

      return true // Prevent default handling
    },

    dragleave(event: DragEvent, view: EditorView) {
      // Only handle component drops
      if (!event.dataTransfer?.types.includes('application/mirror-component')) {
        return false
      }

      // Only remove highlight if actually leaving the editor (not entering a child)
      const relatedTarget = event.relatedTarget as HTMLElement | null
      if (!relatedTarget || !view.dom.contains(relatedTarget)) {
        view.dom.classList.remove('editor-drop-target')
        hideDropIndicator()
      }

      return false
    },

    drop(event: DragEvent, view: EditorView) {
      // Only handle component drops
      if (!event.dataTransfer?.types.includes('application/mirror-component')) {
        return false
      }

      event.preventDefault()
      hideDropIndicator()
      view.dom.classList.remove('editor-drop-target')

      // Get component data
      const dataStr = event.dataTransfer.getData('application/mirror-component')
      if (!dataStr) {
        log.error('No component data in drop')
        return true // Still prevent default
      }

      // Parse component data
      let dragData: ComponentDragData
      try {
        dragData = JSON.parse(dataStr)
      } catch {
        log.error('Failed to parse drag data')
        return true
      }

      // Use mouse coordinates for precise drop position
      // Falls back to cursor position if coordinate conversion fails
      const pos =
        getPositionFromCoords(view, event.clientX, event.clientY) || getCursorPosition(view)

      // Call the handler
      config.onDrop(dragData, pos, view)

      log.info(
        'Component dropped at:',
        dragData.componentName,
        `line ${pos.line}, indent ${pos.indent}`
      )

      return true // CRITICAL: Prevents CodeMirror from inserting text/plain
    },
  })
}
