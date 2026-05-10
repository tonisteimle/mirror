/**
 * Editor dispatch wrapper.
 *
 * Wraps `editor.dispatch` with two cross-cutting concerns:
 *
 *   1. RangeError swallowing for stale changesets. CodeMirror throws
 *      "Position N is out of range for changeset of length M" when a
 *      stale source-map (post test-suite reset, debounced panel commit
 *      racing a fresh `setCode`) builds change positions against an
 *      older doc. Without this guard, one test's stale dispatch poisons
 *      every subsequent test's setup. Real range bugs still surface via
 *      `console.warn` for debugging.
 *
 *   2. Undo/redo toolbar button enablement after every transaction.
 *
 * Also exposes the un-wrapped dispatch on `editor.__originalDispatch`
 * so tests can bypass the wrapper when they need raw transaction
 * semantics.
 */

import { undoDepth, redoDepth } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('App')

export function installEditorDispatchWrapper(
  editor: EditorView,
  undoBtn: HTMLButtonElement | null,
  redoBtn: HTMLButtonElement | null
): void {
  const updateUndoRedoButtons = (): void => {
    if (!undoBtn || !redoBtn) return
    undoBtn.disabled = undoDepth(editor.state) === 0
    redoBtn.disabled = redoDepth(editor.state) === 0
  }

  const originalDispatch = editor.dispatch.bind(editor)
  ;(editor as unknown as { __originalDispatch: typeof originalDispatch }).__originalDispatch =
    originalDispatch

  editor.dispatch = ((...args: Parameters<EditorView['dispatch']>) => {
    try {
      originalDispatch(...args)
    } catch (e) {
      if (e instanceof RangeError && /Position \d+ is out of range/.test(e.message)) {
        log.warn('[editor.dispatch] dropped stale change:', e.message)
        return
      }
      throw e
    }
    updateUndoRedoButtons()
  }) as EditorView['dispatch']

  updateUndoRedoButtons()
}
