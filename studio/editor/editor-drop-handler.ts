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
   */
  private getPositionFromCoords(x: number, y: number): EditorDropPosition | null {
    // Get position from CodeMirror
    const offset = this.editor.posAtCoords({ x, y })
    if (offset === null) return null

    // Convert offset to line/column
    const line = this.editor.state.doc.lineAt(offset)
    const lineNumber = line.number
    const column = offset - line.from

    return {
      line: lineNumber,
      column,
      offset,
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
   * Show drop indicator at position
   */
  private showDropIndicator(pos: EditorDropPosition): void {
    if (!this.dropIndicator) return

    // Get visual coordinates for the line
    const coords = this.editor.coordsAtPos(pos.offset)
    if (!coords) return

    const editorRect = this.editor.dom.getBoundingClientRect()

    this.dropIndicator.style.display = 'block'
    this.dropIndicator.style.position = 'absolute'
    this.dropIndicator.style.left = '0'
    this.dropIndicator.style.right = '0'
    this.dropIndicator.style.top = `${coords.top - editorRect.top}px`
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
   * Insert component code at position with smart indentation
   */
  insertComponentCode(code: string, pos: EditorDropPosition): void {
    const doc = this.editor.state.doc
    const targetLine = doc.line(pos.line)

    // Calculate the correct indentation based on context
    const indent = this.calculateIndentation(pos.line)

    // Indent all lines of the component code
    const indentedCode = code
      .split('\n')
      .map((codeLine, index) => {
        if (index === 0) {
          return indent + codeLine
        }
        // For subsequent lines, add base indent + the line's own relative indent
        const lineIndent = codeLine.match(/^(\s*)/)?.[1] || ''
        const content = codeLine.trimStart()
        return indent + lineIndent + content
      })
      .join('\n')

    // Insert at end of current line with newline
    const insertPos = targetLine.to
    const insertText = '\n' + indentedCode

    this.editor.dispatch({
      changes: {
        from: insertPos,
        to: insertPos,
        insert: insertText,
      },
      selection: {
        anchor: insertPos + insertText.length,
      },
    })
  }

  /**
   * Calculate the correct indentation for a new child element
   * In Mirror DSL, children are indented 2 spaces more than their parent
   */
  private calculateIndentation(lineNumber: number): string {
    const doc = this.editor.state.doc

    // Find the parent element by looking at previous lines
    let parentIndent = ''
    let foundParent = false

    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const text = line.text
      const trimmed = text.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue

      // Get leading whitespace
      const leadingWhitespace = text.match(/^(\s*)/)?.[1] || ''

      // Check if this line is a component (starts with uppercase or known keywords)
      const isComponent = /^[A-Z]/.test(trimmed) || /^(Box|Text|Button|Input|Image|Icon)/.test(trimmed)

      if (isComponent) {
        // This is a potential parent - child should be indented 2 more spaces
        parentIndent = leadingWhitespace + '  '
        foundParent = true
        break
      }

      // If we find a property line (starts with lowercase or special char),
      // use its indentation as we're at the same level
      if (/^[a-z$@]/.test(trimmed) || /^(pad|bg|col|w |h |gap|rad|bor|margin)/.test(trimmed)) {
        parentIndent = leadingWhitespace
        foundParent = true
        break
      }
    }

    // If no parent found, use no indentation (root level)
    if (!foundParent) {
      parentIndent = ''
    }

    return parentIndent
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
