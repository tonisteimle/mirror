/**
 * Editor Drop Handler - Handle component drops into CodeMirror editor
 *
 * Allows dragging components from the Component Panel directly into
 * the code editor at the cursor position.
 */

import type { EditorView } from '@codemirror/view'
import type { ComponentDragData } from '../panels/components/types'
import { events } from '../core'

export interface EditorDropHandlerConfig {
  /** CodeMirror EditorView instance */
  editor: EditorView
  /** Called when a component is dropped */
  onDrop?: (data: ComponentDragData, position: EditorDropPosition) => void
}

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

/**
 * Editor Drop Handler class
 */
export class EditorDropHandler {
  private editor: EditorView
  private onDrop?: EditorDropHandlerConfig['onDrop']
  private dropIndicator: HTMLElement | null = null
  private abortController: AbortController | null = null

  constructor(config: EditorDropHandlerConfig) {
    this.editor = config.editor
    this.onDrop = config.onDrop
  }

  /**
   * Attach drop handlers to the editor
   */
  attach(): void {
    this.abortController?.abort()
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const editorDom = this.editor.dom

    // Dragover - show drop indicator
    editorDom.addEventListener('dragover', this.handleDragOver.bind(this), { signal })

    // Dragleave - hide drop indicator
    editorDom.addEventListener('dragleave', this.handleDragLeave.bind(this), { signal })

    // Drop - insert component code
    editorDom.addEventListener('drop', this.handleDrop.bind(this), { signal })

    // Create drop indicator
    this.createDropIndicator()
  }

  /**
   * Detach drop handlers
   */
  detach(): void {
    this.abortController?.abort()
    this.abortController = null
    this.removeDropIndicator()
  }

  /**
   * Handle dragover event
   */
  private handleDragOver(event: DragEvent): void {
    // Check if this is a component drop
    if (!event.dataTransfer?.types.includes('application/mirror-component')) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'

    // Get position from coordinates
    const pos = this.getPositionFromCoords(event.clientX, event.clientY)
    if (pos) {
      this.showDropIndicator(pos)
    }
  }

  /**
   * Handle dragleave event
   */
  private handleDragLeave(event: DragEvent): void {
    // Only hide if actually leaving the editor
    const relatedTarget = event.relatedTarget as HTMLElement
    if (!this.editor.dom.contains(relatedTarget)) {
      this.hideDropIndicator()
    }
  }

  /**
   * Handle drop event
   */
  private handleDrop(event: DragEvent): void {
    // Check if this is a component drop
    const dataStr = event.dataTransfer?.getData('application/mirror-component')
    if (!dataStr) return

    event.preventDefault()
    event.stopPropagation()

    this.hideDropIndicator()

    // Parse component data
    let dragData: ComponentDragData
    try {
      dragData = JSON.parse(dataStr)
    } catch {
      console.error('[EditorDropHandler] Failed to parse drag data')
      return
    }

    // Get position from coordinates
    const pos = this.getPositionFromCoords(event.clientX, event.clientY)
    if (!pos) {
      console.error('[EditorDropHandler] Could not determine drop position')
      return
    }

    // Call handler
    this.onDrop?.(dragData, pos)

    // Emit event
    events.emit('component:editor-dropped', {
      data: dragData,
      position: pos,
    })
  }

  /**
   * Convert mouse coordinates to editor position
   *
   * - Y position: Snaps to line boundaries (between lines)
   * - X position: Determines indentation level (snaps to 2-space increments)
   *
   * Returns line=0 for "before first line" (special case)
   */
  private getPositionFromCoords(x: number, y: number): EditorDropPosition | null {
    const doc = this.editor.state.doc

    // Get position from CodeMirror
    const offset = this.editor.posAtCoords({ x, y })
    if (offset === null) return null

    // Convert offset to line/column
    const line = doc.lineAt(offset)
    const lineNumber = line.number

    // Get the visual coordinates for this line
    const lineCoords = this.editor.coordsAtPos(line.from)
    if (!lineCoords) {
      return {
        line: lineNumber,
        column: 0,
        offset: line.to,
        indent: 0,
      }
    }

    // Calculate line height
    const lineHeight = this.editor.defaultLineHeight

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
    // X position relative to editor content area → snap to 2-space increments
    const editorRect = this.editor.dom.getBoundingClientRect()
    const contentLeft = this.editor.contentDOM.getBoundingClientRect().left
    const relativeX = x - contentLeft

    // Approximate character width (monospace font)
    const charWidth = this.editor.defaultCharacterWidth

    // Calculate column from X position and snap to 2-space increments
    const rawColumn = Math.max(0, Math.floor(relativeX / charWidth))
    const indent = Math.floor(rawColumn / 2) * 2  // Snap to even numbers (0, 2, 4, 6, ...)

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
   * Create drop indicator element
   */
  private createDropIndicator(): void {
    this.dropIndicator = document.createElement('div')
    this.dropIndicator.className = 'editor-drop-indicator'
    this.dropIndicator.style.display = 'none'
    this.editor.dom.appendChild(this.dropIndicator)
  }

  /**
   * Remove drop indicator
   */
  private removeDropIndicator(): void {
    this.dropIndicator?.remove()
    this.dropIndicator = null
  }

  /**
   * Show drop indicator at line boundary with indent
   *
   * The indicator appears AFTER the target line (between target line and next line)
   * and starts at the chosen indentation level (based on X position).
   * Special case: if target line is 0 (before first line), show at top of editor
   */
  private showDropIndicator(pos: EditorDropPosition): void {
    if (!this.dropIndicator) return

    const doc = this.editor.state.doc
    const editorRect = this.editor.dom.getBoundingClientRect()
    const contentRect = this.editor.contentDOM.getBoundingClientRect()
    const lineHeight = this.editor.defaultLineHeight
    const charWidth = this.editor.defaultCharacterWidth

    let indicatorTop: number

    if (pos.line === 0) {
      // Special case: drop before first line - show at very top
      const firstLineCoords = this.editor.coordsAtPos(0)
      if (!firstLineCoords) return
      indicatorTop = firstLineCoords.top - editorRect.top
    } else if (pos.line >= doc.lines) {
      // Drop after last line - show at bottom of last line
      const lastLine = doc.line(doc.lines)
      const lastLineCoords = this.editor.coordsAtPos(lastLine.from)
      if (!lastLineCoords) return
      indicatorTop = lastLineCoords.top - editorRect.top + lineHeight
    } else {
      // Normal case: show at bottom of target line (between target and next)
      const targetLine = doc.line(pos.line)
      const coords = this.editor.coordsAtPos(targetLine.from)
      if (!coords) return
      indicatorTop = coords.top - editorRect.top + lineHeight
    }

    // Calculate left position based on indent level
    // pos.indent is number of spaces; multiply by charWidth for pixels
    const contentLeftOffset = contentRect.left - editorRect.left
    const indentLeft = contentLeftOffset + (pos.indent * charWidth)

    this.dropIndicator.style.display = 'block'
    this.dropIndicator.style.position = 'absolute'
    this.dropIndicator.style.left = `${indentLeft}px`
    this.dropIndicator.style.right = '0'
    this.dropIndicator.style.top = `${indicatorTop}px`
    this.dropIndicator.style.height = '2px'
  }

  /**
   * Hide drop indicator
   */
  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none'
    }
  }

  /**
   * Insert component code at the drop position with user-chosen indentation
   *
   * ROBUST BEHAVIOR:
   * - Always inserts NEW lines
   * - Never modifies existing code
   * - Uses the user-chosen indent level from pos.indent (X cursor position)
   * - Handles insert before first line (pos.line === 0)
   */
  insertComponentCode(code: string, pos: EditorDropPosition): void {
    const doc = this.editor.state.doc
    const totalLines = doc.lines

    // Convert pos.indent (number of spaces) to string
    const indentStr = ' '.repeat(pos.indent)

    // Helper: apply indentation to code lines
    const applyIndent = (codeLines: string[], baseIndent: string): string[] => {
      // Find minimum indentation in original code (excluding empty lines)
      let minIndent = Infinity
      for (const line of codeLines) {
        if (line.trim()) {
          const indent = line.match(/^(\s*)/)?.[1].length || 0
          minIndent = Math.min(minIndent, indent)
        }
      }
      if (minIndent === Infinity) minIndent = 0

      // Normalize and re-indent all lines
      return codeLines.map(line => {
        if (!line.trim()) return '' // Empty lines stay empty
        // Remove original minimum indent, then add new base indent
        const normalized = line.slice(minIndent)
        return baseIndent + normalized
      }).filter((line, index, arr) => {
        // Keep non-empty lines and preserve structure
        return line.trim() || (index > 0 && index < arr.length - 1)
      })
    }

    // Special case: insert BEFORE first line
    if (pos.line === 0) {
      const codeLines = code.split('\n')
      const indentedLines = applyIndent(codeLines, indentStr)

      const insertText = indentedLines.join('\n') + '\n'

      this.editor.dispatch({
        changes: {
          from: 0,
          to: 0,
          insert: insertText,
        },
        selection: {
          anchor: insertText.length,
        },
      })

      this.editor.focus()
      return
    }

    // Normal case: insert AFTER target line
    const lineNumber = Math.max(1, Math.min(pos.line, totalLines))
    const targetLine = doc.line(lineNumber)

    // Apply user-chosen indentation to all lines of the component code
    const codeLines = code.split('\n')
    const indentedLines = applyIndent(codeLines, indentStr)

    // Build insert text: newline + indented code
    const indentedCode = indentedLines.join('\n')
    const insertText = '\n' + indentedCode

    // Insert position: end of target line (after all existing content)
    const insertPos = targetLine.to

    // Dispatch the change
    this.editor.dispatch({
      changes: {
        from: insertPos,
        to: insertPos,
        insert: insertText,
      },
      // Move cursor to end of inserted code
      selection: {
        anchor: insertPos + insertText.length,
      },
    })

    // Focus the editor
    this.editor.focus()
  }

}

/**
 * Create an EditorDropHandler instance
 */
export function createEditorDropHandler(
  config: EditorDropHandlerConfig
): EditorDropHandler {
  return new EditorDropHandler(config)
}

// Add event type
declare module '../core/events' {
  interface StudioEvents {
    'component:editor-dropped': {
      data: ComponentDragData
      position: EditorDropPosition
    }
  }
}
