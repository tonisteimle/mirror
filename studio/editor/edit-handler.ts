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

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { ghostDiffField, setGhostDiff, clearGhostDiffEffect } from './ghost-diff'
import { setEditStatus, hideEditStatus } from './edit-status-indicator'
import {
  openPromptField as defaultOpenPromptField,
  type PromptFieldHandle,
  type PromptFieldOptions,
} from './prompt-field'
import {
  runEditFlow as defaultRunEditFlow,
  type EditResult,
  type QualityViolations,
} from '../agent/edit-flow'
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
  /**
   * Wenn true, hängt der Handler an Edit-Flows mit Quality-Violations einen
   * 2. LLM-Call dran (siehe `RunEditFlowOptions.qualityRetry`). Das verbessert
   * Idiom-Compliance, kostet aber Latenz wenn der Erstpass Violations
   * hinterlassen hat. Default: true. Auf false setzen, wenn der Caller
   * Latenz absolut priorisiert.
   */
  qualityRetry?: boolean
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
  /**
   * Editor extension that hides the status indicator when the ghost
   * auto-discards due to a direct edit (docChanged → ghostDiffField
   * cleared). Wire alongside `ghostDiffExtension()` and `llmEditKeymap`.
   */
  ghostDiscardOnEditExtension: Extension
}

export function createEditHandler(config: EditHandlerConfig): EditHandlerHandlers {
  const tracker = config.changeTracker ?? createChangeTracker()
  const runEditFlow = config.runEditFlow ?? defaultRunEditFlow
  const openPromptField = config.openPromptField ?? defaultOpenPromptField
  const qualityRetry = config.qualityRetry ?? true

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
      result = await runEditFlow(ctx, { signal: ctrl.signal, qualityRetry })
    } catch (err) {
      // currentAbort is always reset before the rejection arrives here:
      //   - supersede: a new call set currentAbort = ctrl_new.
      //   - dismissGhost: currentAbort was set to null + status hidden.
      // In both cases the catch is a no-op and we return early. The only
      // remaining path to error reporting is a non-abort throw from the
      // bridge — handled below.
      if (currentAbort !== ctrl) return
      currentAbort = null
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
      const issues = countQualityIssues(result.qualityViolations)
      setEditStatus(
        'ready',
        issues > 0
          ? `Tab akzeptieren · Esc verwerfen · ⚠ ${issues} Quality-${issues === 1 ? 'Issue' : 'Issues'}`
          : undefined
      )
    } else if (result.status === 'no-change') {
      const issues = countQualityIssues(result.qualityViolations)
      if (issues > 0) {
        // The LLM stayed silent but the source still has token/component/
        // redundancy violations — surface them so the user knows the call
        // wasn't a thumbs-up but a missed opportunity.
        setEditStatus(
          'warning',
          `⚠ ${issues} Quality-${issues === 1 ? 'Issue' : 'Issues'} — vom AI nicht behoben`
        )
      } else {
        hideEditStatus()
      }
    } else {
      setEditStatus('error', result.error)
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

    ghostDiscardOnEditExtension: EditorView.updateListener.of(update => {
      if (!update.docChanged) return
      // Distinguish auto-discard (typing while ghost active) from
      // explicit accept/dismiss (which dispatch clearGhostDiffEffect
      // alongside the change). When the user typed, no clear effect
      // is in the transaction — the StateField cleared the ghost on
      // its own.
      const hadClearEffect = update.transactions.some(t =>
        t.effects.some(e => e.is(clearGhostDiffEffect))
      )
      if (hadClearEffect) return
      const wasActive = update.startState.field(ghostDiffField).active
      const isActive = update.state.field(ghostDiffField).active
      if (wasActive && !isActive) {
        hideEditStatus()
      }
    }),
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function countQualityIssues(v: QualityViolations | undefined): number {
  if (!v) return 0
  return v.token.length + v.component.length + v.redundancy.length
}
