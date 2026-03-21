/**
 * Editor Module - CodeMirror Wrapper
 *
 * Handles CodeMirror integration with focus tracking and cursor sync.
 */

import { state, actions, events } from '../core'

// Re-export legacy icon trigger (for backward compatibility)
export {
  iconTriggerExtension,
  iconKeyboardExtension,
  iconPickerExtensions,
  showIconPicker,
  hideIconPicker,
  isIconPickerOpen,
  setComponentPrimitives,
  getComponentPrimitives,
  setupIconPickerClickOutside,
} from './icon-trigger'

// Re-export new unified trigger manager
export {
  EditorTriggerManager,
  getTriggerManager,
  setTriggerManager,
  createTriggerManager,
} from './trigger-manager'

// Re-export all triggers
export * from './triggers'

export interface EditorConfig {
  container: HTMLElement
}

export interface CursorPosition {
  line: number
  column: number
  offset: number
}

export type ChangeCallback = (content: string) => void
export type CursorCallback = (position: CursorPosition) => void
export type FocusCallback = (hasFocus: boolean) => void

export class EditorController {
  private editorView: any = null
  private container: HTMLElement | null = null
  private changeCallbacks: Set<ChangeCallback> = new Set()
  private cursorCallbacks: Set<CursorCallback> = new Set()
  private focusCallbacks: Set<FocusCallback> = new Set()
  private boundHandleFocusIn: () => void
  private boundHandleMouseDown: () => void

  constructor(config: EditorConfig) {
    this.container = config.container
    this.boundHandleFocusIn = this.handleFocusIn.bind(this)
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
  }

  initialize(editorView: any): void {
    this.editorView = editorView
    this.attachFocusListeners()
  }

  isInitialized(): boolean {
    return this.editorView !== null
  }

  /**
   * Attach focus event listeners to the editor container
   */
  private attachFocusListeners(): void {
    if (!this.container) return

    // mousedown is more reliable than focusin for detecting user interaction
    this.container.addEventListener('mousedown', this.boundHandleMouseDown)
    this.container.addEventListener('focusin', this.boundHandleFocusIn)
  }

  /**
   * Detach focus event listeners
   */
  private detachFocusListeners(): void {
    if (!this.container) return

    this.container.removeEventListener('mousedown', this.boundHandleMouseDown)
    this.container.removeEventListener('focusin', this.boundHandleFocusIn)
  }

  /**
   * Handle mousedown on editor - sets focus state
   */
  private handleMouseDown(): void {
    if (!state.get().editorHasFocus) {
      actions.setEditorFocus(true)
      this.notifyFocusChange(true)
    }
  }

  /**
   * Handle focusin on editor
   */
  private handleFocusIn(): void {
    if (!state.get().editorHasFocus) {
      actions.setEditorFocus(true)
      this.notifyFocusChange(true)
    }
  }

  /**
   * Notify focus change to callbacks
   */
  private notifyFocusChange(hasFocus: boolean): void {
    for (const cb of this.focusCallbacks) cb(hasFocus)
  }

  getContent(): string {
    return this.editorView?.state.doc.toString() || ''
  }

  setContent(content: string): void {
    if (!this.editorView) return
    const currentContent = this.getContent()
    if (currentContent === content) return
    this.editorView.dispatch({
      changes: { from: 0, to: currentContent.length, insert: content },
    })
  }

  getCursor(): CursorPosition {
    if (!this.editorView) return { line: 1, column: 1, offset: 0 }
    const offset = this.editorView.state.selection.main.head
    const line = this.editorView.state.doc.lineAt(offset)
    return { line: line.number, column: offset - line.from + 1, offset }
  }

  scrollToLine(lineNumber: number, center = true): void {
    if (!this.editorView) return
    try {
      const lineInfo = this.editorView.state.doc.line(lineNumber)
      const effect = this.editorView.constructor.scrollIntoView(lineInfo.from, { y: center ? 'center' : 'start' })
      this.editorView.dispatch({ effects: effect })
    } catch (e) {
      // Line number may be out of bounds after code changes
      console.warn('[EditorController] scrollToLine failed:', lineNumber, e)
    }
  }

  scrollToLineAndSelect(lineNumber: number): void {
    if (!this.editorView) return
    try {
      const lineInfo = this.editorView.state.doc.line(lineNumber)
      const effect = this.editorView.constructor.scrollIntoView(lineInfo.from, { y: 'center' })
      this.editorView.dispatch({ effects: effect, selection: { anchor: lineInfo.from } })
    } catch (e) {
      // Line number may be out of bounds after code changes
      console.warn('[EditorController] scrollToLineAndSelect failed:', lineNumber, e)
    }
  }

  onContentChange(callback: ChangeCallback): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  onCursorMove(callback: CursorCallback): () => void {
    this.cursorCallbacks.add(callback)
    return () => this.cursorCallbacks.delete(callback)
  }

  onFocusChange(callback: FocusCallback): () => void {
    this.focusCallbacks.add(callback)
    return () => this.focusCallbacks.delete(callback)
  }

  notifyContentChange(content: string): void {
    for (const cb of this.changeCallbacks) cb(content)
  }

  notifyCursorMove(position: CursorPosition): void {
    for (const cb of this.cursorCallbacks) cb(position)
    actions.setCursor(position.line, position.column)
  }

  dispose(): void {
    this.detachFocusListeners()
    this.changeCallbacks.clear()
    this.cursorCallbacks.clear()
    this.focusCallbacks.clear()
  }
}

export function createEditorController(config: EditorConfig): EditorController {
  return new EditorController(config)
}

let globalEditor: EditorController | null = null

/**
 * @deprecated Use getStudioContext().editor instead
 */
export function getEditorController(): EditorController | null {
  return globalEditor
}

/**
 * @deprecated Use setStudioContext() with context.editor instead
 */
export function setEditorController(controller: EditorController): void {
  globalEditor = controller
}
