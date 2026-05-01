/**
 * Edit-Handler — der Glue zwischen llm-keymap und edit-flow.
 *
 * Verbindet:
 *   captureCtx → runEditFlow → ghost-diff/status-indicator
 *   acceptGhost → doc-replace
 *   dismissGhost → abort + clear
 *   openPromptField → user instruction → captureCtx → runEditFlow
 *
 * `createEditHandler(config)` ist eine Fabrik: jeder Aufruf erzeugt eine
 * eigene AbortController-Slot und (default) einen eigenen ChangeTracker.
 * Das macht das Modul testbar (mehrere parallele Tests) und passt zur
 * Singleton-Verwendung in `bootstrap.ts` (ein Handler pro Editor-Instanz).
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Sequenzen),
 *        docs/concepts/llm-edit-flow-plan.md (T3.5)
 */

import type { EditorView } from '@codemirror/view'
import { ghostDiffField, setGhostDiff, clearGhostDiffEffect } from './ghost-diff'
import { setEditStatus, hideEditStatus } from './edit-status-indicator'
import {
  openPromptField as defaultOpenPromptField,
  type PromptFieldHandle,
  type PromptFieldOptions,
} from './prompt-field'
import { runEditFlow as defaultRunEditFlow, type EditResult } from '../agent/edit-flow'
import type { EditCaptureCtx } from '../agent/edit-prompts'
import { createChangeTracker, type ChangeTracker } from '../agent/change-tracker'

export interface EditHandlerConfig {
  /** Returns the project's tokens + components for prompt injection. */
  getProjectFiles: () => {
    tokens: Record<string, string>
    components: Record<string, string>
  }
  /** Returns the file name of the currently active file (used as tracker key). */
  getCurrentFileName: () => string
  /** Test seam — defaults to the production runEditFlow. */
  runEditFlow?: typeof defaultRunEditFlow
  /** Test seam — defaults to the production openPromptField. */
  openPromptField?: (view: EditorView, options: PromptFieldOptions) => PromptFieldHandle
  /** Test seam — defaults to a fresh tracker per handler instance. */
  changeTracker?: ChangeTracker
}

export interface EditHandlerHandlers {
  handleEditFlow: (view: EditorView) => boolean
  openPromptField: (view: EditorView) => boolean
  acceptGhost: (view: EditorView) => boolean
  dismissGhost: (view: EditorView) => boolean
}

export function createEditHandler(config: EditHandlerConfig): EditHandlerHandlers {
  const tracker = config.changeTracker ?? createChangeTracker()
  const runEditFlow = config.runEditFlow ?? defaultRunEditFlow
  const openPromptField = config.openPromptField ?? defaultOpenPromptField

  let currentAbort: AbortController | null = null

  const captureCtx = (view: EditorView, instruction: string | null): EditCaptureCtx => {
    const state = view.state
    const head = state.selection.main.head
    const line = state.doc.lineAt(head)
    const sel = state.selection.main
    const fileName = config.getCurrentFileName()
    const source = state.doc.toString()
    return {
      source,
      fileName,
      cursor: { line: line.number, col: head - line.from + 1 },
      selection: sel.empty
        ? null
        : {
            from: sel.from,
            to: sel.to,
            text: state.doc.sliceString(sel.from, sel.to),
          },
      instruction,
      diffSinceLastCall: tracker.getDiffSinceLastCall(fileName, source),
      projectFiles: config.getProjectFiles(),
    }
  }

  const runFlow = async (view: EditorView, ctx: EditCaptureCtx) => {
    if (currentAbort) currentAbort.abort()
    const ctrl = new AbortController()
    currentAbort = ctrl

    setEditStatus('thinking')

    let result: EditResult
    try {
      result = await runEditFlow(ctx, { signal: ctrl.signal })
    } catch (err) {
      // If we were superseded, the new call has already taken over.
      if (currentAbort !== ctrl) return
      currentAbort = null
      if (isAbortError(err)) {
        // The user cancelled; clear status quietly.
        hideEditStatus()
        return
      }
      setEditStatus('error', errorMessage(err))
      return
    }

    if (currentAbort !== ctrl) return // superseded
    currentAbort = null

    handleResult(view, ctx.source, result)
  }

  const handleResult = (view: EditorView, baseSource: string, result: EditResult) => {
    if (result.status === 'ready' && result.proposedSource !== undefined) {
      setGhostDiff(view, baseSource, result.proposedSource)
      setEditStatus('ready')
    } else if (result.status === 'no-change') {
      hideEditStatus()
    } else {
      setEditStatus('error', result.error ?? 'Unbekannter Fehler')
    }
  }

  return {
    handleEditFlow(view) {
      const ctx = captureCtx(view, null)
      void runFlow(view, ctx)
      return true
    },

    openPromptField(view) {
      openPromptField(view, {
        onSubmit: instruction => {
          const ctx = captureCtx(view, instruction)
          void runFlow(view, ctx)
        },
        onCancel: () => {
          // No-op; the widget already removed itself.
        },
      })
      return true
    },

    acceptGhost(view) {
      const ghost = view.state.field(ghostDiffField)
      if (!ghost.active) return false
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: ghost.newSource },
        effects: clearGhostDiffEffect.of(undefined),
      })
      hideEditStatus()
      return true
    },

    dismissGhost(view) {
      const ghost = view.state.field(ghostDiffField)
      const hasInflight = currentAbort !== null
      if (!ghost.active && !hasInflight) return false
      if (currentAbort) {
        currentAbort.abort()
        currentAbort = null
      }
      if (ghost.active) {
        view.dispatch({ effects: clearGhostDiffEffect.of(undefined) })
      }
      hideEditStatus()
      return true
    },
  }
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  )
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
