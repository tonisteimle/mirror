/**
 * Mock Autocomplete Adapters
 *
 * Mock implementations for testing autocomplete without CodeMirror or DOM.
 * These enable pure unit testing of autocomplete logic.
 */

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

// ============================================
// Configuration Types
// ============================================

export interface MockEditorContextConfig {
  /** Source code content */
  source?: string
  /** Current cursor position */
  cursor?: CursorPosition
}

export interface MockSourceMapContextConfig {
  /** Map of line number to parent Zag component */
  parentZagComponents?: Map<number, string>
  /** Available tokens */
  tokens?: string[]
  /** User-defined components */
  userComponents?: string[]
  /** Page names */
  pageNames?: string[]
}

export interface MockCompletionUIConfig {
  /** Track shown completions */
  trackCompletions?: boolean
}

export interface CreateMockAutocompletePortsConfig {
  source?: string
  cursor?: CursorPosition
  parentZagComponents?: Map<number, string>
  tokens?: string[]
  userComponents?: string[]
  pageNames?: string[]
}

// ============================================
// Mock EditorContextPort
// ============================================

export interface MockEditorContextPort extends EditorContextPort {
  /** Set the source code */
  setSource(source: string): void
  /** Set cursor position */
  setCursor(cursor: CursorPosition): void
  /** Move cursor to line and column */
  moveCursor(line: number, column: number): void
  /** Get current source */
  readonly source: string
}

export function createMockEditorContextPort(
  config: MockEditorContextConfig = {}
): MockEditorContextPort {
  let source = config.source ?? ''
  let cursor: CursorPosition = config.cursor ?? { line: 1, column: 0, offset: 0 }

  function getLines(): string[] {
    return source.split('\n')
  }

  function calculateOffset(line: number, column: number): number {
    const lines = getLines()
    let offset = 0
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    return offset + column
  }

  return {
    get source() {
      return source
    },

    setSource(newSource: string): void {
      source = newSource
    },

    setCursor(newCursor: CursorPosition): void {
      cursor = newCursor
    },

    moveCursor(line: number, column: number): void {
      cursor = {
        line,
        column,
        offset: calculateOffset(line, column),
      }
    },

    getSource(): string {
      return source
    },

    getCursor(): CursorPosition {
      return { ...cursor }
    },

    getLine(lineNumber: number): LineInfo | null {
      const lines = getLines()
      if (lineNumber < 1 || lineNumber > lines.length) return null
      const text = lines[lineNumber - 1]
      const from = lines.slice(0, lineNumber - 1).reduce((sum, l) => sum + l.length + 1, 0)
      return { number: lineNumber, text, from, to: from + text.length }
    },

    getCurrentLine(): LineInfo | null {
      return this.getLine(cursor.line)
    },

    getTextBeforeCursor(): string {
      const line = this.getCurrentLine()
      if (!line) return ''
      return line.text.slice(0, cursor.column)
    },

    getWordAtCursor(): { word: string; from: number; to: number } | null {
      const line = this.getCurrentLine()
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
    },
  }
}

// ============================================
// Mock SourceMapContextPort
// ============================================

export interface MockSourceMapContextPort extends SourceMapContextPort {
  /** Set parent Zag component for a line */
  setParentZagComponent(lineNumber: number, component: string): void
  /** Add available token */
  addToken(token: string): void
  /** Set available tokens */
  setTokens(tokens: string[]): void
  /** Add user-defined component */
  addUserComponent(name: string): void
  /** Set user-defined components */
  setUserComponents(names: string[]): void
  /** Add page name */
  addPageName(name: string): void
  /** Set page names */
  setPageNames(names: string[]): void
  /** Clear all data */
  clear(): void
}

export function createMockSourceMapContextPort(
  config: MockSourceMapContextConfig = {}
): MockSourceMapContextPort {
  const parentZagComponents = new Map<number, string>(config.parentZagComponents)
  let tokens = [...(config.tokens ?? [])]
  let userComponents = [...(config.userComponents ?? [])]
  let pageNames = [...(config.pageNames ?? [])]

  return {
    setParentZagComponent(lineNumber: number, component: string): void {
      parentZagComponents.set(lineNumber, component)
    },

    addToken(token: string): void {
      if (!tokens.includes(token)) {
        tokens.push(token)
      }
    },

    setTokens(newTokens: string[]): void {
      tokens = [...newTokens]
    },

    addUserComponent(name: string): void {
      if (!userComponents.includes(name)) {
        userComponents.push(name)
      }
    },

    setUserComponents(names: string[]): void {
      userComponents = [...names]
    },

    addPageName(name: string): void {
      if (!pageNames.includes(name)) {
        pageNames.push(name)
      }
    },

    setPageNames(names: string[]): void {
      pageNames = [...names]
    },

    clear(): void {
      parentZagComponents.clear()
      tokens = []
      userComponents = []
      pageNames = []
    },

    getParentZagComponent(lineNumber: number): string | null {
      return parentZagComponents.get(lineNumber) ?? null
    },

    getAvailableTokens(): string[] {
      return [...tokens]
    },

    getUserDefinedComponents(): string[] {
      return [...userComponents]
    },

    getPageNames(): string[] {
      return [...pageNames]
    },
  }
}

// ============================================
// Mock CompletionUIPort
// ============================================

export interface MockCompletionUIPort extends CompletionUIPort {
  /** Get the last shown result */
  getLastShownResult(): AutocompleteResult | null
  /** Get all shown results history */
  getShownResultsHistory(): AutocompleteResult[]
  /** Check if hide was called */
  wasHideCalled(): boolean
  /** Get applied completions history */
  getAppliedCompletions(): Array<{ completion: Completion; from: number; to: number }>
  /** Simulate selecting a completion */
  simulateSelection(completion: Completion): void
  /** Clear all tracking data */
  clearTracking(): void
  /** Set visibility state */
  setVisible(visible: boolean): void
}

export function createMockCompletionUIPort(
  config: MockCompletionUIConfig = {}
): MockCompletionUIPort {
  let isVisible = false
  let lastShownResult: AutocompleteResult | null = null
  const shownResultsHistory: AutocompleteResult[] = []
  let hideCalled = false
  const appliedCompletions: Array<{ completion: Completion; from: number; to: number }> = []
  const selectionHandlers: Array<(completion: Completion) => void> = []

  return {
    getLastShownResult(): AutocompleteResult | null {
      return lastShownResult
    },

    getShownResultsHistory(): AutocompleteResult[] {
      return [...shownResultsHistory]
    },

    wasHideCalled(): boolean {
      return hideCalled
    },

    getAppliedCompletions(): Array<{ completion: Completion; from: number; to: number }> {
      return [...appliedCompletions]
    },

    simulateSelection(completion: Completion): void {
      for (const handler of selectionHandlers) {
        handler(completion)
      }
    },

    clearTracking(): void {
      lastShownResult = null
      shownResultsHistory.length = 0
      hideCalled = false
      appliedCompletions.length = 0
    },

    setVisible(visible: boolean): void {
      isVisible = visible
    },

    showCompletions(result: AutocompleteResult): void {
      lastShownResult = result
      shownResultsHistory.push(result)
      isVisible = result.completions.length > 0
    },

    hideCompletions(): void {
      hideCalled = true
      isVisible = false
    },

    isCompletionsVisible(): boolean {
      return isVisible
    },

    applyCompletion(completion: Completion, from: number, to: number): void {
      appliedCompletions.push({ completion, from, to })
      isVisible = false
    },

    onCompletionSelected(handler: (completion: Completion) => void): CleanupFn {
      selectionHandlers.push(handler)
      return () => {
        const index = selectionHandlers.indexOf(handler)
        if (index !== -1) {
          selectionHandlers.splice(index, 1)
        }
      }
    },
  }
}

// ============================================
// Combined Mock Ports
// ============================================

export interface MockAutocompletePorts extends AutocompletePorts {
  editor: MockEditorContextPort
  sourceMap: MockSourceMapContextPort
  ui: MockCompletionUIPort
}

export function createMockAutocompletePorts(
  config: CreateMockAutocompletePortsConfig = {}
): MockAutocompletePorts {
  const editor = createMockEditorContextPort({
    source: config.source,
    cursor: config.cursor,
  })

  const sourceMap = createMockSourceMapContextPort({
    parentZagComponents: config.parentZagComponents,
    tokens: config.tokens,
    userComponents: config.userComponents,
    pageNames: config.pageNames,
  })

  const ui = createMockCompletionUIPort({
    trackCompletions: true,
  })

  return {
    editor,
    sourceMap,
    ui,
  }
}

// ============================================
// Test Fixture Helper
// ============================================

export interface AutocompleteTestFixture {
  ports: MockAutocompletePorts
  /** Set source and cursor position for testing */
  setup(source: string, line: number, column: number): void
  /** Type text at cursor (updates source and cursor) */
  typeText(text: string): void
  /** Get text before cursor on current line */
  getTextBeforeCursor(): string
}

export function createAutocompleteTestFixture(): AutocompleteTestFixture {
  const ports = createMockAutocompletePorts()

  return {
    ports,

    setup(source: string, line: number, column: number): void {
      ports.editor.setSource(source)
      ports.editor.moveCursor(line, column)
    },

    typeText(text: string): void {
      const source = ports.editor.source
      const cursor = ports.editor.getCursor()
      const lines = source.split('\n')

      if (cursor.line <= lines.length) {
        const lineText = lines[cursor.line - 1]
        const newLineText = lineText.slice(0, cursor.column) + text + lineText.slice(cursor.column)
        lines[cursor.line - 1] = newLineText

        ports.editor.setSource(lines.join('\n'))
        ports.editor.moveCursor(cursor.line, cursor.column + text.length)
      }
    },

    getTextBeforeCursor(): string {
      return ports.editor.getTextBeforeCursor()
    },
  }
}
