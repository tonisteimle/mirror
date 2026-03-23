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
   * Insert component code at position
   */
  insertComponentCode(code: string, pos: EditorDropPosition): void {
    // Get current line to determine indentation
    const line = this.editor.state.doc.line(pos.line)
    const lineText = line.text
    const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || ''

    // Indent the code to match context
    const indentedCode = code
      .split('\n')
      .map((codeLine, index) => (index === 0 ? codeLine : leadingWhitespace + codeLine))
      .join('\n')

    // Insert at end of current line with newline
    const insertPos = line.to
    const insertText = '\n' + leadingWhitespace + indentedCode

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
