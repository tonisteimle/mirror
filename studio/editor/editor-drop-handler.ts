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
  /** Line number (1-indexed) */
  line: number
  /** Column number (0-indexed) */
  column: number
  /** Character offset in document */
  offset: number
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
   * Snaps to line boundaries - returns the line AFTER which to insert
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

    // Get the visual coordinates for this line to determine if we're
    // in the top or bottom half of the line
    const lineCoords = this.editor.coordsAtPos(line.from)
    if (!lineCoords) {
      return {
        line: lineNumber,
        column: 0,
        offset: line.to,
      }
    }

    // Calculate line height
    const lineHeight = this.editor.defaultLineHeight

    // Determine if cursor is in top or bottom half of line
    const lineMiddle = lineCoords.top + lineHeight / 2
    const isInTopHalf = y < lineMiddle

    // Determine target line (the line AFTER which we insert)
    let targetLine: number

    if (lineNumber === 1 && isInTopHalf) {
      // Special case: hovering in top half of first line = insert BEFORE first line
      targetLine = 0
    } else if (isInTopHalf && lineNumber > 1) {
      // In top half of any other line = insert after previous line
      targetLine = lineNumber - 1
    } else {
      // In bottom half = insert after this line
      targetLine = lineNumber
    }

    // Handle edge case for line 0 (before first line)
    if (targetLine === 0) {
      return {
        line: 0,
        column: 0,
        offset: 0,
      }
    }

    const targetLineInfo = doc.line(targetLine)

    return {
      line: targetLine,
      column: 0,
      offset: targetLineInfo.to,
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
   * Show drop indicator at line boundary
   *
   * The indicator appears AFTER the target line (between target line and next line)
   * Special case: if target line is 0 (before first line), show at top of editor
   */
  private showDropIndicator(pos: EditorDropPosition): void {
    if (!this.dropIndicator) return

    const doc = this.editor.state.doc
    const editorRect = this.editor.dom.getBoundingClientRect()
    const lineHeight = this.editor.defaultLineHeight

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

    this.dropIndicator.style.display = 'block'
    this.dropIndicator.style.position = 'absolute'
    this.dropIndicator.style.left = '0'
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
   * Insert component code at the drop position with smart indentation
   *
   * ROBUST BEHAVIOR:
   * - Always inserts NEW lines
   * - Never modifies existing code
   * - Calculates indentation based on context (parent/sibling)
   * - Handles insert before first line (pos.line === 0)
   */
  insertComponentCode(code: string, pos: EditorDropPosition): void {
    const doc = this.editor.state.doc
    const totalLines = doc.lines

    // Special case: insert BEFORE first line
    if (pos.line === 0) {
      // No indentation context, insert at root level
      const codeLines = code.split('\n')
      const indentedLines = codeLines.map(codeLine => codeLine.trim()).filter(l => l)
      const indentedCode = indentedLines.join('\n')
      const insertText = indentedCode + '\n'

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

    // Calculate the correct indentation based on context
    const indent = this.calculateIndentation(lineNumber)

    // Apply indentation to all lines of the component code
    const codeLines = code.split('\n')
    const indentedLines = codeLines.map((codeLine, index) => {
      const trimmedLine = codeLine.trim()
      if (!trimmedLine) return '' // Empty lines stay empty

      if (index === 0) {
        // First line gets the calculated indent
        return indent + trimmedLine
      } else {
        // Subsequent lines: preserve relative indentation from original code
        const originalIndent = codeLine.match(/^(\s*)/)?.[1] || ''
        const relativeIndent = originalIndent.length > 0 ? '  '.repeat(Math.floor(originalIndent.length / 2)) : ''
        return indent + relativeIndent + trimmedLine
      }
    })

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

  /**
   * Calculate the correct indentation for a new element
   *
   * RULES:
   * 1. Find the nearest component line above (starts with uppercase)
   * 2. New element is a CHILD → indent = parent indent + 2 spaces
   * 3. If drop is on a property line, new element is a SIBLING → same indent as component
   * 4. Root level (no parent) → no indentation
   */
  private calculateIndentation(lineNumber: number): string {
    const doc = this.editor.state.doc

    // Start from the drop line and search upward
    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const text = line.text
      const trimmed = text.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue

      // Get the indentation of this line
      const lineIndent = text.match(/^(\s*)/)?.[1] || ''

      // Check if this is a component line (starts with uppercase letter)
      // Components: Box, Text, Button, App, MyComponent, etc.
      if (/^[A-Z]/.test(trimmed)) {
        // Found a component - new element should be its child
        // Child indent = parent indent + 2 spaces
        return lineIndent + '  '
      }

      // Check if this is a property/attribute line
      // Properties start with lowercase: pad, bg, col, w, h, gap, etc.
      // Or special chars: $token, @state, etc.
      if (/^[a-z$@]/.test(trimmed)) {
        // This is a property line - find its parent component
        const propertyIndent = lineIndent

        // Search further up to find the parent component
        for (let j = i - 1; j >= 1; j--) {
          const parentLine = doc.line(j)
          const parentText = parentLine.text
          const parentTrimmed = parentText.trim()

          if (!parentTrimmed || parentTrimmed.startsWith('//')) continue

          const parentIndent = parentText.match(/^(\s*)/)?.[1] || ''

          // If we find a component with less indentation, that's the parent
          if (/^[A-Z]/.test(parentTrimmed) && parentIndent.length < propertyIndent.length) {
            // New element is sibling to the properties → child of this parent
            return parentIndent + '  '
          }

          // If we find a component at same or greater indent, it's not our parent
          if (/^[A-Z]/.test(parentTrimmed) && parentIndent.length <= propertyIndent.length) {
            return parentIndent + '  '
          }
        }

        // No parent found, use property indent level
        return propertyIndent
      }
    }

    // No context found - root level, no indentation
    return ''
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
