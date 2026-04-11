/**
 * Production Autocomplete Adapters
 *
 * Real implementations that wrap CodeMirror and other dependencies.
 * These are used in production to connect autocomplete to the actual editor.
 */

import type { EditorView } from '@codemirror/view'
import type {
  EditorContextPort,
  SourceMapContextPort,
  CompletionUIPort,
  AutocompletePorts,
  CursorPosition,
  LineInfo,
  CleanupFn,
} from '../ports'
import type { Completion, AutocompleteResult } from '../index'
import { findParentZagComponent, extractElementNames, extractPageNames } from '../index'

// ============================================
// Configuration Types
// ============================================

export interface CreateEditorContextPortConfig {
  /** CodeMirror EditorView instance */
  view: EditorView
}

export interface CreateSourceMapContextPortConfig {
  /** Function to get current source */
  getSource: () => string
  /** Optional: provide custom token extraction */
  getTokens?: () => string[]
}

export interface CreateCompletionUIPortConfig {
  /** CodeMirror EditorView instance */
  view: EditorView
  /** Optional: callback when completions are shown */
  onShow?: (result: AutocompleteResult) => void
  /** Optional: callback when completions are hidden */
  onHide?: () => void
}

export interface CreateAutocompletePortsConfig {
  /** CodeMirror EditorView instance */
  view: EditorView
  /** Optional: custom token extraction */
  getTokens?: () => string[]
  /** Optional: callbacks */
  onShow?: (result: AutocompleteResult) => void
  onHide?: () => void
}

// ============================================
// EditorContextPort Implementation
// ============================================

export function createEditorContextPort(
  config: CreateEditorContextPortConfig
): EditorContextPort {
  const { view } = config

  function getSource(): string {
    return view.state.doc.toString()
  }

  function getCursor(): CursorPosition {
    const pos = view.state.selection.main.head
    const line = view.state.doc.lineAt(pos)
    return {
      line: line.number,
      column: pos - line.from,
      offset: pos,
    }
  }

  function getLine(lineNumber: number): LineInfo | null {
    if (lineNumber < 1 || lineNumber > view.state.doc.lines) {
      return null
    }
    const line = view.state.doc.line(lineNumber)
    return {
      number: line.number,
      text: line.text,
      from: line.from,
      to: line.to,
    }
  }

  function getCurrentLine(): LineInfo | null {
    const cursor = getCursor()
    return getLine(cursor.line)
  }

  function getTextBeforeCursor(): string {
    const cursor = getCursor()
    const line = getCurrentLine()
    if (!line) return ''
    return line.text.slice(0, cursor.column)
  }

  function getWordAtCursor(): { word: string; from: number; to: number } | null {
    const line = getCurrentLine()
    const cursor = getCursor()
    if (!line) return null

    const text = line.text
    const col = cursor.column

    // Find word boundaries
    let start = col
    let end = col

    // Find start of word
    while (start > 0 && /[\w-]/.test(text[start - 1])) {
      start--
    }

    // Find end of word
    while (end < text.length && /[\w-]/.test(text[end])) {
      end++
    }

    if (start === end) {
      return null
    }

    return {
      word: text.slice(start, end),
      from: line.from + start,
      to: line.from + end,
    }
  }

  return {
    getSource,
    getCursor,
    getLine,
    getCurrentLine,
    getTextBeforeCursor,
    getWordAtCursor,
  }
}

// ============================================
// SourceMapContextPort Implementation
// ============================================

export function createSourceMapContextPort(
  config: CreateSourceMapContextPortConfig
): SourceMapContextPort {
  const { getSource, getTokens } = config

  function getParentZagComponent(lineNumber: number): string | null {
    const source = getSource()
    // Line number is 1-indexed, findParentZagComponent expects 0-indexed
    return findParentZagComponent(source, lineNumber - 1)
  }

  function getAvailableTokens(): string[] {
    if (getTokens) {
      return getTokens()
    }
    // Default: extract from source (token definitions like "name.bg: #color")
    const source = getSource()
    const tokens: string[] = []
    const tokenPattern = /^([a-zA-Z][\w-]*)\.(bg|col|pad|mar|gap|rad|boc|fs|ic|is):/gm
    let match
    while ((match = tokenPattern.exec(source)) !== null) {
      const tokenName = match[1]
      if (!tokens.includes(tokenName)) {
        tokens.push(tokenName)
      }
    }
    return tokens
  }

  function getUserDefinedComponents(): string[] {
    const source = getSource()
    return extractElementNames(source)
  }

  function getPageNames(): string[] {
    const source = getSource()
    return extractPageNames(source)
  }

  return {
    getParentZagComponent,
    getAvailableTokens,
    getUserDefinedComponents,
    getPageNames,
  }
}

// ============================================
// CompletionUIPort Implementation
// ============================================

export function createCompletionUIPort(
  config: CreateCompletionUIPortConfig
): CompletionUIPort {
  const { view, onShow, onHide } = config
  let currentResult: AutocompleteResult | null = null
  let isVisible = false
  const selectionHandlers: Array<(completion: Completion) => void> = []

  function showCompletions(result: AutocompleteResult): void {
    currentResult = result
    isVisible = result.completions.length > 0

    if (isVisible && onShow) {
      onShow(result)
    }

    // Note: In production, CodeMirror handles the actual UI display
    // This port is for tracking state and callbacks
  }

  function hideCompletions(): void {
    if (isVisible && onHide) {
      onHide()
    }
    currentResult = null
    isVisible = false
  }

  function isCompletionsVisible(): boolean {
    return isVisible
  }

  function applyCompletion(completion: Completion, from: number, to: number): void {
    // Insert the completion text
    view.dispatch({
      changes: { from, to, insert: completion.label },
      selection: { anchor: from + completion.label.length },
    })
    hideCompletions()
  }

  function onCompletionSelected(handler: (completion: Completion) => void): CleanupFn {
    selectionHandlers.push(handler)
    return () => {
      const index = selectionHandlers.indexOf(handler)
      if (index !== -1) {
        selectionHandlers.splice(index, 1)
      }
    }
  }

  return {
    showCompletions,
    hideCompletions,
    isCompletionsVisible,
    applyCompletion,
    onCompletionSelected,
  }
}

// ============================================
// Combined Ports Factory
// ============================================

export function createAutocompletePorts(
  config: CreateAutocompletePortsConfig
): AutocompletePorts {
  const { view, getTokens, onShow, onHide } = config

  const editor = createEditorContextPort({ view })
  const sourceMap = createSourceMapContextPort({
    getSource: () => view.state.doc.toString(),
    getTokens,
  })
  const ui = createCompletionUIPort({ view, onShow, onHide })

  return {
    editor,
    sourceMap,
    ui,
  }
}
