/**
 * Draft Mode Manager
 *
 * Integrates draft mode with AI for code correction and generation.
 *
 * Flow:
 * 1. User types `??` to start a draft block
 * 2. User types code or prompt after `??`
 * 3. Either: types closing `??` (auto-submits) or presses Cmd+Enter
 * 4. AI processes and returns corrected/generated code
 * 5. Code replaces the draft block (?? markers removed)
 * 6. Undo restores original state
 */

import { EditorView, keymap } from '@codemirror/view'
import { events } from '../core/events'
import { state } from '../core/state'
import {
  getDraftState,
  prepareDraftSubmit,
  setDraftProcessing,
  replaceDraftBlock,
  cancelDraftProcessing,
  isDraftModeActive,
  draftModeField,
  type DraftSubmitEvent,
  type DraftBlockState,
} from './draft-mode'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('DraftModeManager')

// ===========================================
// Events (added to StudioEvents in events.ts)
// ===========================================

// Draft mode events are defined in events.ts:
// 'draft:submit' - User pressed Cmd+Enter in draft block
// 'draft:completed' - AI processing completed
// 'draft:cancelled' - User cancelled (Escape) or error
// 'draft:processing' - AI is processing

// ===========================================
// Types
// ===========================================

export interface DraftModeManagerConfig {
  /** Get the EditorView instance */
  getEditorView: () => EditorView | null
  /** AI service function that processes draft blocks */
  processWithAI?: (event: DraftSubmitEvent) => Promise<string>
  /** Whether to enable draft mode (default: true) */
  enabled?: boolean
}

export interface DraftModeResult {
  success: boolean
  code?: string
  error?: string
}

// ===========================================
// Default AI Processor (uses events)
// ===========================================

/**
 * Default AI processor that emits events for external handling
 * This allows the Fixer service or other AI services to handle the actual processing
 */
async function defaultProcessWithAI(event: DraftSubmitEvent): Promise<string> {
  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('AI processing timed out'))
    }, 60000) // 60 second timeout

    // Listen for abort
    event.abortController.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new Error('Processing cancelled'))
    })

    // Listen for completion event
    const unsubComplete = events.once('draft:ai-response', ({ code, error }) => {
      clearTimeout(timeoutId)
      if (error) {
        reject(new Error(error))
      } else {
        resolve(code)
      }
    })

    // Emit the submit event for external handling
    events.emit('draft:submit', event)
  })
}

// ===========================================
// Manager Class
// ===========================================

export class DraftModeManager {
  private getEditorView: () => EditorView | null
  private processWithAI: (event: DraftSubmitEvent) => Promise<string>
  private enabled: boolean
  private unsubscribers: (() => void)[] = []

  constructor(config: DraftModeManagerConfig) {
    this.getEditorView = config.getEditorView
    this.processWithAI = config.processWithAI ?? defaultProcessWithAI
    this.enabled = config.enabled ?? true
  }

  /**
   * Start listening to events
   */
  start(): void {
    if (!this.enabled) return

    log.info('DraftModeManager started')
  }

  /**
   * Stop listening and cleanup
   */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []

    // Cancel any active processing
    const view = this.getEditorView()
    if (view && isDraftModeActive(view)) {
      cancelDraftProcessing(view)
    }

    log.info('DraftModeManager stopped')
  }

  /**
   * Handle Cmd+Enter submission
   * This is called by the keymap extension
   */
  async handleSubmit(): Promise<boolean> {
    const view = this.getEditorView()
    if (!view) {
      log.warn('No editor view available')
      return false
    }

    const draftState = getDraftState(view)
    if (!draftState.active) {
      return false // Not in draft mode, let other handlers process
    }

    if (draftState.processing) {
      log.warn('Already processing, ignoring submit')
      return true
    }

    // Prepare the submit event
    const submitEvent = prepareDraftSubmit(view)
    if (!submitEvent) {
      log.warn('Failed to prepare draft submit event')
      return false
    }

    // Set processing state
    setDraftProcessing(view, true, submitEvent.abortController)
    events.emit('draft:processing', { startLine: submitEvent.startLine })

    try {
      // Process with AI
      log.info('Submitting draft block to AI', {
        prompt: submitEvent.prompt,
        startLine: submitEvent.startLine,
        endLine: submitEvent.endLine,
      })

      const result = await this.processWithAI(submitEvent)

      // Replace draft block with AI result
      replaceDraftBlock(view, result)

      events.emit('draft:completed', {
        startLine: submitEvent.startLine,
        endLine: submitEvent.endLine,
        code: result,
      })

      log.info('Draft block replaced with AI result')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Clear processing state but keep draft block
      setDraftProcessing(view, false)

      events.emit('draft:cancelled', {
        startLine: submitEvent.startLine,
        reason: errorMessage,
      })

      log.error('Draft processing failed:', errorMessage)

      // Show notification to user
      events.emit('notification:error', {
        message: `AI Error: ${errorMessage}`,
        duration: 5000,
      })

      return true // We handled the event, even though it failed
    }
  }

  /**
   * Handle Escape to cancel processing
   */
  handleCancel(): boolean {
    const view = this.getEditorView()
    if (!view) return false

    const draftState = getDraftState(view)
    if (!draftState.active || !draftState.processing) {
      return false
    }

    cancelDraftProcessing(view)
    events.emit('draft:cancelled', {
      startLine: draftState.startLine ?? 0,
      reason: 'User cancelled',
    })

    log.info('Draft processing cancelled by user')
    return true
  }

  /**
   * Check if editor is in draft mode
   */
  isActive(): boolean {
    const view = this.getEditorView()
    return view ? isDraftModeActive(view) : false
  }

  /**
   * Get current draft state
   */
  getState(): DraftBlockState | null {
    const view = this.getEditorView()
    return view ? getDraftState(view) : null
  }

  /**
   * Manually provide AI response (for testing or alternative AI integration)
   */
  provideAIResponse(code: string, error?: string): void {
    events.emit('draft:ai-response', { code, error })
  }

  /**
   * Replace the draft block with new content
   * This is useful for testing or manual AI integration
   */
  replaceDraftBlock(content: string): boolean {
    const view = this.getEditorView()
    if (!view) {
      log.warn('No editor view available for replaceDraftBlock')
      return false
    }

    const draftState = getDraftState(view)
    if (!draftState.active) {
      log.warn('No active draft block to replace')
      return false
    }

    replaceDraftBlock(view, content)
    return true
  }
}

// ===========================================
// Keymap Extension
// ===========================================

/**
 * Create a keymap extension for draft mode shortcuts
 * @param manager - The DraftModeManager instance
 */
export function createDraftModeKeymap(manager: DraftModeManager) {
  return keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        // Use async handler through event loop
        manager.handleSubmit().catch(err => {
          log.error('handleSubmit error:', err)
        })
        return manager.isActive()
      },
    },
    {
      key: 'Escape',
      run: () => manager.handleCancel(),
    },
  ])
}

// ===========================================
// Auto-Submit Extension
// ===========================================

/**
 * Create an updateListener extension that auto-submits when a closed
 * `??` block appears in the document.
 *
 * Two flows trigger this:
 *   (1) User types `?? prompt`, then later types closing `??`
 *       — open-block → closed-block transition.
 *   (2) User pastes / inserts a complete `?? prompt ?? ... ??` block in
 *       one go — inactive → closed-block transition. Treated the same:
 *       a fully-formed bookend means the user is asking for AI help.
 *
 * Cmd+Enter remains the fallback for open (unclosed) blocks.
 *
 * @param manager - The DraftModeManager instance
 */
export function createDraftModeAutoSubmit(manager: DraftModeManager) {
  return EditorView.updateListener.of(update => {
    if (!update.docChanged) return

    const oldState = update.startState.field(draftModeField, false)
    const newState = update.state.field(draftModeField, false)
    if (!oldState || !newState) return

    // Required: now have an active, closed block, not currently processing,
    // and the previous state was NOT already a closed block (otherwise typing
    // outside a closed block would re-trigger).
    const newlyClosed =
      newState.active &&
      newState.endLine !== null &&
      !newState.processing &&
      !(oldState.active && oldState.endLine !== null)

    if (!newlyClosed) return

    // Defer to next microtask so the document settles before we read it
    queueMicrotask(() => {
      manager.handleSubmit().catch(err => {
        log.error('auto-submit error:', err)
      })
    })
  })
}

// ===========================================
// Factory & Singleton
// ===========================================

let manager: DraftModeManager | null = null

/**
 * Initialize the draft mode manager
 * Call once during studio bootstrap
 */
export function initDraftModeManager(config: DraftModeManagerConfig): DraftModeManager {
  if (manager) {
    manager.stop()
  }
  manager = new DraftModeManager(config)
  manager.start()
  return manager
}

/**
 * Get the draft mode manager instance
 */
export function getDraftModeManager(): DraftModeManager | null {
  return manager
}

/**
 * Dispose the draft mode manager
 */
export function disposeDraftModeManager(): void {
  if (manager) {
    manager.stop()
    manager = null
  }
}
