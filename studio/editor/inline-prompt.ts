/**
 * Inline Prompt for Mirror Editor
 *
 * Allows users to type `/prompt` directly in the editor.
 * Shows a status line below the prompt while processing.
 * Replaces the prompt with generated code on success.
 *
 * Usage:
 *   /roter löschen button<Enter>
 *   ⏳ Generiere Code...
 *   ✓ DangerButton erstellt
 *   → Code replaces the prompt
 */

import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  keymap
} from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import type { FixerResponse } from '../agent/types'

// ============================================
// CONSTANTS
// ============================================

const MAX_PROMPT_LENGTH = 2000
const CODE_REPLACEMENT_DELAY = 1500

// ============================================
// TYPES
// ============================================

export type PromptStatus = 'idle' | 'pending' | 'success' | 'error'

export interface InlinePromptState {
  status: PromptStatus
  line: number           // Line where prompt was entered
  prompt: string         // The prompt text (without /)
  message: string        // Status message to display
  response?: FixerResponse
  timeoutId?: number     // For cleanup
}

export interface InlinePromptConfig {
  /** Called when user submits a prompt */
  onSubmit: (prompt: string, line: number, view: EditorView) => Promise<FixerResponse | null>
  /** Called when prompt is cancelled */
  onCancel?: () => void
}

// ============================================
// STATE EFFECTS
// ============================================

const setPromptState = StateEffect.define<InlinePromptState | null>()
const updatePromptStatus = StateEffect.define<{
  status: PromptStatus
  message: string
  response?: FixerResponse
  timeoutId?: number
}>()

// ============================================
// STATUS WIDGET
// ============================================

class StatusWidget extends WidgetType {
  constructor(
    readonly status: PromptStatus,
    readonly message: string
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'inline-prompt-status'
    wrapper.setAttribute('data-status', this.status)

    const icon = document.createElement('span')
    icon.className = 'inline-prompt-icon'

    switch (this.status) {
      case 'pending':
        icon.textContent = '⏳'
        icon.classList.add('spinning')
        break
      case 'success':
        icon.textContent = '✓'
        break
      case 'error':
        icon.textContent = '✗'
        break
      default:
        icon.textContent = ''
    }

    const text = document.createElement('span')
    text.className = 'inline-prompt-message'
    text.textContent = this.message

    wrapper.appendChild(icon)
    wrapper.appendChild(text)

    return wrapper
  }

  eq(other: StatusWidget): boolean {
    return other.status === this.status && other.message === this.message
  }

  ignoreEvent(): boolean {
    return true
  }
}

// ============================================
// STATE FIELD
// ============================================

const promptStateField = StateField.define<InlinePromptState | null>({
  create() {
    return null
  },

  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setPromptState)) {
        // Cleanup timeout when clearing state
        if (state?.timeoutId && effect.value === null) {
          window.clearTimeout(state.timeoutId)
        }
        return effect.value
      }
      if (effect.is(updatePromptStatus) && state) {
        return {
          ...state,
          status: effect.value.status,
          message: effect.value.message,
          response: effect.value.response,
          timeoutId: effect.value.timeoutId ?? state.timeoutId
        }
      }
    }
    return state
  }
})

// ============================================
// DECORATION FIELD
// ============================================

const promptDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },

  update(decorations, tr) {
    const state = tr.state.field(promptStateField)

    if (!state || state.status === 'idle') {
      return Decoration.none
    }

    // Create decoration at end of prompt line
    try {
      const lineCount = tr.state.doc.lines
      if (state.line < 1 || state.line > lineCount) {
        return Decoration.none
      }

      const line = tr.state.doc.line(state.line)
      const widget = Decoration.widget({
        widget: new StatusWidget(state.status, state.message),
        side: 1, // After the line
        block: true
      })

      return Decoration.set([widget.range(line.to)])
    } catch {
      return Decoration.none
    }
  },

  provide: f => EditorView.decorations.from(f)
})

// ============================================
// PROMPT DETECTION & VALIDATION
// ============================================

/**
 * Check if a line is a prompt line (starts with /)
 */
function isPromptLine(line: string): boolean {
  const trimmed = line.trimStart()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')  // Exclude comments
}

/**
 * Extract prompt text from a line
 */
function extractPrompt(line: string): string {
  const match = line.match(/^\s*\/(.*)$/)
  return match ? match[1].trim() : ''
}

/**
 * Validate prompt text
 */
function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.length === 0) {
    return { valid: false, error: 'Prompt ist leer' }
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt zu lang (max ${MAX_PROMPT_LENGTH} Zeichen)` }
  }

  // Check for printable characters only (allow unicode for German umlauts etc.)
  if (!/^[\p{L}\p{N}\p{P}\p{S}\s]+$/u.test(prompt)) {
    return { valid: false, error: 'Prompt enthält ungültige Zeichen' }
  }

  return { valid: true }
}

/**
 * Get indentation of a line
 */
function getIndent(line: string): string {
  const match = line.match(/^(\s*)/)
  return match ? match[1] : ''
}

// ============================================
// KEYMAP
// ============================================

function createPromptKeymap(config: InlinePromptConfig) {
  return keymap.of([
    {
      key: 'Enter',
      run(view) {
        const editorState = view.state
        const promptState = editorState.field(promptStateField)

        // FIX #1: Prevent multiple concurrent prompts (Race Condition)
        if (promptState && promptState.status === 'pending') {
          return true // Already processing, ignore
        }

        const { from } = editorState.selection.main

        // Get current line
        const line = editorState.doc.lineAt(from)
        const lineText = line.text

        // Check if this is a prompt line
        if (!isPromptLine(lineText)) {
          return false // Let default Enter handling continue
        }

        const prompt = extractPrompt(lineText)

        // FIX #5: Input validation
        const validation = validatePrompt(prompt)
        if (!validation.valid) {
          if (validation.error) {
            // FIX: Track auto-clear timeout to prevent race conditions
            const errorTimeoutId = window.setTimeout(() => {
              const currentState = view.state.field(promptStateField)
              if (currentState?.status === 'error' && currentState?.timeoutId === errorTimeoutId) {
                view.dispatch({ effects: setPromptState.of(null) })
              }
            }, 3000)

            view.dispatch({
              effects: setPromptState.of({
                status: 'error',
                line: line.number,
                prompt: prompt || '',
                message: validation.error,
                timeoutId: errorTimeoutId
              })
            })
            return true
          }
          return false // Empty prompt, let Enter continue
        }

        // Start processing
        view.dispatch({
          effects: setPromptState.of({
            status: 'pending',
            line: line.number,
            prompt,
            message: 'Generiere Code...'
          })
        })

        // Call the submit handler
        handlePromptSubmit(view, config, prompt, line.number, getIndent(lineText))

        return true // Handled
      }
    },
    {
      key: 'Escape',
      run(view) {
        const promptState = view.state.field(promptStateField)
        if (promptState && promptState.status !== 'idle') {
          // FIX #2: Cleanup timeout when cancelling
          if (promptState.timeoutId) {
            window.clearTimeout(promptState.timeoutId)
          }
          // Cancel current prompt
          view.dispatch({
            effects: setPromptState.of(null)
          })
          config.onCancel?.()
          return true
        }
        return false
      }
    }
  ])
}

// ============================================
// PROMPT HANDLER
// ============================================

async function handlePromptSubmit(
  view: EditorView,
  config: InlinePromptConfig,
  prompt: string,
  lineNumber: number,
  indent: string
) {
  try {
    // Call the fixer
    const response = await config.onSubmit(prompt, lineNumber, view)

    // Check if view is still valid (user might have closed editor)
    if (view.state.field(promptStateField) === null) {
      return // Was cancelled
    }

    if (!response) {
      view.dispatch({
        effects: updatePromptStatus.of({
          status: 'error',
          message: 'Keine Antwort erhalten'
        })
      })
      return
    }

    // Success - show message
    const changedFiles = response.changes.map(c => c.file).join(', ')
    const message = response.explanation || `Geändert: ${changedFiles}`

    // FIX #2: Track timeout for cleanup
    const timeoutId = window.setTimeout(() => {
      replacePromptWithCode(view, lineNumber, response, indent)
    }, CODE_REPLACEMENT_DELAY)

    view.dispatch({
      effects: updatePromptStatus.of({
        status: 'success',
        message,
        response,
        timeoutId
      })
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Verarbeitung'

    // FIX: Track auto-clear timeout for error state
    const errorTimeoutId = window.setTimeout(() => {
      const currentState = view.state.field(promptStateField)
      if (currentState?.status === 'error' && currentState?.timeoutId === errorTimeoutId) {
        view.dispatch({ effects: setPromptState.of(null) })
      }
    }, 5000) // Longer timeout for submission errors

    view.dispatch({
      effects: updatePromptStatus.of({
        status: 'error',
        message: errorMessage,
        timeoutId: errorTimeoutId
      })
    })
  }
}

// ============================================
// CODE REPLACEMENT
// ============================================

function replacePromptWithCode(
  view: EditorView,
  lineNumber: number,
  response: FixerResponse,
  indent: string
) {
  // Check if state is still valid
  const currentState = view.state.field(promptStateField)
  if (!currentState || currentState.status !== 'success') {
    return // Was cancelled or changed
  }

  // Find the code change for the current file
  // (other file changes are handled by the CodeApplicator)
  const currentFileChange = response.changes.find(c =>
    c.action === 'insert' && c.position?.line === lineNumber
  )

  try {
    // FIX #9: Validate line still exists
    const lineCount = view.state.doc.lines
    if (lineNumber < 1 || lineNumber > lineCount) {
      console.warn('[InlinePrompt] Line no longer exists:', lineNumber)
      view.dispatch({
        effects: setPromptState.of(null)
      })
      return
    }

    const line = view.state.doc.line(lineNumber)

    // Verify this is still a prompt line (user might have edited)
    if (!isPromptLine(line.text)) {
      console.warn('[InlinePrompt] Line is no longer a prompt:', line.text)
      view.dispatch({
        effects: setPromptState.of(null)
      })
      return
    }

    if (currentFileChange) {
      // Replace prompt line with generated code
      const indentedCode = currentFileChange.code
        .split('\n')
        .map((l, i) => {
          if (l.trim() === '') return '' // Keep empty lines empty
          return i === 0 ? indent + l.trimStart() : indent + l.trimStart()
        })
        .join('\n')

      view.dispatch({
        changes: {
          from: line.from,
          to: line.to,
          insert: indentedCode
        },
        effects: setPromptState.of(null)
      })
    } else {
      // No insert for current file, just remove the prompt line
      const to = line.to < view.state.doc.length ? line.to + 1 : line.to
      view.dispatch({
        changes: {
          from: line.from,
          to,
          insert: ''
        },
        effects: setPromptState.of(null)
      })
    }
  } catch (error) {
    console.error('[InlinePrompt] Error replacing code:', error)
    // Clear state on error
    view.dispatch({
      effects: setPromptState.of(null)
    })
  }
}

// ============================================
// EXTENSION
// ============================================

/**
 * Create the inline prompt extension
 */
export function inlinePromptExtension(config: InlinePromptConfig) {
  return [
    promptStateField,
    promptDecorations,
    createPromptKeymap(config)
  ]
}

// ============================================
// STYLES (to be added to CSS)
// ============================================

export const inlinePromptStyles = `
.inline-prompt-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 4px 24px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--bg-panel);
  border-left: 2px solid var(--border-default);
  margin-left: 4px;
}

.inline-prompt-status[data-status="pending"] {
  color: var(--color-info);
  border-left-color: var(--color-info);
}

.inline-prompt-status[data-status="success"] {
  color: var(--color-success);
  border-left-color: var(--color-success);
}

.inline-prompt-status[data-status="error"] {
  color: var(--color-error);
  border-left-color: var(--color-error);
}

.inline-prompt-icon {
  font-size: 14px;
}

.inline-prompt-icon.spinning {
  animation: inline-prompt-spin 1s linear infinite;
}

@keyframes inline-prompt-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.inline-prompt-message {
  flex: 1;
}
`
