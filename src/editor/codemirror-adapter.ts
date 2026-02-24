/**
 * CodeMirror Adapter
 *
 * Implements the IEditor interface for CodeMirror 6.
 * This adapter allows the application to use CodeMirror through
 * a generic interface, enabling potential future editor switches.
 */
import { EditorState, type Extension, type TransactionSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
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
 * Build a CodeMirror transaction spec from dispatch options.
 * Shared helper to avoid duplication between CodeMirrorEditor and createCodeMirrorAdapter.
 */
function buildTransaction(options: DispatchOptions): TransactionSpec {
  const transaction: TransactionSpec = {}

  if (options.changes) {
    transaction.changes = {
      from: options.changes.from,
      to: options.changes.to,
      insert: options.changes.insert,
    }
  }

  if (options.selection) {
    transaction.selection = {
      anchor: options.selection.anchor,
      head: options.selection.head,
    }
  }

  if (options.scrollIntoView) {
    transaction.scrollIntoView = true
  }

  return transaction
}

/**
 * CodeMirror 6 implementation of IEditor.
 */
export class CodeMirrorEditor implements IEditor {
  private view: EditorView

  constructor(view: EditorView) {
    this.view = view
  }

  /**
   * Get the underlying CodeMirror EditorView.
   * Use this for CodeMirror-specific operations that aren't covered by IEditor.
   */
  getView(): EditorView {
    return this.view
  }

  // === Document Access ===

  getContent(): string {
    return this.view.state.doc.toString()
  }

  getLineCount(): number {
    return this.view.state.doc.lines
  }

  getLine(lineNumber: number): LineInfo | null {
    if (lineNumber < 1 || lineNumber > this.view.state.doc.lines) {
      return null
    }
    const line = this.view.state.doc.line(lineNumber)
    return {
      number: line.number,
      from: line.from,
      to: line.to,
      text: line.text,
    }
  }

  getLineAt(pos: number): LineInfo {
    const line = this.view.state.doc.lineAt(pos)
    return {
      number: line.number,
      from: line.from,
      to: line.to,
      text: line.text,
    }
  }

  getSlice(from: number, to: number): string {
    return this.view.state.doc.sliceString(from, to)
  }

  // === Selection ===

  getCursorPosition(): number {
    return this.view.state.selection.main.head
  }

  getSelection(): EditorRange {
    const { from, to } = this.view.state.selection.main
    return { from, to }
  }

  setCursor(pos: number): void {
    this.view.dispatch({
      selection: { anchor: pos },
    })
  }

  setSelection(from: number, to: number): void {
    this.view.dispatch({
      selection: { anchor: from, head: to },
    })
  }

  // === Coordinates ===

  getCoordsAtPos(pos: number): ScreenCoords | null {
    const coords = this.view.coordsAtPos(pos)
    if (!coords) return null
    return {
      left: coords.left,
      top: coords.top,
      right: coords.right,
      bottom: coords.bottom,
    }
  }

  // === Document Modification ===

  dispatch(options: DispatchOptions): void {
    this.view.dispatch(buildTransaction(options))
  }

  insert(text: string): void {
    const pos = this.getCursorPosition()
    this.dispatch({
      changes: { from: pos, to: pos, insert: text },
    })
  }

  replace(from: number, to: number, text: string): void {
    this.dispatch({
      changes: { from, to, insert: text },
    })
  }

  // === Focus ===

  focus(): void {
    this.view.focus()
  }

  hasFocus(): boolean {
    return this.view.hasFocus
  }

  // === Lifecycle ===

  destroy(): void {
    this.view.destroy()
  }
}

/**
 * Factory for creating CodeMirror editor instances.
 */
export class CodeMirrorFactory implements IEditorFactory {
  private baseExtensions: unknown[]

  constructor(baseExtensions: unknown[] = []) {
    this.baseExtensions = baseExtensions
  }

  create(options: EditorOptions): IEditor {
    const extensions: Extension[] = [...(this.baseExtensions as Extension[])]

    // Add onChange listener if provided
    if (options.onChange) {
      const onChangeCallback = options.onChange
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeCallback(update.state.doc.toString())
          }
        })
      )
    }

    // Add any additional extensions
    if (options.extensions) {
      extensions.push(...(options.extensions as Extension[]))
    }

    const state = EditorState.create({
      doc: options.doc ?? '',
      extensions,
    })

    const view = new EditorView({
      state,
      parent: options.parent,
    })

    return new CodeMirrorEditor(view)
  }
}

/**
 * Create a CodeMirror adapter from an existing EditorView.
 * Useful for wrapping existing editor instances.
 */
export function wrapCodeMirror(view: EditorView): IEditor {
  return new CodeMirrorEditor(view)
}

/**
 * Type guard to check if an IEditor is a CodeMirrorEditor.
 */
export function isCodeMirrorEditor(editor: IEditor): editor is CodeMirrorEditor {
  return editor instanceof CodeMirrorEditor
}

/**
 * Get the underlying EditorView from an IEditor, if it's a CodeMirror editor.
 * Returns null for other editor implementations.
 */
export function getCodeMirrorView(editor: IEditor): EditorView | null {
  if (isCodeMirrorEditor(editor)) {
    return editor.getView()
  }
  return null
}

/**
 * Create an EditorAdapter directly from a CodeMirror EditorView.
 * This is useful during migration when hooks still receive EditorView refs.
 */
export function createCodeMirrorAdapter(view: EditorView): import('./types').EditorAdapter {
  return {
    getCursorPosition: () => view.state.selection.main.head,
    getSelection: () => {
      const { from, to } = view.state.selection.main
      return { from, to }
    },
    getCoordsAtPos: (pos) => {
      const coords = view.coordsAtPos(pos)
      if (!coords) return null
      return {
        left: coords.left,
        top: coords.top,
        right: coords.right,
        bottom: coords.bottom,
      }
    },
    getSlice: (from, to) => view.state.doc.sliceString(from, to),
    getLineAt: (pos) => {
      const line = view.state.doc.lineAt(pos)
      return {
        number: line.number,
        from: line.from,
        to: line.to,
        text: line.text,
      }
    },
    dispatch: (options) => view.dispatch(buildTransaction(options)),
    focus: () => view.focus(),
  }
}
