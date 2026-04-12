/**
 * Editor Module - CodeMirror Wrapper
 *
 * Handles CodeMirror integration with focus tracking and cursor sync.
 *
 * This module provides two architectures:
 * 1. Legacy: Direct CodeMirror integration (EditorController class below)
 * 2. Hexagonal: Port-based architecture for testability (editor-controller.ts)
 */

import { EditorView } from '@codemirror/view'
import { state, actions, events } from '../core'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('EditorController')

// ============================================
// New Hexagonal Architecture (v2)
// ============================================

// Ports (interfaces)
// Note: SelectionOrigin is already exported from core, so we alias it here
export type {
  EditorPort,
  ExtendedEditorPort,
  StatePort,
  TimerPort,
  EditorPorts,
  CursorPosition as EditorCursorPosition,
  StateCursor,
  SelectionOrigin as EditorSelectionOrigin,
  Selection as EditorSelection,
  LineInfo,
  CleanupFn as EditorCleanupFn,
} from './ports'

// New EditorController with ports
export {
  EditorController as EditorControllerV2,
  createEditorControllerWithPorts,
  type EditorControllerConfig as EditorControllerV2Config,
} from './editor-controller'

// Adapters
export {
  // Mock adapters for testing
  createMockEditorPort,
  createMockStatePort,
  createMockTimerPort,
  createMockEditorPorts,
  type MockEditorPort,
  type MockStatePort,
  type MockTimerPort,
  type MockEditorPorts,
  // Production adapters
  createCodeMirrorAdapter,
  createEditorUpdateExtension,
  createStatePort,
  createTimerPort,
  createProductionEditorPorts,
  type CodeMirrorAdapterConfig,
  type ProductionEditorPortsConfig,
} from './adapters'

// ============================================
// Legacy Exports (v1)
// ============================================

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

// Re-export inline prompt
export {
  inlinePromptExtension,
  inlinePromptStyles,
  type InlinePromptConfig,
  type InlinePromptState,
  type PromptStatus
} from './inline-prompt'

// Re-export editor drop handler
export {
  EditorDropHandler,
  createEditorDropHandler,
  createComponentDropExtension,
  insertComponentCode,
  insertComponentWithDefinition,
  type EditorDropHandlerConfig,
  type EditorDropPosition,
  type ComponentDropConfig,
} from './editor-drop-handler'

// Re-export component templates
export {
  COMPONENT_DEFINITIONS,
  getComponentDefinition,
  hasComponentDefinition,
  findDefinitionInsertPosition,
} from '../panels/components/component-templates'

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
  private editorView: EditorView | null = null
  private container: HTMLElement | null = null
  private changeCallbacks: Set<ChangeCallback> = new Set()
  private cursorCallbacks: Set<CursorCallback> = new Set()
  private focusCallbacks: Set<FocusCallback> = new Set()
  private boundHandleFocusIn: () => void
  private boundHandleMouseDown: () => void
  /** Version counter to invalidate stale cursor restoration in setContent() */
  private contentVersion = 0

  constructor(config: EditorConfig) {
    this.container = config.container
    this.boundHandleFocusIn = this.handleFocusIn.bind(this)
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
  }

  initialize(editorView: EditorView): void {
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

  /**
   * Get the underlying CodeMirror EditorView
   */
  getEditorView(): EditorView | null {
    return this.editorView
  }

  /**
   * Insert text at current cursor position
   */
  insertAtCursor(text: string): void {
    if (!this.editorView) return
    const cursor = this.editorView.state.selection.main.head
    this.editorView.dispatch({
      changes: { from: cursor, to: cursor, insert: text },
      selection: { anchor: cursor + text.length },
    })
  }

  setContent(content: string): void {
    if (!this.editorView) return
    const currentContent = this.getContent()
    if (currentContent === content) return

    // Increment version to invalidate any pending cursor restoration
    const capturedVersion = ++this.contentVersion

    // Preserve cursor position as much as possible
    const currentCursor = this.getCursor()

    this.editorView.dispatch({
      changes: { from: 0, to: currentContent.length, insert: content },
    })

    // Try to restore cursor to same line/column if valid
    // Use requestAnimationFrame to ensure the dispatch is complete
    requestAnimationFrame(() => {
      // Abort if another setContent() was called (version changed)
      // or if editor was disposed
      if (!this.editorView || this.contentVersion !== capturedVersion) return

      const newDoc = this.editorView.state.doc
      const maxLine = newDoc.lines

      if (currentCursor.line <= maxLine) {
        try {
          const lineInfo = newDoc.line(currentCursor.line)
          // Clamp column to line length (0-based for offset calculation)
          const maxCol = lineInfo.to - lineInfo.from
          const newCol = Math.min(currentCursor.column - 1, maxCol)
          const newOffset = lineInfo.from + newCol

          this.editorView.dispatch({
            selection: { anchor: newOffset },
          })
        } catch {
          // Line doesn't exist, cursor will be at start
        }
      }
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
      const effect = EditorView.scrollIntoView(lineInfo.from, { y: center ? 'center' : 'start' })
      this.editorView.dispatch({ effects: effect })
    } catch (e) {
      // Line number may be out of bounds after code changes
      log.warn('scrollToLine failed:', lineNumber, e)
    }
  }

  scrollToLineAndSelect(lineNumber: number): void {
    if (!this.editorView) return

    // Bounds check before accessing line
    const maxLine = this.editorView.state.doc.lines
    if (lineNumber < 1 || lineNumber > maxLine) {
      log.warn('scrollToLineAndSelect: line out of bounds', { lineNumber, maxLine })
      return
    }

    try {
      const currentCursor = this.getCursor()
      const lineInfo = this.editorView.state.doc.line(lineNumber)
      const effect = EditorView.scrollIntoView(lineInfo.from, { y: 'center' })

      // If cursor is already on the target line, only scroll - don't move cursor
      // This prevents cursor jumping to line start when user is at end of line
      if (currentCursor.line === lineNumber) {
        this.editorView.dispatch({ effects: effect })
      } else {
        this.editorView.dispatch({ effects: effect, selection: { anchor: lineInfo.from } })
      }
    } catch (e) {
      // Line number may be out of bounds after code changes
      log.warn('scrollToLineAndSelect failed:', lineNumber, e)
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
    // Note: setCursor is called by the callback in bootstrap.ts
    // Don't call it here to avoid duplicate state updates
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
