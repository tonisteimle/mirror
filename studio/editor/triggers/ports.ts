/**
 * Trigger Ports (Hexagonal Architecture)
 *
 * Port interfaces that abstract external dependencies for testability.
 * These enable testing triggers without CodeMirror, DOM, or global state.
 *
 * Architecture:
 * ```
 * TriggerController (pure logic)
 *        │
 *        ├── TriggerStatePort (active trigger, picker state)
 *        ├── EditorTriggerPort (cursor, text, insertion)
 *        ├── PickerPort (show, hide, filter, navigate)
 *        └── TriggerDetectionPort (detect trigger conditions)
 * ```
 */

import type {
  TriggerContext,
  TriggerState,
  TriggerConfig,
  TriggerDefinition,
  KeyboardConfig,
} from './types'

// ============================================
// Types
// ============================================

export type CleanupFn = () => void

export interface CursorPosition {
  line: number        // 1-indexed line number
  column: number      // 0-indexed column
  offset: number      // Character offset from start
}

export interface LineInfo {
  number: number      // 1-indexed line number
  text: string        // Line content
  from: number        // Start offset
  to: number          // End offset
}

export interface ScreenPosition {
  x: number
  y: number
}

export interface TextRange {
  from: number
  to: number
}

export interface InsertOptions {
  from: number
  to: number
  text: string
  /** Optional annotation for the change */
  annotation?: string
  /** Whether to move cursor after insertion */
  moveCursorTo?: 'end' | 'start' | number
}

// ============================================
// Trigger State Port
// ============================================

/**
 * TriggerStatePort manages the trigger lifecycle state.
 * Abstracts the singleton state management.
 */
export interface TriggerStatePort {
  /**
   * Get the current trigger state
   */
  getState(): TriggerState

  /**
   * Check if a trigger is currently active
   */
  isActive(): boolean

  /**
   * Get the active trigger ID
   */
  getActiveTriggerId(): string | null

  /**
   * Get the active trigger context
   */
  getActiveContext(): TriggerContext | null

  /**
   * Set trigger as active
   */
  activate(
    triggerId: string,
    startPos: number,
    context: TriggerContext
  ): void

  /**
   * Deactivate the current trigger
   */
  deactivate(): void

  /**
   * Update the current context (e.g., cursor position changes)
   */
  updateContext(updates: Partial<TriggerContext>): void

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: (state: TriggerState) => void): CleanupFn
}

// ============================================
// Editor Trigger Port
// ============================================

/**
 * EditorTriggerPort provides editor operations for triggers.
 * Abstracts CodeMirror EditorView access.
 */
export interface EditorTriggerPort {
  /**
   * Get the current cursor position
   */
  getCursorPosition(): CursorPosition

  /**
   * Get the current line info
   */
  getCurrentLine(): LineInfo

  /**
   * Get a specific line by number (1-indexed)
   */
  getLine(lineNumber: number): LineInfo | null

  /**
   * Get text in a range
   */
  getText(from: number, to: number): string

  /**
   * Get full document text
   */
  getSource(): string

  /**
   * Get the character at cursor position
   */
  getCharAtCursor(): string

  /**
   * Get the word range at cursor
   */
  getWordRange(): TextRange | null

  /**
   * Get text before cursor on current line
   */
  getTextBeforeCursor(): string

  /**
   * Get text after cursor on current line
   */
  getTextAfterCursor(): string

  /**
   * Get cursor screen position (for positioning pickers)
   */
  getCursorScreenPosition(): ScreenPosition

  /**
   * Insert or replace text
   */
  insertText(options: InsertOptions): void

  /**
   * Delete text in range
   */
  deleteText(from: number, to: number): void

  /**
   * Set cursor position
   */
  setCursorPosition(offset: number): void

  /**
   * Focus the editor
   */
  focus(): void

  /**
   * Check if editor has focus
   */
  hasFocus(): boolean
}

// ============================================
// Picker Port
// ============================================

/**
 * PickerPort manages picker display and interaction.
 * Abstracts the picker lifecycle.
 */
export interface PickerPort {
  /**
   * Show picker at screen position
   */
  show(x: number, y: number): void

  /**
   * Hide the current picker
   */
  hide(): void

  /**
   * Check if picker is visible
   */
  isVisible(): boolean

  /**
   * Filter picker items
   */
  filter(text: string): void

  /**
   * Navigate picker (arrow keys)
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void

  /**
   * Get the currently selected value
   */
  getSelectedValue(): string | null

  /**
   * Get all current values (after filtering)
   */
  getValues?(): string[]

  /**
   * Select a specific value
   */
  selectValue?(value: string): void

  /**
   * Subscribe to value selection
   */
  onSelect(handler: (value: string) => void): CleanupFn

  /**
   * Subscribe to picker close
   */
  onClose(handler: () => void): CleanupFn

  /**
   * Get keyboard config for navigation
   */
  getKeyboardConfig?(): KeyboardConfig
}

// ============================================
// Trigger Detection Port
// ============================================

/**
 * TriggerDetectionPort handles trigger detection logic.
 * Abstracts the pattern matching and context building.
 */
export interface TriggerDetectionPort {
  /**
   * Check if a character trigger should activate
   */
  checkCharTrigger(
    char: string,
    textBefore: string,
    line: LineInfo
  ): { matches: boolean; property?: string }

  /**
   * Check if a component trigger should activate
   */
  checkComponentTrigger(
    textBefore: string,
    componentNames: string[],
    pattern?: RegExp
  ): { matches: boolean; componentName?: string }

  /**
   * Check if a regex trigger matches
   */
  checkRegexTrigger(
    line: LineInfo,
    pattern: RegExp
  ): { matches: boolean; match?: RegExpMatchArray }

  /**
   * Check if a double-click trigger matches
   */
  checkDoubleClickTrigger(
    line: LineInfo,
    pattern: RegExp,
    clickOffset: number
  ): { matches: boolean; existingValue?: string; replaceRange?: TextRange }

  /**
   * Build trigger context from current editor state
   */
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
  ): TriggerContext

  /**
   * Extract property name from text before cursor
   */
  extractProperty(textBefore: string): string | null
}

// ============================================
// Event Port
// ============================================

/**
 * TriggerEventPort handles trigger-related events.
 * Abstracts the event bus.
 */
export interface TriggerEventPort {
  /**
   * Emit trigger activated event
   */
  emitActivated(triggerId: string, context: TriggerContext): void

  /**
   * Emit trigger deactivated event
   */
  emitDeactivated(triggerId: string): void

  /**
   * Emit value selected event
   */
  emitValueSelected(triggerId: string, value: string): void

  /**
   * Subscribe to picker closed events (from external pickers)
   */
  onPickerClosed(handler: () => void): CleanupFn
}

// ============================================
// Combined Ports
// ============================================

/**
 * All ports required by TriggerController.
 */
export interface TriggerPorts {
  state: TriggerStatePort
  editor: EditorTriggerPort
  picker: PickerPort
  detection: TriggerDetectionPort
  events: TriggerEventPort
}

// ============================================
// Trigger Registry
// ============================================

/**
 * TriggerRegistry manages registered trigger configurations.
 */
export interface TriggerRegistry {
  /**
   * Register a trigger configuration
   */
  register(config: TriggerConfig): void

  /**
   * Unregister a trigger by ID
   */
  unregister(id: string): void

  /**
   * Get a trigger by ID
   */
  get(id: string): TriggerConfig | null

  /**
   * Get all triggers sorted by priority (highest first)
   */
  getAll(): TriggerConfig[]

  /**
   * Get triggers by type
   */
  getByType(type: TriggerDefinition['type']): TriggerConfig[]

  /**
   * Check if a trigger exists
   */
  has(id: string): boolean

  /**
   * Clear all triggers
   */
  clear(): void
}

// ============================================
// Controller Result Types
// ============================================

/**
 * Result of trigger activation attempt
 */
export interface TriggerActivationResult {
  /** Whether a trigger was activated */
  activated: boolean
  /** The ID of the activated trigger */
  triggerId?: string
  /** Error message if activation failed */
  error?: string
}

/**
 * Result of trigger selection
 */
export interface TriggerSelectionResult {
  /** Whether selection was successful */
  success: boolean
  /** The selected value */
  value?: string
  /** Error message if selection failed */
  error?: string
}

/**
 * Result of trigger cancellation
 */
export interface TriggerCancellationResult {
  /** Whether cancellation was successful */
  success: boolean
  /** Whether typed text was removed */
  textRemoved: boolean
}
