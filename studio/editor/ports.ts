/**
 * Editor Ports
 *
 * Port interfaces for the EditorController hexagonal architecture.
 * These interfaces abstract all external dependencies, making the
 * controller fully testable without DOM or CodeMirror.
 *
 * Architecture:
 * ```
 * EditorController (pure logic)
 *        │
 *        ├── EditorPort (document, cursor, scroll)
 *        ├── StatePort (global state, events)
 *        └── TimerPort (requestAnimationFrame, setTimeout)
 * ```
 */

// ============================================
// Types
// ============================================

export interface CursorPosition {
  line: number
  column: number
  offset: number
}

export interface Selection {
  from: number
  to: number
}

export interface LineInfo {
  number: number
  from: number
  to: number
  text: string
}

export type CleanupFn = () => void

// ============================================
// Editor Port
// ============================================

/**
 * EditorPort abstracts the text editor (CodeMirror).
 * Handles document content, cursor, selection, and scroll.
 */
export interface EditorPort {
  // ----------------------------------------
  // Document
  // ----------------------------------------

  /** Get the full document content */
  getContent(): string

  /** Replace the entire document content */
  setContent(content: string): void

  /** Get the number of lines in the document */
  getLineCount(): number

  /** Get information about a specific line (1-indexed) */
  getLine(lineNumber: number): LineInfo | null

  // ----------------------------------------
  // Cursor
  // ----------------------------------------

  /** Get the current cursor position */
  getCursor(): CursorPosition

  /** Set the cursor position */
  setCursor(position: CursorPosition): void

  /** Set cursor by offset only */
  setCursorOffset(offset: number): void

  // ----------------------------------------
  // Selection
  // ----------------------------------------

  /** Get the current selection range */
  getSelection(): Selection

  /** Set the selection range */
  setSelection(from: number, to: number): void

  // ----------------------------------------
  // Insert / Edit
  // ----------------------------------------

  /** Insert text at a specific position */
  insertAt(position: number, text: string): void

  /** Insert text at the current cursor position */
  insertAtCursor(text: string): void

  /** Replace text in a range */
  replaceRange(from: number, to: number, text: string): void

  // ----------------------------------------
  // Scroll
  // ----------------------------------------

  /** Scroll to bring a line into view */
  scrollToLine(lineNumber: number, center?: boolean): void

  // ----------------------------------------
  // Focus
  // ----------------------------------------

  /** Check if the editor has focus */
  hasFocus(): boolean

  /** Focus the editor */
  focus(): void

  /** Blur the editor */
  blur(): void

  // ----------------------------------------
  // Event Subscriptions
  // ----------------------------------------

  /** Subscribe to content changes */
  onContentChange(handler: (content: string) => void): CleanupFn

  /** Subscribe to cursor movements */
  onCursorMove(handler: (position: CursorPosition) => void): CleanupFn

  /** Subscribe to selection changes */
  onSelectionChange(handler: (selection: Selection) => void): CleanupFn

  /** Subscribe to focus events */
  onFocus(handler: () => void): CleanupFn

  /** Subscribe to blur events */
  onBlur(handler: () => void): CleanupFn
}

// ============================================
// State Port
// ============================================

/**
 * Cursor position as stored in global state (without offset).
 */
export interface StateCursor {
  line: number
  column: number
}

/**
 * Valid origins for selection events.
 */
export type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' | 'drag-drop'

/**
 * StatePort abstracts the global application state.
 * Handles editor focus state and event emission.
 */
export interface StatePort {
  // ----------------------------------------
  // Focus State
  // ----------------------------------------

  /** Check if editor has focus according to global state */
  getEditorFocus(): boolean

  /** Update editor focus in global state */
  setEditorFocus(hasFocus: boolean): void

  // ----------------------------------------
  // Cursor State
  // ----------------------------------------

  /** Get the current cursor position from state */
  getCursor(): StateCursor

  /** Update cursor position in state */
  setCursor(line: number, column: number): void

  // ----------------------------------------
  // Events
  // ----------------------------------------

  /** Emit a selection changed event */
  emitSelectionChanged(nodeId: string | null, origin: SelectionOrigin): void

  /** Emit a cursor moved event */
  emitCursorMoved(position: StateCursor): void
}

// ============================================
// Timer Port
// ============================================

/**
 * TimerPort abstracts browser timing APIs.
 * Allows tests to control timing behavior.
 */
export interface TimerPort {
  /** Schedule a callback for the next animation frame */
  requestFrame(callback: () => void): number

  /** Cancel a scheduled animation frame */
  cancelFrame(id: number): void

  /** Schedule a callback after a delay */
  setTimeout(callback: () => void, delay: number): number

  /** Cancel a scheduled timeout */
  clearTimeout(id: number): void
}

// ============================================
// Combined Ports
// ============================================

/**
 * All ports required by EditorController.
 */
export interface EditorPorts {
  editor: EditorPort
  state: StatePort
  timer: TimerPort
}

// ============================================
// Extended Editor Port (for DOM adapter)
// ============================================

/**
 * Extended EditorPort with methods for registering DOM event handlers.
 * Used by the CodeMirror adapter for production.
 */
export interface ExtendedEditorPort extends EditorPort {
  /** Get the underlying editor view (for extensions that need direct access) */
  getView(): unknown

  /** Dispatch a transaction to the editor */
  dispatch(spec: unknown): void
}
