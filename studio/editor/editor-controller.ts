/**
 * EditorController (Hexagonal Architecture)
 *
 * Testable editor controller that uses ports for all external dependencies.
 * This is the new implementation that replaces the direct CodeMirror coupling.
 *
 * Architecture:
 * ```
 * EditorController (pure orchestration logic)
 *        │
 *        ├── EditorPort (document, cursor, scroll)
 *        ├── StatePort (global state, events)
 *        └── TimerPort (requestAnimationFrame, setTimeout)
 * ```
 */

import type {
  EditorPorts,
  EditorPort,
  StatePort,
  TimerPort,
  CursorPosition,
  CleanupFn,
} from './ports'

// ============================================
// Configuration
// ============================================

export interface EditorControllerConfig {
  /** Enable cursor restoration after content changes */
  restoreCursorAfterChange?: boolean

  /** Callback when content changes */
  onContentChange?: (content: string) => void

  /** Callback when cursor moves */
  onCursorMove?: (position: CursorPosition) => void

  /** Callback when focus changes */
  onFocusChange?: (hasFocus: boolean) => void
}

// ============================================
// EditorController
// ============================================

export class EditorController {
  private cleanupFns: CleanupFn[] = []
  private contentVersion = 0
  private initialized = false

  // Callback sets (for legacy compatibility)
  private changeCallbacks = new Set<(content: string) => void>()
  private cursorCallbacks = new Set<(position: CursorPosition) => void>()
  private focusCallbacks = new Set<(hasFocus: boolean) => void>()

  constructor(
    private ports: EditorPorts,
    private config: EditorControllerConfig = {}
  ) {}

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the controller - bind all event handlers.
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    // Content change handler
    this.cleanupFns.push(
      this.ports.editor.onContentChange((content) => {
        this.handleContentChange(content)
      })
    )

    // Cursor move handler
    this.cleanupFns.push(
      this.ports.editor.onCursorMove((position) => {
        this.handleCursorMove(position)
      })
    )

    // Focus handlers
    this.cleanupFns.push(
      this.ports.editor.onFocus(() => {
        this.handleFocus()
      })
    )

    this.cleanupFns.push(
      this.ports.editor.onBlur(() => {
        this.handleBlur()
      })
    )
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []
    this.changeCallbacks.clear()
    this.cursorCallbacks.clear()
    this.focusCallbacks.clear()
    this.initialized = false
  }

  /**
   * Check if controller is initialized.
   */
  isInitialized(): boolean {
    return this.initialized
  }

  // ============================================
  // Event Handlers
  // ============================================

  private handleContentChange(content: string): void {
    // Notify config callback
    this.config.onContentChange?.(content)

    // Notify registered callbacks
    for (const cb of this.changeCallbacks) {
      cb(content)
    }
  }

  private handleCursorMove(position: CursorPosition): void {
    // Update state (state uses line, column without offset)
    this.ports.state.setCursor(position.line, position.column)

    // Emit event
    this.ports.state.emitCursorMoved({ line: position.line, column: position.column })

    // Notify config callback
    this.config.onCursorMove?.(position)

    // Notify registered callbacks
    for (const cb of this.cursorCallbacks) {
      cb(position)
    }
  }

  private handleFocus(): void {
    if (!this.ports.state.getEditorFocus()) {
      this.ports.state.setEditorFocus(true)
      this.config.onFocusChange?.(true)
      for (const cb of this.focusCallbacks) {
        cb(true)
      }
    }
  }

  private handleBlur(): void {
    if (this.ports.state.getEditorFocus()) {
      this.ports.state.setEditorFocus(false)
      this.config.onFocusChange?.(false)
      for (const cb of this.focusCallbacks) {
        cb(false)
      }
    }
  }

  // ============================================
  // Document Operations
  // ============================================

  /**
   * Get the full document content.
   */
  getContent(): string {
    return this.ports.editor.getContent()
  }

  /**
   * Set the document content.
   * Optionally restores cursor position after the change.
   */
  setContent(content: string): void {
    const currentContent = this.getContent()
    if (currentContent === content) return

    // Increment version to invalidate pending cursor restorations
    const capturedVersion = ++this.contentVersion

    // Capture current cursor
    const currentCursor = this.getCursor()

    // Set new content
    this.ports.editor.setContent(content)

    // Restore cursor position if enabled
    if (this.config.restoreCursorAfterChange !== false) {
      this.ports.timer.requestFrame(() => {
        // Abort if another setContent() was called
        if (this.contentVersion !== capturedVersion) return

        const lineCount = this.ports.editor.getLineCount()
        if (currentCursor.line <= lineCount) {
          const lineInfo = this.ports.editor.getLine(currentCursor.line)
          if (lineInfo) {
            // Clamp column to line length
            const maxCol = lineInfo.to - lineInfo.from
            const newCol = Math.min(currentCursor.column - 1, maxCol)
            const newOffset = lineInfo.from + newCol

            this.ports.editor.setCursorOffset(newOffset)
          }
        }
      })
    }
  }

  // ============================================
  // Cursor Operations
  // ============================================

  /**
   * Get the current cursor position.
   */
  getCursor(): CursorPosition {
    return this.ports.editor.getCursor()
  }

  /**
   * Set the cursor position.
   */
  setCursor(position: CursorPosition): void {
    this.ports.editor.setCursor(position)
  }

  /**
   * Insert text at the current cursor position.
   */
  insertAtCursor(text: string): void {
    this.ports.editor.insertAtCursor(text)
  }

  // ============================================
  // Scroll Operations
  // ============================================

  /**
   * Scroll to bring a line into view.
   */
  scrollToLine(lineNumber: number, center = true): void {
    this.ports.editor.scrollToLine(lineNumber, center)
  }

  /**
   * Scroll to a line and optionally select it.
   */
  scrollToLineAndSelect(lineNumber: number): void {
    const lineCount = this.ports.editor.getLineCount()
    if (lineNumber < 1 || lineNumber > lineCount) {
      console.warn('[EditorController] scrollToLineAndSelect: line out of bounds', {
        lineNumber,
        lineCount,
      })
      return
    }

    const currentCursor = this.getCursor()
    const lineInfo = this.ports.editor.getLine(lineNumber)

    if (!lineInfo) return

    // Scroll to line
    this.ports.editor.scrollToLine(lineNumber, true)

    // If cursor is not on target line, move it there
    if (currentCursor.line !== lineNumber) {
      this.ports.editor.setCursorOffset(lineInfo.from)
    }
  }

  // ============================================
  // Focus Operations
  // ============================================

  /**
   * Check if editor has focus.
   */
  hasFocus(): boolean {
    return this.ports.editor.hasFocus()
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this.ports.editor.focus()
  }

  /**
   * Blur the editor.
   */
  blur(): void {
    this.ports.editor.blur()
  }

  // ============================================
  // Callback Registration (Legacy Compatibility)
  // ============================================

  /**
   * Register a callback for content changes.
   */
  onContentChange(callback: (content: string) => void): CleanupFn {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  /**
   * Register a callback for cursor movements.
   */
  onCursorMove(callback: (position: CursorPosition) => void): CleanupFn {
    this.cursorCallbacks.add(callback)
    return () => this.cursorCallbacks.delete(callback)
  }

  /**
   * Register a callback for focus changes.
   */
  onFocusChange(callback: (hasFocus: boolean) => void): CleanupFn {
    this.focusCallbacks.add(callback)
    return () => this.focusCallbacks.delete(callback)
  }

  // ============================================
  // Legacy Compatibility Methods
  // ============================================

  /**
   * Notify content change (for external triggers).
   * @deprecated Use ports.editor.simulateContentChange() in tests
   */
  notifyContentChange(content: string): void {
    this.handleContentChange(content)
  }

  /**
   * Notify cursor move (for external triggers).
   * @deprecated Use ports.editor.simulateCursorMove() in tests
   */
  notifyCursorMove(position: CursorPosition): void {
    this.handleCursorMove(position)
  }

  // ============================================
  // Test APIs
  // ============================================

  /**
   * TEST API: Get the ports (for inspection in tests).
   */
  getPorts(): EditorPorts {
    return this.ports
  }

  /**
   * TEST API: Get the content version counter.
   */
  getContentVersion(): number {
    return this.contentVersion
  }
}

// ============================================
// Factory Function
// ============================================

export function createEditorControllerWithPorts(
  ports: EditorPorts,
  config?: EditorControllerConfig
): EditorController {
  const controller = new EditorController(ports, config)
  controller.init()
  return controller
}
