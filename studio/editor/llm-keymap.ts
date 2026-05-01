/**
 * LLM-Edit-Flow Keymap.
 *
 * Bindet die User-Interaktionen für den neuen Edit-Flow:
 *   - `Mod-Enter`           → handleEditFlow (Cmd+Enter)
 *   - `Mod-Shift-Enter`     → openPromptField (Cmd+Shift+Enter)
 *   - `Tab` (ghost-active)  → acceptGhost
 *   - `Escape` (ghost-active) → dismissGhost
 *
 * Kein Wrapping, keine Delegation — direkte Bindings. Tab und Escape
 * sind Ghost-gated: wenn kein Ghost aktiv ist, geben sie `false` zurück
 * und CodeMirrors Default-Behavior übernimmt.
 *
 * Die Handler werden via Config injiziert, damit dieses Modul für
 * Phase-3-Schritt-A keine Abhängigkeit auf das spätere `edit-handler.ts`
 * hat.
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Cmd+Enter Flows),
 *        docs/concepts/llm-edit-flow-plan.md (T3.2)
 */

import type { EditorView, KeyBinding } from '@codemirror/view'
import type { EditorState } from '@codemirror/state'
import { ghostDiffField } from './ghost-diff'

export interface LlmEditKeymapConfig {
  /** Mod-Enter handler: starts the edit flow (capture + LLM call). */
  handleEditFlow: (view: EditorView) => boolean
  /** Mod-Shift-Enter handler: opens the inline prompt-field. */
  openPromptField: (view: EditorView) => boolean
  /** Tab handler when a ghost diff is active: accept proposed source. */
  acceptGhost: (view: EditorView) => boolean
  /** Escape handler when a ghost diff is active: dismiss proposed source. */
  dismissGhost: (view: EditorView) => boolean
}

/** Test-friendly state predicate. Returns true iff a ghost diff is active. */
export function isGhostActiveSelector(state: EditorState): boolean {
  // The field may be absent in transient states (e.g., extension swapped out).
  // Use a safe-access pattern.
  try {
    return state.field(ghostDiffField).active
  } catch {
    return false
  }
}

export function llmEditKeymap(config: LlmEditKeymapConfig): readonly KeyBinding[] {
  return [
    {
      key: 'Mod-Enter',
      run: view => config.handleEditFlow(view),
    },
    {
      key: 'Mod-Shift-Enter',
      run: view => config.openPromptField(view),
    },
    {
      key: 'Tab',
      run: view => {
        if (!isGhostActiveSelector(view.state)) return false
        return config.acceptGhost(view)
      },
    },
    {
      key: 'Escape',
      run: view => {
        if (!isGhostActiveSelector(view.state)) return false
        return config.dismissGhost(view)
      },
    },
  ]
}
