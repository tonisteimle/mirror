/**
 * Editor Test Utilities
 *
 * Comprehensive utilities for testing editor hooks and components.
 * Provides mock editor with configurable behavior and spy support.
 */

import type { ScreenCoords, DispatchOptions } from './types'
import { MockEditor } from './mock-editor'

/**
 * Configuration for creating a test editor.
 */
export interface TestEditorConfig {
  /** Initial document content */
  doc?: string
  /** Initial cursor position */
  cursorPos?: number
  /** Mock coordinates to return from getCoordsAtPos */
  mockCoords?: ScreenCoords | null
  /** Whether to start focused */
  focused?: boolean
}

/**
 * Spy functions for tracking editor calls.
 */
export interface EditorSpies {
  onFocus: jest.Mock | ReturnType<typeof vi.fn>
  onDispatch: jest.Mock | ReturnType<typeof vi.fn>
  onChange: jest.Mock | ReturnType<typeof vi.fn>
}

// Try to use vitest's vi, fall back to creating simple mock functions
const createMockFn = (): ReturnType<typeof vi.fn> => {
  if (typeof vi !== 'undefined') {
    return vi.fn()
  }
  // Fallback for environments without vi
  const calls: unknown[][] = []
  const mockFn = ((...args: unknown[]) => {
    calls.push(args)
  }) as ReturnType<typeof vi.fn>
  mockFn.mock = { calls }
  mockFn.mockClear = () => { calls.length = 0 }
  mockFn.mockReset = () => { calls.length = 0 }
  return mockFn
}

/**
 * Extended MockEditor with additional test capabilities.
 */
export class TestEditor extends MockEditor {
  private mockCoords: ScreenCoords | null = { left: 100, top: 100, right: 110, bottom: 120 }
  private spies: EditorSpies
  private dispatchHistory: DispatchOptions[] = []

  constructor(config: TestEditorConfig = {}) {
    super({ doc: config.doc, onChange: undefined })

    // Set up spies
    this.spies = {
      onFocus: createMockFn(),
      onDispatch: createMockFn(),
      onChange: createMockFn(),
    }

    // Apply initial config
    if (config.cursorPos !== undefined) {
      this.setCursor(config.cursorPos)
    }
    if (config.mockCoords !== undefined) {
      this.mockCoords = config.mockCoords
    }
    if (config.focused) {
      this.focus()
    }
  }

  // Override getCoordsAtPos to use configurable mock coords
  override getCoordsAtPos(_pos: number): ScreenCoords | null {
    return this.mockCoords
  }

  // Override dispatch to track calls
  override dispatch(options: DispatchOptions): void {
    this.dispatchHistory.push(options)
    this.spies.onDispatch(options)
    super.dispatch(options)
    this.spies.onChange(this.getContent())
  }

  // Override focus to track calls
  override focus(): void {
    this.spies.onFocus()
    super.focus()
  }

  // === Test Configuration ===

  /**
   * Set the mock coordinates returned by getCoordsAtPos.
   */
  setMockCoords(coords: ScreenCoords | null): void {
    this.mockCoords = coords
  }

  /**
   * Set mock coordinates using simple x, y values.
   */
  setMockPosition(x: number, y: number): void {
    this.mockCoords = {
      left: x,
      top: y,
      right: x + 10,
      bottom: y + 20,
    }
  }

  // === Spies ===

  /**
   * Get the spy functions for assertions.
   */
  getSpies(): EditorSpies {
    return this.spies
  }

  /**
   * Get the dispatch call history.
   */
  getDispatchHistory(): DispatchOptions[] {
    return [...this.dispatchHistory]
  }

  /**
   * Clear all spies and history.
   */
  clearSpies(): void {
    this.spies.onFocus.mockClear?.()
    this.spies.onDispatch.mockClear?.()
    this.spies.onChange.mockClear?.()
    this.dispatchHistory = []
  }

  // === Simulation Helpers ===

  /**
   * Simulate typing text at the current cursor position.
   * Triggers dispatch for each character (useful for trigger testing).
   */
  simulateTyping(text: string): void {
    for (const char of text) {
      this.insert(char)
    }
  }

  /**
   * Simulate typing a trigger character (e.g., '#', '$', '?').
   * Returns the position after insertion.
   */
  simulateTrigger(char: string): { pos: number; charBefore: string } {
    const posBefore = this.getCursorPosition()
    this.insert(char)
    return {
      pos: this.getCursorPosition(),
      charBefore: char,
    }
  }

  /**
   * Get the character before the cursor.
   */
  getCharBefore(): string {
    const pos = this.getCursorPosition()
    if (pos === 0) return ''
    return this.getSlice(pos - 1, pos)
  }

  /**
   * Get text on current line before cursor.
   */
  getTextBeforeCursor(): string {
    const pos = this.getCursorPosition()
    const line = this.getLineAt(pos)
    return line.text.slice(0, pos - line.from)
  }
}

/**
 * Create a test editor with optional configuration.
 */
export function createTestEditor(config?: TestEditorConfig): TestEditor {
  return new TestEditor(config)
}

/**
 * Create a React ref containing a test editor.
 * Useful for testing hooks that expect React.RefObject<EditorView>.
 */
export function createTestEditorRef(config?: TestEditorConfig): {
  ref: React.RefObject<TestEditor>
  editor: TestEditor
} {
  const editor = createTestEditor(config)
  const ref = { current: editor } as React.RefObject<TestEditor>
  return { ref, editor }
}

/**
 * Create a mock EditorView-like object for testing hooks.
 * This mimics the CodeMirror EditorView API that hooks currently use.
 */
export function createMockEditorView(config?: TestEditorConfig): {
  view: MockEditorViewLike
  editor: TestEditor
} {
  const editor = createTestEditor(config)
  const view: MockEditorViewLike = {
    state: {
      doc: {
        toString: () => editor.getContent(),
        sliceString: (from: number, to: number) => editor.getSlice(from, to),
        lineAt: (pos: number) => {
          const line = editor.getLineAt(pos)
          return {
            from: line.from,
            to: line.to,
            text: line.text,
            number: line.number,
          }
        },
        line: (n: number) => {
          const line = editor.getLine(n)
          if (!line) throw new Error(`Invalid line number: ${n}`)
          return {
            from: line.from,
            to: line.to,
            text: line.text,
            number: line.number,
          }
        },
        lines: editor.getLineCount(),
        length: editor.getContent().length,
      },
      selection: {
        main: {
          from: editor.getSelection().from,
          to: editor.getSelection().to,
          head: editor.getCursorPosition(),
          anchor: editor.getSelection().from,
        },
      },
    },
    dispatch: (spec: DispatchOptions) => editor.dispatch(spec),
    coordsAtPos: (pos: number) => editor.getCoordsAtPos(pos),
    focus: () => editor.focus(),
  }

  return { view, editor }
}

/**
 * Type for mock EditorView-like objects.
 */
export interface MockEditorViewLike {
  state: {
    doc: {
      toString(): string
      sliceString(from: number, to: number): string
      lineAt(pos: number): { from: number; to: number; text: string; number: number }
      line(n: number): { from: number; to: number; text: string; number: number }
      lines: number
      length: number
    }
    selection: {
      main: {
        from: number
        to: number
        head: number
        anchor: number
      }
    }
  }
  dispatch(spec: DispatchOptions): void
  coordsAtPos(pos: number): ScreenCoords | null
  focus(): void
}

/**
 * Create a ref to a mock EditorView for testing hooks.
 */
export function createMockEditorViewRef(config?: TestEditorConfig): {
  ref: React.RefObject<MockEditorViewLike>
  editor: TestEditor
  view: MockEditorViewLike
} {
  const { view, editor } = createMockEditorView(config)
  const ref = { current: view } as React.RefObject<MockEditorViewLike>
  return { ref, editor, view }
}
