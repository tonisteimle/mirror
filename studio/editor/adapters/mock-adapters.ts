/**
 * Mock Editor Adapters
 *
 * Mock implementations of all editor ports for testing.
 * These run entirely in-memory without DOM dependencies.
 */

import type {
  EditorPort,
  StatePort,
  TimerPort,
  EditorPorts,
  CursorPosition,
  StateCursor,
  SelectionOrigin,
  Selection,
  LineInfo,
  CleanupFn,
} from '../ports'

// ============================================
// Mock Editor Port
// ============================================

export interface MockEditorPortState {
  content: string
  cursor: CursorPosition
  selection: Selection
  hasFocus: boolean
  scrollHistory: number[]
}

export interface MockEditorPort extends EditorPort {
  // Test helpers - simulation
  simulateContentChange(content: string): void
  simulateCursorMove(position: CursorPosition): void
  simulateSelectionChange(selection: Selection): void
  simulateFocus(): void
  simulateBlur(): void

  // Test helpers - inspection
  getState(): MockEditorPortState
  getContentHistory(): string[]
  getCursorHistory(): CursorPosition[]
  getScrollHistory(): number[]

  // Test helpers - reset
  reset(): void
}

export function createMockEditorPort(initialContent = ''): MockEditorPort {
  // State
  let content = initialContent
  let cursor: CursorPosition = { line: 1, column: 1, offset: 0 }
  let selection: Selection = { from: 0, to: 0 }
  let hasFocus = false

  // History for assertions
  const contentHistory: string[] = []
  const cursorHistory: CursorPosition[] = []
  const scrollHistory: number[] = []

  // Event handlers
  const handlers = {
    contentChange: new Set<(content: string) => void>(),
    cursorMove: new Set<(position: CursorPosition) => void>(),
    selectionChange: new Set<(selection: Selection) => void>(),
    focus: new Set<() => void>(),
    blur: new Set<() => void>(),
  }

  // Helper to calculate cursor from offset
  function offsetToCursor(offset: number): CursorPosition {
    const lines = content.slice(0, offset).split('\n')
    const line = lines.length
    const column = (lines[lines.length - 1]?.length ?? 0) + 1
    return { line, column, offset }
  }

  // Helper to get line info
  function getLineInfo(lineNumber: number): LineInfo | null {
    const lines = content.split('\n')
    if (lineNumber < 1 || lineNumber > lines.length) return null

    let from = 0
    for (let i = 0; i < lineNumber - 1; i++) {
      from += lines[i].length + 1 // +1 for newline
    }
    const text = lines[lineNumber - 1]
    const to = from + text.length

    return { number: lineNumber, from, to, text }
  }

  return {
    // ----------------------------------------
    // Document
    // ----------------------------------------

    getContent(): string {
      return content
    },

    setContent(newContent: string): void {
      content = newContent
      contentHistory.push(newContent)
    },

    getLineCount(): number {
      return content.split('\n').length
    },

    getLine(lineNumber: number): LineInfo | null {
      return getLineInfo(lineNumber)
    },

    // ----------------------------------------
    // Cursor
    // ----------------------------------------

    getCursor(): CursorPosition {
      return { ...cursor }
    },

    setCursor(position: CursorPosition): void {
      cursor = { ...position }
      cursorHistory.push(cursor)
    },

    setCursorOffset(offset: number): void {
      cursor = offsetToCursor(offset)
      cursorHistory.push(cursor)
    },

    // ----------------------------------------
    // Selection
    // ----------------------------------------

    getSelection(): Selection {
      return { ...selection }
    },

    setSelection(from: number, to: number): void {
      selection = { from, to }
    },

    // ----------------------------------------
    // Insert / Edit
    // ----------------------------------------

    insertAt(position: number, text: string): void {
      content = content.slice(0, position) + text + content.slice(position)
      contentHistory.push(content)
    },

    insertAtCursor(text: string): void {
      const pos = cursor.offset
      content = content.slice(0, pos) + text + content.slice(pos)
      cursor = offsetToCursor(pos + text.length)
      contentHistory.push(content)
      cursorHistory.push(cursor)
    },

    replaceRange(from: number, to: number, text: string): void {
      content = content.slice(0, from) + text + content.slice(to)
      contentHistory.push(content)
    },

    // ----------------------------------------
    // Scroll
    // ----------------------------------------

    scrollToLine(lineNumber: number, _center = true): void {
      scrollHistory.push(lineNumber)
    },

    // ----------------------------------------
    // Focus
    // ----------------------------------------

    hasFocus(): boolean {
      return hasFocus
    },

    focus(): void {
      hasFocus = true
    },

    blur(): void {
      hasFocus = false
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
    // Test Helpers - Simulation
    // ----------------------------------------

    simulateContentChange(newContent: string): void {
      content = newContent
      contentHistory.push(newContent)
      handlers.contentChange.forEach((h) => h(newContent))
    },

    simulateCursorMove(position: CursorPosition): void {
      cursor = { ...position }
      cursorHistory.push(cursor)
      handlers.cursorMove.forEach((h) => h(cursor))
    },

    simulateSelectionChange(newSelection: Selection): void {
      selection = { ...newSelection }
      handlers.selectionChange.forEach((h) => h(selection))
    },

    simulateFocus(): void {
      hasFocus = true
      handlers.focus.forEach((h) => h())
    },

    simulateBlur(): void {
      hasFocus = false
      handlers.blur.forEach((h) => h())
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getState(): MockEditorPortState {
      return {
        content,
        cursor: { ...cursor },
        selection: { ...selection },
        hasFocus,
        scrollHistory: [...scrollHistory],
      }
    },

    getContentHistory(): string[] {
      return [...contentHistory]
    },

    getCursorHistory(): CursorPosition[] {
      return [...cursorHistory]
    },

    getScrollHistory(): number[] {
      return [...scrollHistory]
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      content = initialContent
      cursor = { line: 1, column: 1, offset: 0 }
      selection = { from: 0, to: 0 }
      hasFocus = false
      contentHistory.length = 0
      cursorHistory.length = 0
      scrollHistory.length = 0
      handlers.contentChange.clear()
      handlers.cursorMove.clear()
      handlers.selectionChange.clear()
      handlers.focus.clear()
      handlers.blur.clear()
    },
  }
}

// ============================================
// Mock State Port
// ============================================

export interface MockStatePortState {
  editorFocus: boolean
  cursor: StateCursor
  selectionEvents: Array<{ nodeId: string | null; origin: SelectionOrigin }>
  cursorEvents: StateCursor[]
}

export interface MockStatePort extends StatePort {
  // Test helpers - inspection
  getState(): MockStatePortState
  getSelectionEvents(): Array<{ nodeId: string | null; origin: SelectionOrigin }>
  getCursorEvents(): StateCursor[]

  // Test helpers - reset
  reset(): void
}

export function createMockStatePort(): MockStatePort {
  let editorFocus = false
  let cursor: StateCursor = { line: 1, column: 1 }
  const selectionEvents: Array<{ nodeId: string | null; origin: SelectionOrigin }> = []
  const cursorEvents: StateCursor[] = []

  return {
    // ----------------------------------------
    // Focus State
    // ----------------------------------------

    getEditorFocus(): boolean {
      return editorFocus
    },

    setEditorFocus(hasFocus: boolean): void {
      editorFocus = hasFocus
    },

    // ----------------------------------------
    // Cursor State
    // ----------------------------------------

    getCursor(): StateCursor {
      return { ...cursor }
    },

    setCursor(line: number, column: number): void {
      cursor = { line, column }
    },

    // ----------------------------------------
    // Events
    // ----------------------------------------

    emitSelectionChanged(nodeId: string | null, origin: SelectionOrigin): void {
      selectionEvents.push({ nodeId, origin })
    },

    emitCursorMoved(position: StateCursor): void {
      cursorEvents.push({ ...position })
    },

    // ----------------------------------------
    // Test Helpers
    // ----------------------------------------

    getState(): MockStatePortState {
      return {
        editorFocus,
        cursor: { ...cursor },
        selectionEvents: [...selectionEvents],
        cursorEvents: [...cursorEvents],
      }
    },

    getSelectionEvents(): Array<{ nodeId: string | null; origin: SelectionOrigin }> {
      return [...selectionEvents]
    },

    getCursorEvents(): StateCursor[] {
      return [...cursorEvents]
    },

    reset(): void {
      editorFocus = false
      cursor = { line: 1, column: 1 }
      selectionEvents.length = 0
      cursorEvents.length = 0
    },
  }
}

// ============================================
// Mock Timer Port
// ============================================

export interface MockTimerPort extends TimerPort {
  // Test helpers - execution
  flushFrames(): void
  flushTimeouts(): void
  flushAll(): void

  // Test helpers - inspection
  getPendingFrameCount(): number
  getPendingTimeoutCount(): number

  // Test helpers - reset
  reset(): void
}

export function createMockTimerPort(): MockTimerPort {
  let frameId = 0
  let timeoutId = 0
  const pendingFrames = new Map<number, () => void>()
  const pendingTimeouts = new Map<number, { callback: () => void; delay: number }>()

  return {
    // ----------------------------------------
    // Timer Port Implementation
    // ----------------------------------------

    requestFrame(callback: () => void): number {
      const id = ++frameId
      pendingFrames.set(id, callback)
      return id
    },

    cancelFrame(id: number): void {
      pendingFrames.delete(id)
    },

    setTimeout(callback: () => void, delay: number): number {
      const id = ++timeoutId
      pendingTimeouts.set(id, { callback, delay })
      return id
    },

    clearTimeout(id: number): void {
      pendingTimeouts.delete(id)
    },

    // ----------------------------------------
    // Test Helpers - Execution
    // ----------------------------------------

    flushFrames(): void {
      const callbacks = [...pendingFrames.values()]
      pendingFrames.clear()
      callbacks.forEach((cb) => cb())
    },

    flushTimeouts(): void {
      const entries = [...pendingTimeouts.values()]
      pendingTimeouts.clear()
      entries.forEach(({ callback }) => callback())
    },

    flushAll(): void {
      // Flush both, frames first (they're usually higher priority)
      this.flushFrames()
      this.flushTimeouts()
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getPendingFrameCount(): number {
      return pendingFrames.size
    },

    getPendingTimeoutCount(): number {
      return pendingTimeouts.size
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      pendingFrames.clear()
      pendingTimeouts.clear()
      frameId = 0
      timeoutId = 0
    },
  }
}

// ============================================
// Combined Mock Ports Factory
// ============================================

export interface MockEditorPorts {
  editor: MockEditorPort
  state: MockStatePort
  timer: MockTimerPort
}

export function createMockEditorPorts(initialContent = ''): MockEditorPorts {
  return {
    editor: createMockEditorPort(initialContent),
    state: createMockStatePort(),
    timer: createMockTimerPort(),
  }
}
