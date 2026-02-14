/**
 * Intent History Module
 *
 * Provides undo/redo functionality for AI-generated intent changes.
 * Stores snapshots of intents with metadata about what changed.
 */

import type { Intent } from './schema'

// =============================================================================
// Types
// =============================================================================

export interface HistoryEntry {
  /** The intent state at this point */
  intent: Intent
  /** Timestamp when this entry was created */
  timestamp: number
  /** Description of what changed (from user request or auto-generated) */
  description: string
  /** The user request that led to this change */
  userRequest?: string
}

export interface IntentHistory {
  /** Past states (for undo) */
  past: HistoryEntry[]
  /** Current state */
  present: HistoryEntry | null
  /** Future states (for redo) */
  future: HistoryEntry[]
  /** Maximum number of entries to keep */
  maxEntries: number
}

// =============================================================================
// History Management
// =============================================================================

/**
 * Creates a new empty history
 */
export function createHistory(maxEntries: number = 50): IntentHistory {
  return {
    past: [],
    present: null,
    future: [],
    maxEntries
  }
}

/**
 * Initializes history with an initial intent
 */
export function initHistory(
  history: IntentHistory,
  intent: Intent,
  description: string = 'Initial state'
): IntentHistory {
  return {
    ...history,
    present: {
      intent: JSON.parse(JSON.stringify(intent)), // Deep clone
      timestamp: Date.now(),
      description
    },
    past: [],
    future: []
  }
}

/**
 * Pushes a new intent state to history
 */
export function pushHistory(
  history: IntentHistory,
  intent: Intent,
  description: string,
  userRequest?: string
): IntentHistory {
  const newEntry: HistoryEntry = {
    intent: JSON.parse(JSON.stringify(intent)), // Deep clone
    timestamp: Date.now(),
    description,
    userRequest
  }

  // Move present to past
  const newPast = history.present
    ? [...history.past, history.present]
    : history.past

  // Trim past if exceeds max
  const trimmedPast = newPast.slice(-history.maxEntries)

  return {
    ...history,
    past: trimmedPast,
    present: newEntry,
    future: [] // Clear redo stack on new action
  }
}

/**
 * Undoes the last change
 */
export function undo(history: IntentHistory): IntentHistory {
  if (history.past.length === 0 || !history.present) {
    return history // Nothing to undo
  }

  const newPast = [...history.past]
  const previous = newPast.pop()!

  return {
    ...history,
    past: newPast,
    present: previous,
    future: [history.present, ...history.future]
  }
}

/**
 * Redoes the last undone change
 */
export function redo(history: IntentHistory): IntentHistory {
  if (history.future.length === 0 || !history.present) {
    return history // Nothing to redo
  }

  const newFuture = [...history.future]
  const next = newFuture.shift()!

  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future: newFuture
  }
}

/**
 * Gets the current intent from history
 */
export function getCurrentIntent(history: IntentHistory): Intent | null {
  return history.present?.intent || null
}

/**
 * Checks if undo is available
 */
export function canUndo(history: IntentHistory): boolean {
  return history.past.length > 0
}

/**
 * Checks if redo is available
 */
export function canRedo(history: IntentHistory): boolean {
  return history.future.length > 0
}

/**
 * Gets a summary of recent changes for context
 */
export function getRecentChanges(history: IntentHistory, count: number = 5): string[] {
  const entries = [
    ...history.past.slice(-count),
    history.present
  ].filter(Boolean) as HistoryEntry[]

  return entries.map(e => e.description)
}

/**
 * Gets the history as a conversation-like summary
 */
export function getHistoryContext(history: IntentHistory, count: number = 3): string {
  const entries = history.past.slice(-count)

  if (entries.length === 0) {
    return ''
  }

  const lines = entries.map(entry => {
    if (entry.userRequest) {
      return `- User: "${entry.userRequest}" → ${entry.description}`
    }
    return `- ${entry.description}`
  })

  return `## Letzte Änderungen\n${lines.join('\n')}`
}
