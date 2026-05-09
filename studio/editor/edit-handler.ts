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
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Sequenzen),
 *        docs/archive/concepts/llm-edit-flow-plan.md (T3.5)
 */

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { ghostDiffField, setGhostDiff, clearGhostDiffEffect } from './ghost-diff'
import { setEditStatus, hideEditStatus } from './edit-status-indicator'
import { findSketchBlocks } from '../agent/sketch-blocks'
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
import { computeLineDiff } from '../agent/source-diff'
import type { EditCaptureCtx } from '../agent/edit-prompts'
import { createChangeTracker, type ChangeTracker } from '../agent/change-tracker'
import {
  runGenerationPipeline as defaultRunGenerationPipeline,
  type GenerationPipelineResult,
  type GenerationPipelineStepEvent,
} from '../agent/generation-pipeline'

export interface EditHandlerConfig {
  /**
   * Returns all sibling files in the project (everything except the
   * currently-active file). Multi-File-Roadmap: Mirror is extension-
   * agnostic — the LLM reads each sibling and figures out from content
   * whether it contains tokens, components, data, or layouts.
   */
  getProjectFiles: () => Record<string, string>
  /** Returns the file name of the currently active file (used as tracker key). */
  getCurrentFileName: () => string
  /**
   * Multi-File-Roadmap 6b: writes a sibling file's new content. Called
   * when the user accepts a ghost-diff that originated from a cross-file
   * patch (the active file is committed via the editor doc; siblings need
   * an out-of-band write). Optional — if missing, cross-file patches
   * still ghost-diff the active file but sibling changes are silently
   * dropped. Wire to whatever your storage layer uses (Tauri save,
   * localStorage, etc.).
   */
  saveSiblingFile?: (filename: string, content: string) => void | Promise<void>
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
  /** Test seam — defaults to the production runGenerationPipeline. */
  runGenerationPipeline?: typeof defaultRunGenerationPipeline
}

export interface EditHandlerHandlers {
  handleEditFlow: (view: EditorView) => boolean
  openPromptField: (view: EditorView) => boolean
  /**
   * Two-stage generation pipeline (Mod-Alt-Enter): user-prompt → HTML →
   * Mirror. Opens the inline prompt-field for instruction; replaces the
   * whole file via ghost-diff. If the editor is non-empty, its content
   * is passed to the pipeline as a sketch to interpret-and-polish.
   */
  generateFromPrompt: (view: EditorView) => boolean
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
  const runGenerationPipeline = config.runGenerationPipeline ?? defaultRunGenerationPipeline
  const qualityRetry = config.qualityRetry ?? true

  let currentAbort: AbortController | null = null
  // Multi-File-Roadmap 6b: holds the other-file changes from the most
  // recent successful edit-flow until the user accepts (commit via
  // saveSiblingFile) or dismisses (drop). Cleared on every new flow,
  // accept, dismiss, or auto-discard.
  let pendingOtherFileChanges: Record<string, string> | null = null

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
      siblings: config.getProjectFiles(),
    }
  }

  const runFlow = async (view: EditorView, ctx: EditCaptureCtx) => {
    if (currentAbort) currentAbort.abort()
    const ctrl = new AbortController()
    currentAbort = ctrl
    // A new flow invalidates any prior pending sibling changes — those
    // belonged to a ghost-diff that the user is now superseding.
    pendingOtherFileChanges = null

    // Pre-flight: when the source carries `-- ... --` sketch blocks, the
    // status message gets concrete so the user sees the system understood
    // their intent before the LLM round-trip even starts.
    const sketchBlocks = findSketchBlocks(ctx.source)
    if (sketchBlocks.length > 0) {
      const label =
        sketchBlocks.length === 1
          ? 'Übersetze Sketch…'
          : `Übersetze ${sketchBlocks.length} Sketches…`
      setEditStatus('thinking', label)
    } else {
      setEditStatus('thinking')
    }

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
      // Multi-File-Roadmap 6b: stash sibling writes to commit on accept.
      pendingOtherFileChanges =
        result.otherFileChanges && Object.keys(result.otherFileChanges).length > 0
          ? result.otherFileChanges
          : null
      const issues = countQualityIssues(result.qualityViolations)
      const otherCount = pendingOtherFileChanges ? Object.keys(pendingOtherFileChanges).length : 0
      const activeHunks = computeLineDiff(baseSource, result.proposedSource).length
      setEditStatus('ready', buildReadyHint(activeHunks, otherCount, issues))
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

  const runGenerationFlow = async (view: EditorView, instruction: string) => {
    if (currentAbort) currentAbort.abort()
    const ctrl = new AbortController()
    currentAbort = ctrl

    const baseSource = view.state.doc.toString()

    setEditStatus('thinking', 'AI denkt nach…')

    let result: GenerationPipelineResult
    try {
      result = await runGenerationPipeline(
        {
          userPrompt: instruction,
          // If the editor already has Mirror content, treat it as a sketch
          // for the pipeline to interpret and polish. Empty editor → pure
          // prompt-driven generation.
          sketch: baseSource.trim() === '' ? undefined : baseSource,
          // Project context flows into both stages: HTML stage uses it to
          // honor existing tokens (matching :root custom properties),
          // translator uses it to reuse existing component definitions.
          // Without this, the user-facing pipeline invents a parallel
          // palette regardless of what tokens.tok defines.
          siblings: config.getProjectFiles(),
        },
        {
          signal: ctrl.signal,
          onStep: (event: GenerationPipelineStepEvent) => {
            // Suppress phase updates if we've been superseded — otherwise
            // a stale call's progress message could overwrite the new
            // call's status.
            if (currentAbort !== ctrl) return
            switch (event.kind) {
              case 'html-start':
                setEditStatus('thinking', 'HTML wird generiert…')
                break
              case 'html-done':
                setEditStatus('thinking', 'Übersetze HTML zu Mirror…')
                break
              case 'translate-done':
                setEditStatus('thinking', 'Validiere…')
                break
              case 'validate':
                if (!event.valid) {
                  setEditStatus(
                    'thinking',
                    `Validator-Fehler — Retry (Versuch ${event.attempt + 2})…`
                  )
                }
                break
            }
          },
        }
      )
    } catch (err) {
      if (currentAbort !== ctrl) return
      currentAbort = null
      setEditStatus('error', errorMessage(err))
      return
    }

    if (currentAbort !== ctrl) return // superseded
    currentAbort = null

    if (result.status === 'error') {
      setEditStatus('error', result.error ?? 'Generation fehlgeschlagen')
      return
    }

    if (!result.mirror) {
      setEditStatus('error', 'Pipeline lieferte keinen Mirror-Output')
      return
    }

    setGhostDiff(view, baseSource, result.mirror)
    const activeHunks = computeLineDiff(baseSource, result.mirror).length
    if (result.status === 'warning') {
      const errorCount = result.validationErrors?.length ?? 0
      const validatorTag = `⚠ ${errorCount} Validator-${errorCount === 1 ? 'Issue' : 'Issues'}`
      const base = buildReadyHint(activeHunks, 0, 0) ?? 'Tab akzeptieren · Esc verwerfen'
      setEditStatus('warning', `${base} · ${validatorTag}`)
    } else {
      setEditStatus('ready', buildReadyHint(activeHunks, 0, 0))
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

    generateFromPrompt(view) {
      openPromptField(view, {
        placeholder:
          'Was soll generiert werden? (Pipeline: Prompt → HTML → Mirror; Enter senden, Esc abbrechen)',
        onSubmit: instruction => {
          void runGenerationFlow(view, instruction)
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
      // Multi-File-Roadmap 6b: commit sibling-file writes if any. We
      // fire-and-forget the saves (no await): the user expects the same
      // snappy accept response as a single-file edit. Errors surface in
      // the storage layer's own logging — failing here would leave the
      // active file accepted but siblings in limbo, which is worse than
      // a logged error.
      if (pendingOtherFileChanges && config.saveSiblingFile) {
        for (const [filename, content] of Object.entries(pendingOtherFileChanges)) {
          try {
            void config.saveSiblingFile(filename, content)
          } catch {
            // swallow — see comment above
          }
        }
      }
      pendingOtherFileChanges = null
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
      pendingOtherFileChanges = null
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
        // Auto-discard: typing invalidates pending sibling changes too.
        pendingOtherFileChanges = null
        hideEditStatus()
      }
    }),
  }
}

/**
 * Build the message shown next to the Tab/Esc hint when a ghost is ready.
 *
 * Lead with the diff size — `3 Änderungen` (in `2 Dateien` if siblings
 * were touched) — so the user sees scope at a glance instead of having
 * to scroll through the ghost decorations. `Tab akzeptieren · Esc
 * verwerfen` always trails so the action keys stay easy to find.
 *
 * Returns `undefined` only when there is genuinely nothing to say
 * (no diff, no other files, no quality issues) so the caller can fall
 * back to the default-message render path.
 */
function buildReadyHint(
  activeFileHunks: number,
  otherFiles: number,
  qualityIssues: number
): string | undefined {
  const totalChanges = activeFileHunks
  const totalFiles = otherFiles + (activeFileHunks > 0 ? 1 : 0)

  const parts: string[] = []

  if (totalChanges > 0) {
    if (totalFiles > 1) {
      parts.push(
        `${totalChanges} ${totalChanges === 1 ? 'Änderung' : 'Änderungen'} in ${totalFiles} Dateien`
      )
    } else {
      parts.push(`${totalChanges} ${totalChanges === 1 ? 'Änderung' : 'Änderungen'}`)
    }
  } else if (otherFiles > 0) {
    // Active file unchanged but siblings were patched.
    parts.push(`Änderungen in ${otherFiles} ${otherFiles === 1 ? 'Datei' : 'Dateien'}`)
  }

  parts.push('Tab akzeptieren · Esc verwerfen')

  if (qualityIssues > 0) {
    parts.push(`⚠ ${qualityIssues} Quality-${qualityIssues === 1 ? 'Issue' : 'Issues'}`)
  }

  // Returning undefined when there's nothing to add lets setEditStatus
  // fall back to the DEFAULT_MESSAGES entry (`Tab akzeptieren · Esc
  // verwerfen`), keeping the bare-bones case clean.
  if (parts.length === 1 && qualityIssues === 0) return undefined

  return parts.join(' · ')
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function countQualityIssues(v: QualityViolations | undefined): number {
  if (!v) return 0
  return v.token.length + v.component.length + v.redundancy.length
}
