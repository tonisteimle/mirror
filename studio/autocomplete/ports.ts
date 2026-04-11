/**
 * Autocomplete Ports (Hexagonal Architecture)
 *
 * Port interfaces that abstract external dependencies for testability.
 * These enable testing autocomplete without CodeMirror or DOM.
 *
 * Architecture:
 * ```
 * AutocompleteEngine (pure logic - already testable)
 *        │
 *        └── Used by AutocompleteProvider (orchestrator)
 *                    │
 *                    ├── EditorContextPort (source, cursor, line info)
 *                    ├── SourceMapContextPort (parent node info)
 *                    └── CompletionUIPort (show completions)
 * ```
 *
 * Note: AutocompleteEngine itself is already pure and takes plain strings.
 * These ports are for the integration layer that feeds data to the engine.
 */

import type { Completion, AutocompleteContext, AutocompleteResult } from './index'

// ============================================
// Types
// ============================================

export interface CursorPosition {
  line: number      // 1-indexed line number
  column: number    // 0-indexed column
  offset: number    // Character offset from start
}

export interface LineInfo {
  number: number    // 1-indexed line number
  text: string      // Line content
  from: number      // Start offset
  to: number        // End offset
}

export type CleanupFn = () => void

// ============================================
// Editor Context Port
// ============================================

/**
 * EditorContextPort provides access to editor state for autocomplete.
 * Abstracts CodeMirror EditorView access.
 */
export interface EditorContextPort {
  /**
   * Get the full source code
   */
  getSource(): string

  /**
   * Get the current cursor position
   */
  getCursor(): CursorPosition

  /**
   * Get information about a specific line (1-indexed)
   */
  getLine(lineNumber: number): LineInfo | null

  /**
   * Get the current line (where cursor is)
   */
  getCurrentLine(): LineInfo | null

  /**
   * Get text before cursor on current line
   */
  getTextBeforeCursor(): string

  /**
   * Get the word at cursor (for filtering)
   */
  getWordAtCursor(): { word: string; from: number; to: number } | null
}

// ============================================
// SourceMap Context Port
// ============================================

/**
 * SourceMapContextPort provides AST context for smart completions.
 * Used to determine parent Zag components, available tokens, etc.
 */
export interface SourceMapContextPort {
  /**
   * Find the parent Zag component for the current line
   */
  getParentZagComponent(lineNumber: number): string | null

  /**
   * Get available token names in current scope
   */
  getAvailableTokens(): string[]

  /**
   * Get user-defined component names
   */
  getUserDefinedComponents(): string[]

  /**
   * Get page names defined in source
   */
  getPageNames(): string[]
}

// ============================================
// Completion UI Port
// ============================================

/**
 * CompletionUIPort handles displaying and applying completions.
 * Abstracts CodeMirror completion UI.
 */
export interface CompletionUIPort {
  /**
   * Show completions at current cursor position
   */
  showCompletions(result: AutocompleteResult): void

  /**
   * Hide any visible completions
   */
  hideCompletions(): void

  /**
   * Check if completions are currently visible
   */
  isCompletionsVisible(): boolean

  /**
   * Apply a completion (insert text)
   */
  applyCompletion(completion: Completion, from: number, to: number): void

  /**
   * Subscribe to completion selection events
   */
  onCompletionSelected(handler: (completion: Completion) => void): CleanupFn
}

// ============================================
// Combined Ports
// ============================================

/**
 * All ports required by AutocompleteProvider.
 */
export interface AutocompletePorts {
  editor: EditorContextPort
  sourceMap: SourceMapContextPort
  ui: CompletionUIPort
}

// ============================================
// Autocomplete Request/Result Types
// ============================================

/**
 * Request for completions (used internally)
 */
export interface CompletionRequest {
  /** Line text */
  lineText: string
  /** Cursor column in line */
  cursorColumn: number
  /** Full source code */
  fullSource: string
  /** Current line number (1-indexed) */
  lineNumber: number
  /** Whether this is an explicit request (Ctrl+Space) */
  explicit: boolean
}

/**
 * Configuration for completion behavior
 */
export interface CompletionConfig {
  /** Minimum characters before auto-showing completions */
  minChars?: number
  /** Debounce delay in ms */
  debounceMs?: number
  /** Show completions on typing (vs only explicit) */
  autoShow?: boolean
}

// ============================================
// Provider Interface
// ============================================

/**
 * AutocompleteProvider orchestrates autocomplete using ports.
 * This is the main entry point for the hexagonal architecture.
 */
export interface AutocompleteProvider {
  /**
   * Trigger completion at current cursor position
   */
  triggerCompletion(explicit?: boolean): void

  /**
   * Get completions for a request (for testing)
   */
  getCompletions(request: CompletionRequest): AutocompleteResult

  /**
   * Detect context at current cursor position
   */
  detectContext(): AutocompleteContext

  /**
   * Dispose resources
   */
  dispose(): void
}
