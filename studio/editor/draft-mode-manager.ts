/**
 * Draft Mode Manager
 *
 * Integrates draft mode with AI for code correction and generation.
 *
 * Flow:
 * 1. User types `--` to start a draft block
 * 2. User types code or prompt after `--`
 * 3. User presses Cmd+Enter to submit to AI
 * 4. AI processes and returns corrected/generated code
 * 5. Code replaces the draft block (-- markers removed)
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

// ===========================================
// AI Integration Helper
// ===========================================

/**
 * Build the AI prompt for draft mode processing
 * This creates a marked version of the source that helps the AI understand
 * which code needs to be generated or corrected.
 */
export function buildDraftModePrompt(event: DraftSubmitEvent): string {
  const lines = event.fullSource.split('\n')

  // Build the marked source
  const markedLines = lines.map((line, i) => {
    const lineNum = i + 1
    if (lineNum === event.startLine) {
      const promptSuffix = event.prompt ? `: ${event.prompt}` : ''
      return `--- DRAFT START${promptSuffix} ---`
    }
    if (lineNum === event.endLine && line.trim().match(/^--\s*$/)) {
      return `--- DRAFT END ---`
    }
    return line
  })

  return markedLines.join('\n')
}

/**
 * Extract the replacement code from AI response
 * Handles various response formats from the AI
 */
export function extractCodeFromAIResponse(response: string, indent: number): string {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = response.match(/```(?:mirror)?\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    return normalizeIndentation(codeBlockMatch[1], indent)
  }

  // Try to extract from JSON response
  try {
    const jsonMatch = response.match(/\{[\s\S]*"code"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.code) {
        return normalizeIndentation(parsed.code, indent)
      }
    }
  } catch {
    // Not JSON, continue
  }

  // Assume the entire response is code
  return normalizeIndentation(response.trim(), indent)
}

/**
 * Normalize indentation of code to match the draft block's indentation
 */
function normalizeIndentation(code: string, targetIndent: number): string {
  const lines = code.split('\n')
  if (lines.length === 0) return code

  // Find the minimum indentation in the code
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim()) {
      const match = line.match(/^(\s*)/)
      if (match) {
        minIndent = Math.min(minIndent, match[1].length)
      }
    }
  }

  if (minIndent === Infinity) minIndent = 0

  // Re-indent all lines
  const baseIndent = ' '.repeat(targetIndent)
  return lines
    .map(line => {
      if (!line.trim()) return ''
      const stripped = line.slice(minIndent)
      return baseIndent + stripped
    })
    .join('\n')
}
