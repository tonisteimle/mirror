/**
 * LLM-Edit-Flow Keymap.
 *
 * Bindet die User-Interaktionen für den neuen Edit-Flow:
 *   - `Mod-Enter`           → handleEditFlow (Cmd+Enter)
 *   - `Mod-Shift-Enter`     → openPromptField (Cmd+Shift+Enter)
 *   - `Tab` (ghost-active)  → acceptGhost
 *   - `Escape`              → dismissGhost (cancelt In-Flight oder Ghost)
 *
 * Kein Wrapping, keine Delegation — direkte Bindings. Tab ist Ghost-gated
 * im Keymap; Escape delegiert immer an `dismissGhost`, das selbst
 * entscheidet ob es konsumiert (Ghost active ODER In-Flight) oder die
 * Default-Behavior an CodeMirror weiterreicht (return false).
 *
 * Die Handler werden via Config injiziert, damit dieses Modul für
 * Phase-3-Schritt-A keine Abhängigkeit auf das spätere `edit-handler.ts`
 * hat.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Cmd+Enter Flows),
 *        docs/archive/concepts/llm-edit-flow-plan.md (T3.2)
 */

import type { EditorView, KeyBinding } from '@codemirror/view'
import type { EditorState } from '@codemirror/state'
import { ghostDiffField, getGhostLineSet } from './ghost-diff'

export interface LlmEditKeymapConfig {
  /** Mod-Enter handler: starts the edit flow (capture + LLM call). */
  handleEditFlow: (view: EditorView) => boolean
  /** Mod-Shift-Enter handler: opens the inline prompt-field. */
  openPromptField: (view: EditorView) => boolean
  /**
   * Mod-Alt-Enter handler: starts the two-stage generation pipeline
   * (user-prompt → HTML → Mirror). Opens the inline prompt-field for
   * the user-instruction; pipeline replaces the whole file via ghost-diff.
   */
  generateFromPrompt: (view: EditorView) => boolean
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

/**
 * Tab-accept gating predicate.
 *
 * When the user is mid-typing and a ghost-diff appears, pressing Tab
 * to indent should NOT silently accept the AI proposal. The proposal
 * is accepted only when the cursor sits in the diff zone — the lines
 * that the ghost overlay actually marks (removed lines + add-widget
 * anchors). Anywhere else, return false so CodeMirror's default Tab
 * binding (indent / autocomplete) runs.
 */
export function isCursorInGhostRange(state: EditorState): boolean {
  if (!isGhostActiveSelector(state)) return false
  let ghost
  try {
    ghost = state.field(ghostDiffField)
  } catch {
    return false
  }
  if (!ghost.active) return false
  const cursorPos = state.selection.main.head
  const cursorLine = state.doc.lineAt(cursorPos).number
  const ghostLines = getGhostLineSet(ghost.baseSource, ghost.newSource, state.doc)
  return ghostLines.has(cursorLine)
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
      key: 'Mod-Alt-Enter',
      run: view => config.generateFromPrompt(view),
    },
    {
      key: 'Tab',
      run: view => {
        // Two gates: (1) ghost must be active, (2) cursor must be on
        // a line the ghost overlay touches. Without (2) Tab would
        // silently swallow indent presses in unchanged code regions.
        if (!isCursorInGhostRange(view.state)) return false
        return config.acceptGhost(view)
      },
    },
    {
      // Escape ist NICHT Ghost-gated im Keymap — `dismissGhost` selbst
      // entscheidet, ob die Tasten-Aktion konsumiert wird. Das deckt
      // sowohl Ghost-active als auch In-Flight (während "thinking") ab.
      key: 'Escape',
      run: view => config.dismissGhost(view),
    },
  ]
}
