/**
 * Mock Editor Implementation
 *
 * A mock implementation of IEditor for testing purposes.
 * Simulates editor behavior without requiring a real DOM or CodeMirror.
 */
import type {
  IEditor,
  IEditorFactory,
  EditorOptions,
  EditorRange,
  LineInfo,
  ScreenCoords,
  DispatchOptions,
} from './types'

/**
 * Mock implementation of IEditor for testing.
 */
export class MockEditor implements IEditor {
  private content: string
  private cursorPos: number
  private selectionFrom: number
  private selectionTo: number
  private focused: boolean
  private destroyed: boolean
  private onChange?: (content: string) => void

  constructor(options: { doc?: string; onChange?: (content: string) => void } = {}) {
    this.content = options.doc ?? ''
    this.cursorPos = 0
    this.selectionFrom = 0
    this.selectionTo = 0
    this.focused = false
    this.destroyed = false
    this.onChange = options.onChange
  }

  // === Document Access ===

  getContent(): string {
    this.checkDestroyed()
    return this.content
  }

  getLineCount(): number {
    this.checkDestroyed()
    return this.content.split('\n').length
  }

  getLine(lineNumber: number): LineInfo | null {
    this.checkDestroyed()
    const lines = this.content.split('\n')
    if (lineNumber < 1 || lineNumber > lines.length) {
      return null
    }

    let from = 0
    for (let i = 0; i < lineNumber - 1; i++) {
      from += lines[i].length + 1 // +1 for newline
    }

    const text = lines[lineNumber - 1]
    return {
      number: lineNumber,
      from,
      to: from + text.length,
      text,
    }
  }

  getLineAt(pos: number): LineInfo {
    this.checkDestroyed()
    const lines = this.content.split('\n')
    let currentPos = 0
    let lineNumber = 1

    for (const lineText of lines) {
      const lineEnd = currentPos + lineText.length
      if (pos <= lineEnd || lineNumber === lines.length) {
        return {
          number: lineNumber,
          from: currentPos,
          to: lineEnd,
          text: lineText,
        }
      }
      currentPos = lineEnd + 1 // +1 for newline
      lineNumber++
    }

    // Fallback (should not reach here)
    return {
      number: 1,
      from: 0,
      to: this.content.length,
      text: this.content,
    }
  }

  getSlice(from: number, to: number): string {
    this.checkDestroyed()
    return this.content.slice(from, to)
  }

  // === Selection ===

  getCursorPosition(): number {
    this.checkDestroyed()
    return this.cursorPos
  }

  getSelection(): EditorRange {
    this.checkDestroyed()
    return { from: this.selectionFrom, to: this.selectionTo }
  }

  setCursor(pos: number): void {
    this.checkDestroyed()
    this.cursorPos = pos
    this.selectionFrom = pos
    this.selectionTo = pos
  }

  setSelection(from: number, to: number): void {
    this.checkDestroyed()
    this.selectionFrom = from
    this.selectionTo = to
    this.cursorPos = to
  }

  // === Coordinates ===

  getCoordsAtPos(_pos: number): ScreenCoords | null {
    this.checkDestroyed()
    // Mock implementation returns fixed coordinates
    return {
      left: 100,
      top: 100,
      right: 110,
      bottom: 120,
    }
  }

  // === Document Modification ===

  dispatch(options: DispatchOptions): void {
    this.checkDestroyed()

    if (options.changes) {
      const { from, to = from, insert = '' } = options.changes
      this.content = this.content.slice(0, from) + insert + this.content.slice(to)

      // Adjust cursor position
      const delta = insert.length - (to - from)
      if (this.cursorPos > from) {
        this.cursorPos = Math.max(from, this.cursorPos + delta)
      }

      this.onChange?.(this.content)
    }

    if (options.selection) {
      this.selectionFrom = options.selection.anchor
      this.selectionTo = options.selection.head ?? options.selection.anchor
      this.cursorPos = this.selectionTo
    }
  }

  insert(text: string): void {
    this.checkDestroyed()
    const pos = this.cursorPos
    this.dispatch({
      changes: { from: pos, to: pos, insert: text },
      selection: { anchor: pos + text.length }, // Move cursor after inserted text
    })
  }

  replace(from: number, to: number, text: string): void {
    this.checkDestroyed()
    this.dispatch({
      changes: { from, to, insert: text },
    })
  }

  // === Focus ===

  focus(): void {
    this.checkDestroyed()
    this.focused = true
  }

  hasFocus(): boolean {
    this.checkDestroyed()
    return this.focused
  }

  blur(): void {
    this.focused = false
  }

  // === Lifecycle ===

  destroy(): void {
    this.destroyed = true
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  private checkDestroyed(): void {
    if (this.destroyed) {
      throw new Error('Editor has been destroyed')
    }
  }

  // === Test Helpers ===

  /**
   * Set content directly (bypasses dispatch).
   * Useful for test setup.
   */
  setContent(content: string): void {
    this.content = content
  }

  /**
   * Get the onChange callback.
   */
  getOnChange(): ((content: string) => void) | undefined {
    return this.onChange
  }
}

/**
 * Factory for creating mock editor instances.
 */
export class MockEditorFactory implements IEditorFactory {
  private createdEditors: MockEditor[] = []

  create(options: EditorOptions): IEditor {
    const editor = new MockEditor({
      doc: options.doc,
      onChange: options.onChange,
    })
    this.createdEditors.push(editor)
    return editor
  }

  /**
   * Get all editors created by this factory.
   * Useful for test assertions.
   */
  getCreatedEditors(): MockEditor[] {
    return this.createdEditors
  }

  /**
   * Get the last created editor.
   */
  getLastEditor(): MockEditor | undefined {
    return this.createdEditors[this.createdEditors.length - 1]
  }

  /**
   * Clear the list of created editors.
   */
  clear(): void {
    this.createdEditors = []
  }
}

/**
 * Create a mock editor for testing.
 */
export function createMockEditor(options?: { doc?: string; onChange?: (content: string) => void }): MockEditor {
  return new MockEditor(options)
}
