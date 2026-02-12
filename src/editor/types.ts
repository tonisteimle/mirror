/**
 * Editor Interface Abstraction
 *
 * Defines a common interface for code editors, allowing the application
 * to be decoupled from CodeMirror. This enables:
 * - Easier testing with mock implementations
 * - Potential future switch to other editors (Monaco, Ace, etc.)
 * - Better separation of concerns
 */

/**
 * Represents a position in a document.
 */
export interface EditorPosition {
  /** Line number (1-indexed) */
  line: number
  /** Character offset within the line (0-indexed) */
  ch: number
}

/**
 * Represents a range in a document.
 */
export interface EditorRange {
  /** Start position (character offset from document start) */
  from: number
  /** End position (character offset from document start) */
  to: number
}

/**
 * Information about a line in the document.
 */
export interface LineInfo {
  /** Line number (1-indexed) */
  number: number
  /** Start position of the line (character offset) */
  from: number
  /** End position of the line (character offset) */
  to: number
  /** Text content of the line */
  text: string
}

/**
 * Screen coordinates for positioning UI elements.
 */
export interface ScreenCoords {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Options for dispatching changes to the editor.
 */
export interface DispatchOptions {
  /** Changes to apply to the document */
  changes?: {
    from: number
    to?: number
    insert?: string
  }
  /** New selection after the change */
  selection?: {
    anchor: number
    head?: number
  }
  /** Whether to scroll the change into view */
  scrollIntoView?: boolean
}

/**
 * Abstract interface for code editors.
 * Implementations should wrap specific editor libraries (CodeMirror, Monaco, etc.)
 */
export interface IEditor {
  // === Document Access ===

  /**
   * Get the full document content as a string.
   */
  getContent(): string

  /**
   * Get the number of lines in the document.
   */
  getLineCount(): number

  /**
   * Get information about a specific line.
   * @param lineNumber 1-indexed line number
   */
  getLine(lineNumber: number): LineInfo | null

  /**
   * Get the line at a specific character position.
   * @param pos Character offset from document start
   */
  getLineAt(pos: number): LineInfo

  /**
   * Get a slice of the document content.
   * @param from Start position (character offset)
   * @param to End position (character offset)
   */
  getSlice(from: number, to: number): string

  // === Selection ===

  /**
   * Get the current cursor position (head of main selection).
   */
  getCursorPosition(): number

  /**
   * Get the current selection range.
   */
  getSelection(): EditorRange

  /**
   * Set the cursor position.
   * @param pos Character offset
   */
  setCursor(pos: number): void

  /**
   * Set the selection range.
   * @param from Start position
   * @param to End position
   */
  setSelection(from: number, to: number): void

  // === Coordinates ===

  /**
   * Get screen coordinates for a character position.
   * Returns null if the position is not visible.
   * @param pos Character offset
   */
  getCoordsAtPos(pos: number): ScreenCoords | null

  // === Document Modification ===

  /**
   * Dispatch changes to the editor.
   * This is the primary method for modifying the document.
   */
  dispatch(options: DispatchOptions): void

  /**
   * Insert text at the current cursor position.
   * @param text Text to insert
   */
  insert(text: string): void

  /**
   * Replace a range of text.
   * @param from Start position
   * @param to End position
   * @param text Replacement text
   */
  replace(from: number, to: number, text: string): void

  // === Focus ===

  /**
   * Focus the editor.
   */
  focus(): void

  /**
   * Check if the editor has focus.
   */
  hasFocus(): boolean

  // === Lifecycle ===

  /**
   * Destroy the editor and clean up resources.
   */
  destroy(): void
}

/**
 * Options for creating an editor.
 */
export interface EditorOptions {
  /** Parent DOM element */
  parent: HTMLElement
  /** Initial document content */
  doc?: string
  /** Callback when document changes */
  onChange?: (content: string) => void
  /** Additional extensions (CodeMirror-specific) */
  extensions?: unknown[]
}

/**
 * Factory interface for creating editor instances.
 */
export interface IEditorFactory {
  /**
   * Create a new editor instance.
   */
  create(options: EditorOptions): IEditor
}

/**
 * Type for editor references that can be either IEditor or CodeMirror EditorView.
 * This allows gradual migration from EditorView to IEditor.
 */
export type EditorRef = React.RefObject<IEditor | null>

/**
 * Adapter interface that works with both IEditor and CodeMirror EditorView.
 * Use this in hooks during migration period.
 */
export interface EditorAdapter {
  getCursorPosition(): number
  getSelection(): EditorRange
  getCoordsAtPos(pos: number): ScreenCoords | null
  getSlice(from: number, to: number): string
  getLineAt(pos: number): LineInfo
  dispatch(options: DispatchOptions): void
  focus(): void
}

/**
 * Create an EditorAdapter from an IEditor instance.
 */
export function createEditorAdapter(editor: IEditor): EditorAdapter {
  return {
    getCursorPosition: () => editor.getCursorPosition(),
    getSelection: () => editor.getSelection(),
    getCoordsAtPos: (pos) => editor.getCoordsAtPos(pos),
    getSlice: (from, to) => editor.getSlice(from, to),
    getLineAt: (pos) => editor.getLineAt(pos),
    dispatch: (options) => editor.dispatch(options),
    focus: () => editor.focus(),
  }
}
