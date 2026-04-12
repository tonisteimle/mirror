/**
 * CodeMirror Adapter
 *
 * Production adapter that implements EditorPort using CodeMirror 6.
 * Bridges the hexagonal architecture to the actual CodeMirror EditorView.
 */

import type { EditorView } from '@codemirror/view'
import type {
  EditorPort,
  ExtendedEditorPort,
  CursorPosition,
  Selection,
  LineInfo,
  CleanupFn,
} from '../ports'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('CodeMirrorAdapter')

// ============================================
// Types
// ============================================

export interface CodeMirrorAdapterConfig {
  /** The CodeMirror EditorView instance */
  view: EditorView

  /** Container element for focus detection (optional) */
  container?: HTMLElement
}

// ============================================
// CodeMirror Adapter Implementation
// ============================================

export function createCodeMirrorAdapter(config: CodeMirrorAdapterConfig): ExtendedEditorPort {
  const { view, container } = config

  // Event handlers
  const handlers = {
    contentChange: new Set<(content: string) => void>(),
    cursorMove: new Set<(position: CursorPosition) => void>(),
    selectionChange: new Set<(selection: Selection) => void>(),
    focus: new Set<() => void>(),
    blur: new Set<() => void>(),
  }

  // Focus tracking (uses container if provided, otherwise view's DOM)
  const focusTarget = container ?? view.dom

  function handleFocusIn(): void {
    handlers.focus.forEach((h) => h())
  }

  function handleFocusOut(e: FocusEvent): void {
    // Only trigger blur if focus left the editor entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !focusTarget.contains(relatedTarget)) {
      handlers.blur.forEach((h) => h())
    }
  }

  // Attach focus listeners
  focusTarget.addEventListener('focusin', handleFocusIn)
  focusTarget.addEventListener('focusout', handleFocusOut)

  // Helper: Convert offset to CursorPosition
  function offsetToCursor(offset: number): CursorPosition {
    try {
      const line = view.state.doc.lineAt(offset)
      return {
        line: line.number,
        column: offset - line.from + 1,
        offset,
      }
    } catch {
      return { line: 1, column: 1, offset: 0 }
    }
  }

  // Helper: Convert CursorPosition to offset
  function cursorToOffset(position: CursorPosition): number {
    try {
      const lineInfo = view.state.doc.line(position.line)
      return lineInfo.from + position.column - 1
    } catch {
      return 0
    }
  }

  return {
    // ----------------------------------------
    // Document
    // ----------------------------------------

    getContent(): string {
      return view.state.doc.toString()
    },

    setContent(content: string): void {
      const currentContent = view.state.doc.toString()
      if (currentContent === content) return

      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content },
      })
    },

    getLineCount(): number {
      return view.state.doc.lines
    },

    getLine(lineNumber: number): LineInfo | null {
      try {
        const line = view.state.doc.line(lineNumber)
        return {
          number: line.number,
          from: line.from,
          to: line.to,
          text: line.text,
        }
      } catch {
        return null
      }
    },

    // ----------------------------------------
    // Cursor
    // ----------------------------------------

    getCursor(): CursorPosition {
      const offset = view.state.selection.main.head
      return offsetToCursor(offset)
    },

    setCursor(position: CursorPosition): void {
      const offset = cursorToOffset(position)
      view.dispatch({
        selection: { anchor: offset },
      })
    },

    setCursorOffset(offset: number): void {
      view.dispatch({
        selection: { anchor: offset },
      })
    },

    // ----------------------------------------
    // Selection
    // ----------------------------------------

    getSelection(): Selection {
      const main = view.state.selection.main
      return { from: main.from, to: main.to }
    },

    setSelection(from: number, to: number): void {
      view.dispatch({
        selection: { anchor: from, head: to },
      })
    },

    // ----------------------------------------
    // Insert / Edit
    // ----------------------------------------

    insertAt(position: number, text: string): void {
      view.dispatch({
        changes: { from: position, to: position, insert: text },
      })
    },

    insertAtCursor(text: string): void {
      const cursor = view.state.selection.main.head
      view.dispatch({
        changes: { from: cursor, to: cursor, insert: text },
        selection: { anchor: cursor + text.length },
      })
    },

    replaceRange(from: number, to: number, text: string): void {
      view.dispatch({
        changes: { from, to, insert: text },
      })
    },

    // ----------------------------------------
    // Scroll
    // ----------------------------------------

    scrollToLine(lineNumber: number, center = true): void {
      try {
        const lineInfo = view.state.doc.line(lineNumber)
        const effect = (view.constructor as typeof EditorView).scrollIntoView(
          lineInfo.from,
          { y: center ? 'center' : 'start' }
        )
        view.dispatch({ effects: effect })
      } catch (e) {
        log.warn('scrollToLine failed:', lineNumber, e)
      }
    },

    // ----------------------------------------
    // Focus
    // ----------------------------------------

    hasFocus(): boolean {
      return view.hasFocus
    },

    focus(): void {
      view.focus()
    },

    blur(): void {
      view.contentDOM.blur()
    },

    // ----------------------------------------
    // Event Subscriptions
    // ----------------------------------------

    onContentChange(handler: (content: string) => void): CleanupFn {
      handlers.contentChange.add(handler)
      return () => handlers.contentChange.delete(handler)
    },

    onCursorMove(handler: (position: CursorPosition) => void): CleanupFn {
      handlers.cursorMove.add(handler)
      return () => handlers.cursorMove.delete(handler)
    },

    onSelectionChange(handler: (selection: Selection) => void): CleanupFn {
      handlers.selectionChange.add(handler)
      return () => handlers.selectionChange.delete(handler)
    },

    onFocus(handler: () => void): CleanupFn {
      handlers.focus.add(handler)
      return () => handlers.focus.delete(handler)
    },

    onBlur(handler: () => void): CleanupFn {
      handlers.blur.add(handler)
      return () => handlers.blur.delete(handler)
    },

    // ----------------------------------------
    // Extended EditorPort
    // ----------------------------------------

    getView(): EditorView {
      return view
    },

    dispatch(spec: unknown): void {
      view.dispatch(spec as Parameters<EditorView['dispatch']>[0])
    },
  }
}

// ============================================
// Update Listener Extension
// ============================================

/**
 * Creates a CodeMirror extension that forwards events to the adapter's handlers.
 * This should be added to the EditorView's extensions.
 *
 * @example
 * ```typescript
 * const adapter = createCodeMirrorAdapter({ view })
 * const extensions = [
 *   ...otherExtensions,
 *   createEditorUpdateExtension(adapter)
 * ]
 * ```
 */
export function createEditorUpdateExtension(
  adapter: ExtendedEditorPort,
  handlers: {
    onContentChange?: (content: string) => void
    onCursorMove?: (position: CursorPosition) => void
    onSelectionChange?: (selection: Selection) => void
  }
): import('@codemirror/state').Extension {
  // Import dynamically to avoid bundling issues
  const { EditorView } = require('@codemirror/view')

  return EditorView.updateListener.of((update: { docChanged: boolean; selectionSet: boolean }) => {
    if (update.docChanged) {
      const content = (adapter as ExtendedEditorPort).getView()
      handlers.onContentChange?.((content as EditorView).state.doc.toString())
    }

    if (update.selectionSet) {
      const cursor = adapter.getCursor()
      const selection = adapter.getSelection()
      handlers.onCursorMove?.(cursor)
      handlers.onSelectionChange?.(selection)
    }
  })
}

// ============================================
// State Port (Production)
// ============================================

import { state, actions, events } from '../../core'
import type { StatePort, StateCursor, SelectionOrigin } from '../ports'

/**
 * Production StatePort that uses the global state/events system.
 */
export function createStatePort(): StatePort {
  return {
    getEditorFocus(): boolean {
      return state.get().editorHasFocus
    },

    setEditorFocus(hasFocus: boolean): void {
      actions.setEditorFocus(hasFocus)
    },

    getCursor(): StateCursor {
      return state.get().cursor
    },

    setCursor(line: number, column: number): void {
      actions.setCursor(line, column)
    },

    emitSelectionChanged(nodeId: string | null, origin: SelectionOrigin): void {
      events.emit('selection:changed', { nodeId, origin })
    },

    emitCursorMoved(position: StateCursor): void {
      events.emit('editor:cursor-moved', position)
    },
  }
}

// ============================================
// Timer Port (Production)
// ============================================

import type { TimerPort } from '../ports'

/**
 * Production TimerPort that uses browser timing APIs.
 */
export function createTimerPort(): TimerPort {
  return {
    requestFrame(callback: () => void): number {
      return requestAnimationFrame(callback)
    },

    cancelFrame(id: number): void {
      cancelAnimationFrame(id)
    },

    setTimeout(callback: () => void, delay: number): number {
      return window.setTimeout(callback, delay)
    },

    clearTimeout(id: number): void {
      window.clearTimeout(id)
    },
  }
}

// ============================================
// Combined Ports Factory
// ============================================

import type { EditorPorts } from '../ports'

export interface ProductionEditorPortsConfig {
  view: EditorView
  container?: HTMLElement
}

/**
 * Creates all production ports for the EditorController.
 */
export function createProductionEditorPorts(config: ProductionEditorPortsConfig): EditorPorts {
  return {
    editor: createCodeMirrorAdapter(config),
    state: createStatePort(),
    timer: createTimerPort(),
  }
}
