/**
 * Mock Trigger Adapters
 *
 * Mock implementations for testing triggers without CodeMirror or DOM.
 * These enable pure unit testing of trigger logic.
 */

import type {
  TriggerStatePort,
  EditorTriggerPort,
  PickerPort,
  TriggerDetectionPort,
  TriggerEventPort,
  TriggerPorts,
  TriggerRegistry,
  CursorPosition,
  LineInfo,
  ScreenPosition,
  TextRange,
  InsertOptions,
  CleanupFn,
} from '../ports'
import type {
  TriggerContext,
  TriggerState,
  TriggerConfig,
  TriggerDefinition,
  KeyboardConfig,
} from '../types'

// ============================================
// Configuration Types
// ============================================

export interface MockTriggerStateConfig {
  /** Initial state */
  initialState?: Partial<TriggerState>
}

export interface MockEditorTriggerConfig {
  /** Initial source content */
  source?: string
  /** Initial cursor position */
  cursor?: CursorPosition
  /** Screen position for cursor */
  screenPosition?: ScreenPosition
}

export interface MockPickerConfig {
  /** Available values */
  values?: string[]
  /** Initial selected index */
  selectedIndex?: number
  /** Keyboard config */
  keyboardConfig?: KeyboardConfig
}

export interface CreateMockTriggerPortsConfig {
  source?: string
  cursor?: CursorPosition
  pickerValues?: string[]
}

// ============================================
// Mock TriggerStatePort
// ============================================

export interface MockTriggerStatePort extends TriggerStatePort {
  /** Get state change history */
  getStateHistory(): TriggerState[]
  /** Reset to initial state */
  reset(): void
}

export function createMockTriggerStatePort(
  config: MockTriggerStateConfig = {}
): MockTriggerStatePort {
  const initialState: TriggerState = {
    isOpen: false,
    startPos: null,
    picker: null,
    context: null,
    triggerId: null,
    ...config.initialState,
  }

  let state: TriggerState = { ...initialState }
  const stateHistory: TriggerState[] = []
  const listeners: Array<(state: TriggerState) => void> = []

  function notifyListeners() {
    stateHistory.push({ ...state })
    for (const listener of listeners) {
      listener(state)
    }
  }

  return {
    getState(): TriggerState {
      return { ...state }
    },

    isActive(): boolean {
      return state.isOpen
    },

    getActiveTriggerId(): string | null {
      return state.triggerId
    },

    getActiveContext(): TriggerContext | null {
      return state.context ? { ...state.context } : null
    },

    activate(triggerId: string, startPos: number, context: TriggerContext): void {
      state = {
        isOpen: true,
        startPos,
        picker: null,
        context: { ...context },
        triggerId,
      }
      notifyListeners()
    },

    deactivate(): void {
      state = {
        isOpen: false,
        startPos: null,
        picker: null,
        context: null,
        triggerId: null,
      }
      notifyListeners()
    },

    updateContext(updates: Partial<TriggerContext>): void {
      if (state.context) {
        state = {
          ...state,
          context: { ...state.context, ...updates },
        }
        notifyListeners()
      }
    },

    onStateChange(handler: (state: TriggerState) => void): CleanupFn {
      listeners.push(handler)
      return () => {
        const index = listeners.indexOf(handler)
        if (index !== -1) {
          listeners.splice(index, 1)
        }
      }
    },

    getStateHistory(): TriggerState[] {
      return [...stateHistory]
    },

    reset(): void {
      state = { ...initialState }
      stateHistory.length = 0
    },
  }
}

// ============================================
// Mock EditorTriggerPort
// ============================================

export interface MockEditorTriggerPort extends EditorTriggerPort {
  /** Set source content */
  setSource(source: string): void
  /** Set cursor position */
  setCursor(cursor: CursorPosition): void
  /** Move cursor to offset */
  moveCursor(offset: number): void
  /** Set screen position */
  setScreenPosition(pos: ScreenPosition): void
  /** Get insertion history */
  getInsertions(): InsertOptions[]
  /** Get deletion history */
  getDeletions(): TextRange[]
  /** Set focus state */
  setFocused(focused: boolean): void
  /** Reset to initial state */
  reset(): void
}

export function createMockEditorTriggerPort(
  config: MockEditorTriggerConfig = {}
): MockEditorTriggerPort {
  let source = config.source ?? ''
  let cursor: CursorPosition = config.cursor ?? { line: 1, column: 0, offset: 0 }
  let screenPosition: ScreenPosition = config.screenPosition ?? { x: 100, y: 100 }
  let focused = true
  const insertions: InsertOptions[] = []
  const deletions: TextRange[] = []

  function getLines(): string[] {
    return source.split('\n')
  }

  function offsetToPosition(offset: number): CursorPosition {
    const lines = getLines()
    let remaining = offset
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) return { line: i + 1, column: remaining, offset }
      remaining -= lines[i].length + 1
    }
    return { line: lines.length, column: lines[lines.length - 1]?.length ?? 0, offset }
  }

  function positionToOffset(line: number, column: number): number {
    const lines = getLines()
    let offset = 0
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1
    }
    return offset + column
  }

  return {
    setSource(newSource: string): void {
      source = newSource
    },

    setCursor(newCursor: CursorPosition): void {
      cursor = { ...newCursor }
    },

    moveCursor(offset: number): void {
      cursor = offsetToPosition(offset)
    },

    setScreenPosition(pos: ScreenPosition): void {
      screenPosition = { ...pos }
    },

    getInsertions(): InsertOptions[] {
      return [...insertions]
    },

    getDeletions(): TextRange[] {
      return [...deletions]
    },

    setFocused(isFocused: boolean): void {
      focused = isFocused
    },

    reset(): void {
      source = config.source ?? ''
      cursor = config.cursor ?? { line: 1, column: 0, offset: 0 }
      insertions.length = 0
      deletions.length = 0
      focused = true
    },

    getCursorPosition(): CursorPosition {
      return { ...cursor }
    },

    getCurrentLine(): LineInfo {
      const lines = getLines()
      const lineText = lines[cursor.line - 1] ?? ''
      let from = 0
      for (let i = 0; i < cursor.line - 1; i++) {
        from += lines[i].length + 1
      }
      return {
        number: cursor.line,
        text: lineText,
        from,
        to: from + lineText.length,
      }
    },

    getLine(lineNumber: number): LineInfo | null {
      const lines = getLines()
      if (lineNumber < 1 || lineNumber > lines.length) return null
      const text = lines[lineNumber - 1]
      const from = lines.slice(0, lineNumber - 1).reduce((sum, l) => sum + l.length + 1, 0)
      return { number: lineNumber, text, from, to: from + text.length }
    },

    getText(from: number, to: number): string {
      return source.slice(from, to)
    },

    getSource(): string {
      return source
    },

    getCharAtCursor(): string {
      return source[cursor.offset] ?? ''
    },

    getWordRange(): TextRange | null {
      const line = this.getCurrentLine()
      const col = cursor.column
      let start = col
      let end = col

      while (start > 0 && /[\w-]/.test(line.text[start - 1])) {
        start--
      }
      while (end < line.text.length && /[\w-]/.test(line.text[end])) {
        end++
      }

      if (start === end) {
        return null
      }

      return {
        from: line.from + start,
        to: line.from + end,
      }
    },

    getTextBeforeCursor(): string {
      const line = this.getCurrentLine()
      return line.text.slice(0, cursor.column)
    },

    getTextAfterCursor(): string {
      const line = this.getCurrentLine()
      return line.text.slice(cursor.column)
    },

    getCursorScreenPosition(): ScreenPosition {
      return { ...screenPosition }
    },

    insertText(options: InsertOptions): void {
      insertions.push({ ...options })
      // Apply the change to source
      source = source.slice(0, options.from) + options.text + source.slice(options.to)
      // Update cursor
      if (options.moveCursorTo === 'end') {
        cursor = offsetToPosition(options.from + options.text.length)
      } else if (options.moveCursorTo === 'start') {
        cursor = offsetToPosition(options.from)
      } else if (typeof options.moveCursorTo === 'number') {
        cursor = offsetToPosition(options.moveCursorTo)
      } else {
        cursor = offsetToPosition(options.from + options.text.length)
      }
    },

    deleteText(from: number, to: number): void {
      deletions.push({ from, to })
      source = source.slice(0, from) + source.slice(to)
      if (cursor.offset >= to) {
        cursor = offsetToPosition(cursor.offset - (to - from))
      } else if (cursor.offset > from) {
        cursor = offsetToPosition(from)
      }
    },

    setCursorPosition(offset: number): void {
      cursor = offsetToPosition(offset)
    },

    focus(): void {
      focused = true
    },

    hasFocus(): boolean {
      return focused
    },
  }
}

// ============================================
// Mock PickerPort
// ============================================

export interface MockPickerPort extends PickerPort {
  /** Set available values */
  setValues(values: string[]): void
  /** Get current values after filtering */
  getCurrentValues(): string[]
  /** Get selected index */
  getSelectedIndex(): number
  /** Set selected index */
  setSelectedIndex(index: number): void
  /** Simulate selection (triggers onSelect handlers) */
  simulateSelection(value: string): void
  /** Simulate close (triggers onClose handlers) */
  simulateClose(): void
  /** Get show history */
  getShowHistory(): Array<{ x: number; y: number }>
  /** Check if was hidden */
  wasHidden(): boolean
  /** Get filter history */
  getFilterHistory(): string[]
  /** Get navigation history */
  getNavigationHistory(): Array<'up' | 'down' | 'left' | 'right'>
  /** Reset state */
  reset(): void
}

export function createMockPickerPort(config: MockPickerConfig = {}): MockPickerPort {
  let values = [...(config.values ?? ['value1', 'value2', 'value3'])]
  let filteredValues = [...values]
  let selectedIndex = config.selectedIndex ?? 0
  let visible = false
  let hidden = false
  const showHistory: Array<{ x: number; y: number }> = []
  const filterHistory: string[] = []
  const navigationHistory: Array<'up' | 'down' | 'left' | 'right'> = []
  const selectHandlers: Array<(value: string) => void> = []
  const closeHandlers: Array<() => void> = []
  const keyboardConfig: KeyboardConfig = config.keyboardConfig ?? {
    orientation: 'vertical',
  }

  return {
    setValues(newValues: string[]): void {
      values = [...newValues]
      filteredValues = [...values]
      selectedIndex = 0
    },

    getCurrentValues(): string[] {
      return [...filteredValues]
    },

    getSelectedIndex(): number {
      return selectedIndex
    },

    setSelectedIndex(index: number): void {
      selectedIndex = Math.max(0, Math.min(index, filteredValues.length - 1))
    },

    simulateSelection(value: string): void {
      for (const handler of selectHandlers) {
        handler(value)
      }
    },

    simulateClose(): void {
      visible = false
      for (const handler of closeHandlers) {
        handler()
      }
    },

    getShowHistory(): Array<{ x: number; y: number }> {
      return [...showHistory]
    },

    wasHidden(): boolean {
      return hidden
    },

    getFilterHistory(): string[] {
      return [...filterHistory]
    },

    getNavigationHistory(): Array<'up' | 'down' | 'left' | 'right'> {
      return [...navigationHistory]
    },

    reset(): void {
      values = [...(config.values ?? ['value1', 'value2', 'value3'])]
      filteredValues = [...values]
      selectedIndex = config.selectedIndex ?? 0
      visible = false
      hidden = false
      showHistory.length = 0
      filterHistory.length = 0
      navigationHistory.length = 0
    },

    show(x: number, y: number): void {
      showHistory.push({ x, y })
      visible = true
      hidden = false
    },

    hide(): void {
      visible = false
      hidden = true
    },

    isVisible(): boolean {
      return visible
    },

    filter(text: string): void {
      filterHistory.push(text)
      if (!text) {
        filteredValues = [...values]
      } else {
        const lower = text.toLowerCase()
        filteredValues = values.filter(v => v.toLowerCase().includes(lower))
      }
      selectedIndex = 0
    },

    navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
      navigationHistory.push(direction)
      const cols = keyboardConfig.columns ?? 1

      if (keyboardConfig.orientation === 'grid' && cols > 1) {
        if (direction === 'up') {
          selectedIndex = Math.max(0, selectedIndex - cols)
        } else if (direction === 'down') {
          selectedIndex = Math.min(filteredValues.length - 1, selectedIndex + cols)
        } else if (direction === 'left') {
          selectedIndex = Math.max(0, selectedIndex - 1)
        } else if (direction === 'right') {
          selectedIndex = Math.min(filteredValues.length - 1, selectedIndex + 1)
        }
      } else {
        // Vertical navigation
        if (direction === 'up') {
          selectedIndex = Math.max(0, selectedIndex - 1)
        } else if (direction === 'down') {
          selectedIndex = Math.min(filteredValues.length - 1, selectedIndex + 1)
        }
      }
    },

    getSelectedValue(): string | null {
      return filteredValues[selectedIndex] ?? null
    },

    getValues(): string[] {
      return [...filteredValues]
    },

    selectValue(value: string): void {
      const index = filteredValues.indexOf(value)
      if (index !== -1) {
        selectedIndex = index
      }
    },

    onSelect(handler: (value: string) => void): CleanupFn {
      selectHandlers.push(handler)
      return () => {
        const index = selectHandlers.indexOf(handler)
        if (index !== -1) {
          selectHandlers.splice(index, 1)
        }
      }
    },

    onClose(handler: () => void): CleanupFn {
      closeHandlers.push(handler)
      return () => {
        const index = closeHandlers.indexOf(handler)
        if (index !== -1) {
          closeHandlers.splice(index, 1)
        }
      }
    },

    getKeyboardConfig(): KeyboardConfig {
      return { ...keyboardConfig }
    },
  }
}

// ============================================
// Mock TriggerDetectionPort
// ============================================

export interface MockTriggerDetectionPort extends TriggerDetectionPort {
  /** Set custom char trigger result */
  setCharTriggerResult(result: { matches: boolean; property?: string }): void
  /** Set custom component trigger result */
  setComponentTriggerResult(result: { matches: boolean; componentName?: string }): void
  /** Reset to default behavior */
  reset(): void
}

export function createMockTriggerDetectionPort(): MockTriggerDetectionPort {
  let customCharResult: { matches: boolean; property?: string } | null = null
  let customComponentResult: { matches: boolean; componentName?: string } | null = null

  // Property patterns for extraction
  const PROPERTY_PATTERN = /\b(bg|col|ic|pad|mar|gap|rad|boc|fs)\s*$/

  return {
    setCharTriggerResult(result: { matches: boolean; property?: string }): void {
      customCharResult = result
    },

    setComponentTriggerResult(result: { matches: boolean; componentName?: string }): void {
      customComponentResult = result
    },

    reset(): void {
      customCharResult = null
      customComponentResult = null
    },

    checkCharTrigger(
      char: string,
      textBefore: string,
      line: LineInfo
    ): { matches: boolean; property?: string } {
      if (customCharResult) return customCharResult
      return { matches: true, property: this.extractProperty(textBefore) ?? undefined }
    },

    checkComponentTrigger(
      textBefore: string,
      componentNames: string[],
      pattern?: RegExp
    ): { matches: boolean; componentName?: string } {
      if (customComponentResult) {
        return customComponentResult
      }

      // Check explicit names
      for (const name of componentNames) {
        if (textBefore.endsWith(name)) {
          return { matches: true, componentName: name }
        }
      }

      // Check pattern
      if (pattern) {
        const match = textBefore.match(pattern)
        if (match) {
          return { matches: true, componentName: match[0] }
        }
      }

      return { matches: false }
    },

    checkRegexTrigger(
      line: LineInfo,
      pattern: RegExp
    ): { matches: boolean; match?: RegExpMatchArray } {
      const match = line.text.match(pattern)
      return {
        matches: !!match,
        match: match ?? undefined,
      }
    },

    checkDoubleClickTrigger(
      line: LineInfo,
      pattern: RegExp,
      clickOffset: number
    ): { matches: boolean; existingValue?: string; replaceRange?: TextRange } {
      const match = line.text.match(pattern)
      if (!match || match.index === undefined) {
        return { matches: false }
      }

      const matchStart = line.from + match.index
      const matchEnd = matchStart + match[0].length
      const relativeOffset = clickOffset - line.from

      if (relativeOffset >= match.index && relativeOffset <= match.index + match[0].length) {
        return {
          matches: true,
          existingValue: match[0],
          replaceRange: { from: matchStart, to: matchEnd },
        }
      }

      return { matches: false }
    },

    buildContext(
      cursorPos: number,
      line: LineInfo,
      options?: {
        startPos?: number
        property?: string
        componentName?: string
        existingValue?: string
        replaceRange?: TextRange
      }
    ): TriggerContext {
      const startPos = options?.startPos ?? cursorPos
      const textBefore = line.text.slice(0, cursorPos - line.from)
      const textAfter = line.text.slice(cursorPos - line.from)

      return {
        startPos,
        cursorPos,
        line: {
          number: line.number,
          from: line.from,
          to: line.to,
          text: line.text,
        },
        textBefore,
        textAfter,
        property: options?.property,
        componentName: options?.componentName,
        existingValue: options?.existingValue,
        replaceRange: options?.replaceRange,
      }
    },

    extractProperty(textBefore: string): string | null {
      const match = textBefore.match(PROPERTY_PATTERN)
      return match ? match[1] : null
    },
  }
}

// ============================================
// Mock TriggerEventPort
// ============================================

export interface MockTriggerEventPort extends TriggerEventPort {
  /** Get emitted activated events */
  getActivatedEvents(): Array<{ triggerId: string; context: TriggerContext }>
  /** Get emitted deactivated events */
  getDeactivatedEvents(): string[]
  /** Get emitted value selected events */
  getValueSelectedEvents(): Array<{ triggerId: string; value: string }>
  /** Simulate picker closed event */
  simulatePickerClosed(): void
  /** Reset event history */
  reset(): void
}

export function createMockTriggerEventPort(): MockTriggerEventPort {
  const activatedEvents: Array<{ triggerId: string; context: TriggerContext }> = []
  const deactivatedEvents: string[] = []
  const valueSelectedEvents: Array<{ triggerId: string; value: string }> = []
  const pickerClosedHandlers: Array<() => void> = []

  return {
    getActivatedEvents(): Array<{ triggerId: string; context: TriggerContext }> {
      return [...activatedEvents]
    },

    getDeactivatedEvents(): string[] {
      return [...deactivatedEvents]
    },

    getValueSelectedEvents(): Array<{ triggerId: string; value: string }> {
      return [...valueSelectedEvents]
    },

    simulatePickerClosed(): void {
      for (const handler of pickerClosedHandlers) {
        handler()
      }
    },

    reset(): void {
      activatedEvents.length = 0
      deactivatedEvents.length = 0
      valueSelectedEvents.length = 0
    },

    emitActivated(triggerId: string, context: TriggerContext): void {
      activatedEvents.push({ triggerId, context: { ...context } })
    },

    emitDeactivated(triggerId: string): void {
      deactivatedEvents.push(triggerId)
    },

    emitValueSelected(triggerId: string, value: string): void {
      valueSelectedEvents.push({ triggerId, value })
    },

    onPickerClosed(handler: () => void): CleanupFn {
      pickerClosedHandlers.push(handler)
      return () => {
        const index = pickerClosedHandlers.indexOf(handler)
        if (index !== -1) {
          pickerClosedHandlers.splice(index, 1)
        }
      }
    },
  }
}

// ============================================
// Mock TriggerRegistry
// ============================================

export function createMockTriggerRegistry(): TriggerRegistry {
  const triggers = new Map<string, TriggerConfig>()

  return {
    register(config: TriggerConfig): void {
      triggers.set(config.id, config)
    },

    unregister(id: string): void {
      triggers.delete(id)
    },

    get(id: string): TriggerConfig | null {
      return triggers.get(id) ?? null
    },

    getAll(): TriggerConfig[] {
      return Array.from(triggers.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    },

    getByType(type: TriggerDefinition['type']): TriggerConfig[] {
      return this.getAll().filter(t => t.trigger.type === type)
    },

    has(id: string): boolean {
      return triggers.has(id)
    },

    clear(): void {
      triggers.clear()
    },
  }
}

// ============================================
// Combined Mock Ports
// ============================================

export interface MockTriggerPorts extends TriggerPorts {
  state: MockTriggerStatePort
  editor: MockEditorTriggerPort
  picker: MockPickerPort
  detection: MockTriggerDetectionPort
  events: MockTriggerEventPort
}

export function createMockTriggerPorts(
  config: CreateMockTriggerPortsConfig = {}
): MockTriggerPorts {
  const state = createMockTriggerStatePort()
  const editor = createMockEditorTriggerPort({
    source: config.source,
    cursor: config.cursor,
  })
  const picker = createMockPickerPort({
    values: config.pickerValues,
  })
  const detection = createMockTriggerDetectionPort()
  const events = createMockTriggerEventPort()

  return {
    state,
    editor,
    picker,
    detection,
    events,
  }
}

// ============================================
// Test Fixture Helper
// ============================================

export interface TriggerTestFixture {
  ports: MockTriggerPorts
  registry: TriggerRegistry
  /** Set up editor with source and cursor */
  setup(source: string, line: number, column: number): void
  /** Type a character at cursor */
  typeChar(char: string): void
  /** Simulate trigger activation */
  activateTrigger(triggerId: string): void
  /** Simulate value selection */
  selectValue(value: string): void
  /** Simulate cancellation */
  cancel(): void
  /** Reset all state */
  reset(): void
}

export function createTriggerTestFixture(): TriggerTestFixture {
  const ports = createMockTriggerPorts()
  const registry = createMockTriggerRegistry()

  return {
    ports,
    registry,

    setup(source: string, line: number, column: number): void {
      ports.editor.setSource(source)
      const lines = source.split('\n')
      let offset = 0
      for (let i = 0; i < line - 1 && i < lines.length; i++) {
        offset += lines[i].length + 1
      }
      offset += column
      ports.editor.setCursor({ line, column, offset })
    },

    typeChar(char: string): void {
      const cursor = ports.editor.getCursorPosition()
      ports.editor.insertText({
        from: cursor.offset,
        to: cursor.offset,
        text: char,
        moveCursorTo: 'end',
      })
    },

    activateTrigger(triggerId: string): void {
      const line = ports.editor.getCurrentLine()
      const cursor = ports.editor.getCursorPosition()
      const context = ports.detection.buildContext(cursor.offset, line)
      ports.state.activate(triggerId, cursor.offset, context)
      ports.picker.show(100, 100)
      ports.events.emitActivated(triggerId, context)
    },

    selectValue(value: string): void {
      const triggerId = ports.state.getActiveTriggerId()
      if (triggerId) {
        ports.events.emitValueSelected(triggerId, value)
      }
      ports.picker.hide()
      ports.state.deactivate()
    },

    cancel(): void {
      const triggerId = ports.state.getActiveTriggerId()
      if (triggerId) {
        ports.events.emitDeactivated(triggerId)
      }
      ports.picker.hide()
      ports.state.deactivate()
    },

    reset(): void {
      ports.state.reset()
      ports.editor.reset()
      ports.picker.reset()
      ports.detection.reset()
      ports.events.reset()
      registry.clear()
    },
  }
}
