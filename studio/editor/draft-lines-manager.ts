/**
 * Draft Lines Manager
 *
 * Integrates draft lines visual feedback with the editor and compilation flow.
 *
 * Flow:
 * 1. User types → source changes → new/changed lines marked as draft (muted)
 * 2. Compilation completes successfully → lines become validated (bright)
 * 3. Already validated lines stay bright when new code is typed
 */

import { EditorView } from '@codemirror/view'
import { events } from '../core/events'
import { state, actions } from '../core/state'
import { detectDraftLines, setDraftLines, clearDraftLines } from './draft-lines'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('DraftLinesManager')

export interface DraftLinesManagerConfig {
  /** Get the EditorView instance */
  getEditorView: () => EditorView | null
  /** Whether to enable draft lines (default: true) */
  enabled?: boolean
}

export class DraftLinesManager {
  private getEditorView: () => EditorView | null
  private enabled: boolean
  private unsubscribers: (() => void)[] = []

  constructor(config: DraftLinesManagerConfig) {
    this.getEditorView = config.getEditorView
    this.enabled = config.enabled ?? true
  }

  /**
   * Start listening to events and managing draft lines
   */
  start(): void {
    if (!this.enabled) return

    // Listen to source changes from editor
    const unsubSource = events.on('source:changed', this.handleSourceChanged)
    this.unsubscribers.push(unsubSource)

    // Listen to compilation completion
    const unsubCompile = events.on('compile:completed', this.handleCompileCompleted)
    this.unsubscribers.push(unsubCompile)

    log.info('DraftLinesManager started')
  }

  /**
   * Stop listening and cleanup
   */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []

    // Clear any remaining draft lines
    const view = this.getEditorView()
    if (view) {
      clearDraftLines(view)
    }

    log.info('DraftLinesManager stopped')
  }

  /**
   * Handle source content changes
   */
  private handleSourceChanged = (event: { source: string; origin: string }): void => {
    // Only process editor-originated changes (user typing)
    if (event.origin !== 'editor') return

    const view = this.getEditorView()
    if (!view) return

    const currentState = state.get()
    const validatedSource = currentState.validatedSource

    // Detect which lines differ from validated content
    const draftLineNumbers = detectDraftLines(event.source, validatedSource)

    if (draftLineNumbers.size > 0) {
      setDraftLines(view, draftLineNumbers)
      log.debug(`Marked ${draftLineNumbers.size} lines as draft`)
    } else {
      clearDraftLines(view)
    }
  }

  /**
   * Handle successful compilation
   */
  private handleCompileCompleted = (event: {
    hasErrors: boolean
    ast: unknown
    ir: unknown
    sourceMap: unknown
    version: number
  }): void => {
    // Only update validated source if no errors
    if (event.hasErrors) {
      log.debug('Compilation has errors, keeping draft lines')
      return
    }

    const view = this.getEditorView()
    if (!view) return

    // Get current source and mark it as validated
    const currentSource = state.get().source

    // Update validated source in state
    state.set({ validatedSource: currentSource })

    // Clear all draft line decorations (all lines now validated)
    clearDraftLines(view)

    log.debug('Compilation successful, cleared draft lines')
  }

  /**
   * Manually mark specific lines as draft
   * Useful for AI-assisted editing where we know which lines are pending
   */
  markLinesAsDraft(lineNumbers: Set<number>): void {
    const view = this.getEditorView()
    if (!view) return

    setDraftLines(view, lineNumbers)
  }

  /**
   * Manually clear all draft lines
   * Useful for AI validation completion
   */
  clearAllDraftLines(): void {
    const view = this.getEditorView()
    if (!view) return

    clearDraftLines(view)
  }

  /**
   * Get current draft line numbers
   */
  getDraftLines(): Set<number> {
    const currentSource = state.get().source
    const validatedSource = state.get().validatedSource
    return detectDraftLines(currentSource, validatedSource)
  }
}

// Singleton instance
let manager: DraftLinesManager | null = null

/**
 * Initialize the draft lines manager
 * Call once during studio bootstrap
 */
export function initDraftLinesManager(config: DraftLinesManagerConfig): DraftLinesManager {
  if (manager) {
    manager.stop()
  }
  manager = new DraftLinesManager(config)
  manager.start()
  return manager
}

/**
 * Get the draft lines manager instance
 */
export function getDraftLinesManager(): DraftLinesManager | null {
  return manager
}

/**
 * Dispose the draft lines manager
 */
export function disposeDraftLinesManager(): void {
  if (manager) {
    manager.stop()
    manager = null
  }
}
