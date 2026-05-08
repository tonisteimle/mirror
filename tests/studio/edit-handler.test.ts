/**
 * Tests for studio/editor/edit-handler.ts
 *
 * Glue zwischen llm-keymap und edit-flow / ghost-diff / status-indicator /
 * prompt-field. Test-Strategie: Inject runEditFlow + openPromptField als
 * Spies, verifiziere Ctx-Capture, State-Übergänge und Cancel-Verhalten.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditorState, EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createEditHandler } from '../../studio/editor/edit-handler'
import { ghostDiffField, ghostDiffExtension } from '../../studio/editor/ghost-diff'
import { getEditStatusElement, hideEditStatus } from '../../studio/editor/edit-status-indicator'
import type { EditResult } from '../../studio/agent/edit-flow'
import type { EditCaptureCtx } from '../../studio/agent/edit-prompts'

let view: EditorView
let parent: HTMLElement

beforeEach(async () => {
  // Drain pending microtasks AND real-timer macrotasks from prior tests
  // FIRST. Several supersede/cancel tests use `setTimeout(resolve, 50)`
  // inside their mock `runEditFlow` and don't await settlement at the
  // test's tail — without a drain >50ms here, that 50ms timer fires
  // *during* a later test's body and calls `setEditStatus('ready')`
  // after we already cleared the singleton, faking up a late "ready"
  // status the later test never asked for.
  await new Promise(resolve => setTimeout(resolve, 60))

  // Reset the status-indicator singleton — its module-scoped `element`
  // ref otherwise leaks across tests once `document.body.innerHTML = ''`
  // detaches the DOM node without nulling the reference.
  hideEditStatus()
  document.body.innerHTML = ''
  parent = document.createElement('div')
  document.body.appendChild(parent)
  const state = EditorState.create({
    doc: 'Frame gap 12\n  Text "Hello"',
    extensions: [ghostDiffExtension()],
  })
  view = new EditorView({ state, parent })
})

const baseConfig = (overrides: Partial<Parameters<typeof createEditHandler>[0]> = {}) => ({
  getProjectFiles: () => ({}),
  getCurrentFileName: () => 'app.mir',
  ...overrides,
})

function ready(proposedSource: string): EditResult {
  return { status: 'ready', proposedSource, retries: 0 }
}

describe('EditHandler — handleEditFlow context capture', () => {
  it('captures source, cursor (1-based), no selection, no instruction', async () => {
    let captured: EditCaptureCtx | null = null
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      captured = ctx
      return ready(ctx.source)
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(captured).not.toBeNull()
    expect(captured!.source).toBe('Frame gap 12\n  Text "Hello"')
    expect(captured!.fileName).toBe('app.mir')
    expect(captured!.selection).toBeNull()
    expect(captured!.instruction).toBeNull()
    expect(captured!.cursor.line).toBe(1)
    expect(captured!.cursor.col).toBe(1)
  })

  it('captures cursor on a different line', async () => {
    view.dispatch({ selection: EditorSelection.cursor(15) })
    let captured: EditCaptureCtx | null = null
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      captured = ctx
      return ready(ctx.source)
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(captured!.cursor.line).toBe(2)
    expect(captured!.cursor.col).toBe(3)
  })

  it('captures selection when range is non-empty', async () => {
    view.dispatch({ selection: EditorSelection.range(13, 27) })
    let captured: EditCaptureCtx | null = null
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      captured = ctx
      return ready(ctx.source)
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(captured!.selection).toEqual({
      from: 13,
      to: 27,
      text: '  Text "Hello"',
    })
  })

  it('passes project files from the config', async () => {
    let captured: EditCaptureCtx | null = null
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      captured = ctx
      return ready(ctx.source)
    })
    const handler = createEditHandler(
      baseConfig({
        runEditFlow,
        getProjectFiles: () => ({
          'tokens.mir': 'primary.bg: #2271C1',
          'components.mir': 'Card: bg #111',
        }),
      })
    )

    handler.handleEditFlow(view)
    await flush()

    expect(captured!.siblings).toEqual({
      'tokens.mir': 'primary.bg: #2271C1',
      'components.mir': 'Card: bg #111',
    })
  })

  it('integrates the change tracker (empty diff on first call)', async () => {
    let captured: EditCaptureCtx | null = null
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      captured = ctx
      return ready(ctx.source)
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(captured!.diffSinceLastCall).toBe('')
  })
})

describe('EditHandler — handleEditFlow status transitions', () => {
  it('shows "thinking" status before the call resolves', async () => {
    let observedClassDuringCall = ''
    const runEditFlow = vi.fn(async () => {
      // Snapshot the class string at the moment the LLM call starts.
      observedClassDuringCall = getEditStatusElement()?.className ?? ''
      return ready('new')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(observedClassDuringCall).toContain('cm-llm-status-thinking')
  })

  it('shows "ready" + activates ghost when status=ready', async () => {
    const runEditFlow = vi.fn(async () => ready('Frame gap 12\n  Text "Hi"'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(view.state.field(ghostDiffField).active).toBe(true)
    expect(view.state.field(ghostDiffField).newSource).toBe('Frame gap 12\n  Text "Hi"')
    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-ready')).toBe(true)
  })

  it('hides status (idle) when result is no-change', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'no-change',
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    expect(getEditStatusElement()).toBeNull()
    expect(view.state.field(ghostDiffField).active).toBe(false)
  })

  it('appends quality-issue count to ready status when violations present', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: 'Frame gap 12\n  Text "Hi"',
        retries: 0,
        qualityViolations: {
          token: [
            {
              line: 1,
              elementName: 'Frame',
              propertyName: 'bg',
              hardcodedValue: '#2271C1',
              suggestedToken: '$primary',
              reason: 'hardcoded-equals-token',
            },
          ],
          component: [],
          redundancy: [],
        },
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-ready')).toBe(true)
    expect(status?.textContent).toContain('Quality-Issue')
    expect(status?.textContent).toContain('1')
  })

  it('shows warning status when no-change but violations are present', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'no-change',
        retries: 0,
        qualityViolations: {
          token: [],
          component: [],
          redundancy: [
            {
              line: 1,
              kind: 'duplicate-property',
              elementName: 'Frame',
              detail: 'ver appears 2× on this element',
            },
            {
              line: 2,
              kind: 'inherited-redundant',
              elementName: 'Text',
              detail: 'col white is already inherited from canvas',
            },
          ],
        },
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-warning')).toBe(true)
    expect(status?.textContent).toContain('2')
    expect(status?.textContent).toContain('vom AI nicht behoben')
  })

  it('shows error status with the error message on status=error', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'error',
        error: 'rate limit exceeded',
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-error')).toBe(true)
    expect(status?.textContent).toContain('rate limit')
  })

  it('shows error when runEditFlow itself throws', async () => {
    const runEditFlow = vi.fn(async () => {
      throw new Error('network down')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-error')).toBe(true)
    expect(status?.textContent).toContain('network down')
  })
})

describe('EditHandler — supersede / cancel', () => {
  it('aborts a previous in-flight call when a new handleEditFlow comes in', async () => {
    const observedSignals: AbortSignal[] = []
    const runEditFlow = vi.fn(async (_ctx, opts: { signal?: AbortSignal } = {}) => {
      if (opts.signal) observedSignals.push(opts.signal)
      // Simulate a delayed response.
      await new Promise(resolve => setTimeout(resolve, 50))
      return ready('done')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view) // call A
    await Promise.resolve()
    handler.handleEditFlow(view) // call B — must abort A
    expect(observedSignals[0].aborted).toBe(true)
  })

  it('dismissGhost aborts an in-flight call', async () => {
    let aborted = false
    const runEditFlow = vi.fn(async (_ctx, opts: { signal?: AbortSignal } = {}) => {
      opts.signal?.addEventListener('abort', () => {
        aborted = true
      })
      await new Promise(resolve => setTimeout(resolve, 50))
      return ready('done')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await Promise.resolve()
    handler.dismissGhost(view)
    expect(aborted).toBe(true)
  })

  it('Escape during thinking: status clears, no ghost, no error (clean abort, no dangling)', async () => {
    // The runEditFlow rejects with AbortError when its signal aborts —
    // this matches the production runEdit() contract.
    const runEditFlow = vi.fn(async (_ctx, opts: { signal?: AbortSignal } = {}) => {
      return new Promise<EditResult>((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await Promise.resolve()
    // Mid-thinking: status indicator is up.
    expect(getEditStatusElement()?.classList.contains('cm-llm-status-thinking')).toBe(true)

    // User presses Escape → dismissGhost (which is wired in production
    // via the keymap; here we call it directly).
    expect(handler.dismissGhost(view)).toBe(true)

    // Wait for the rejected promise to settle through the catch arm.
    await flush()

    // Clean state: status hidden, no ghost, no error message left behind.
    expect(getEditStatusElement()).toBeNull()
    expect(view.state.field(ghostDiffField).active).toBe(false)
  })

  it('does not paint status/ghost from a superseded call after a new Cmd+Enter', async () => {
    // First call resolves slowly with a ghost; second call resolves
    // immediately. The first call's late return must not overwrite the
    // second call's ghost (or paint an error).
    let resolveFirst: ((r: EditResult) => void) | null = null
    let callCount = 0
    const runEditFlow = vi.fn(async () => {
      callCount++
      if (callCount === 1) {
        return new Promise<EditResult>(resolve => {
          resolveFirst = resolve
        })
      }
      return ready('SECOND')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view) // call A — pending forever
    await Promise.resolve()
    handler.handleEditFlow(view) // call B — supersedes A, resolves to "SECOND"
    await flush()

    expect(view.state.field(ghostDiffField).newSource).toBe('SECOND')

    // Now resolve call A late — it should be ignored.
    resolveFirst!(ready('FIRST'))
    await flush()

    // Ghost still reflects call B, not the late "FIRST" result.
    expect(view.state.field(ghostDiffField).newSource).toBe('SECOND')
  })

  it('dismissGhost during thinking: status hidden cleanly, no late ghost from the rejected call', async () => {
    let signalRef: AbortSignal | null = null
    // Non-async mock: returns a Promise directly to avoid the extra
    // microtask wrap that `async` would impose. Matches the production
    // `runEdit` shape (resolves on completion, rejects on abort).
    const runEditFlow = vi.fn((_ctx, opts: { signal?: AbortSignal } = {}) => {
      signalRef = opts.signal ?? null
      return new Promise<EditResult>((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await Promise.resolve()
    handler.dismissGhost(view)
    await flush()

    expect(signalRef!.aborted).toBe(true)
    expect(getEditStatusElement()).toBeNull()
    expect(view.state.field(ghostDiffField).active).toBe(false)
  })

  it('reports non-Error throws from runEditFlow as a string in the error status', async () => {
    // Non-async + explicit rejected promise: minimizes microtask wrapping
    // so the catch arm settles within `flush()` even under heavy
    // parallelization (full vitest suite).
    const runEditFlow = vi.fn(() => Promise.reject('plain-string-rejection'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()
    await flush()

    const status = getEditStatusElement()
    expect(status?.classList.contains('cm-llm-status-error')).toBe(true)
    expect(status?.textContent).toContain('plain-string-rejection')
  })
})

describe('EditHandler — acceptGhost', () => {
  it('replaces the doc with newSource and clears the ghost', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()
    expect(view.state.field(ghostDiffField).active).toBe(true)

    handler.acceptGhost(view)
    expect(view.state.doc.toString()).toBe('REPLACED')
    expect(view.state.field(ghostDiffField).active).toBe(false)
    expect(getEditStatusElement()).toBeNull()
  })

  it('returns false when no ghost is active', () => {
    const handler = createEditHandler(baseConfig())
    expect(handler.acceptGhost(view)).toBe(false)
  })

  // Multi-File-Roadmap Komponente 6b: cross-file accept commits sibling
  // writes through the saveSiblingFile callback before clearing state.
  it('commits otherFileChanges via saveSiblingFile on accept', async () => {
    const saved: Array<{ name: string; content: string }> = []
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: 'NEW ACTIVE',
        otherFileChanges: {
          'tokens.mir': 'primary.bg: #1E5BA8',
          'components.mir': 'PrimaryBtn: bg $primary',
        },
        retries: 0,
      })
    )
    const handler = createEditHandler(
      baseConfig({
        runEditFlow,
        saveSiblingFile: (name, content) => {
          saved.push({ name, content })
        },
      })
    )

    handler.handleEditFlow(view)
    await flush()
    handler.acceptGhost(view)
    await flush()

    expect(view.state.doc.toString()).toBe('NEW ACTIVE')
    expect(saved).toEqual([
      { name: 'tokens.mir', content: 'primary.bg: #1E5BA8' },
      { name: 'components.mir', content: 'PrimaryBtn: bg $primary' },
    ])
  })

  it('does not call saveSiblingFile when otherFileChanges is empty', async () => {
    const save = vi.fn()
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow, saveSiblingFile: save }))

    handler.handleEditFlow(view)
    await flush()
    handler.acceptGhost(view)

    expect(save).not.toHaveBeenCalled()
  })

  it('drops pending sibling changes on dismiss (no save fired)', async () => {
    const save = vi.fn()
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: 'NEW',
        otherFileChanges: { 'tokens.mir': 'x' },
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow, saveSiblingFile: save }))

    handler.handleEditFlow(view)
    await flush()
    handler.dismissGhost(view)

    expect(save).not.toHaveBeenCalled()
  })

  it('superseding flow drops the prior pending sibling changes', async () => {
    const save = vi.fn()
    let nextResult: EditResult = {
      status: 'ready',
      proposedSource: 'FIRST',
      otherFileChanges: { 'tokens.mir': 'first-version' },
      retries: 0,
    }
    const runEditFlow = vi.fn(async () => nextResult)
    const handler = createEditHandler(baseConfig({ runEditFlow, saveSiblingFile: save }))

    handler.handleEditFlow(view)
    await flush()

    // New flow without otherFileChanges supersedes the first.
    nextResult = { status: 'ready', proposedSource: 'SECOND', retries: 0 }
    handler.handleEditFlow(view)
    await flush()

    handler.acceptGhost(view)
    expect(save).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe('SECOND')
  })

  it('summarises cross-file scope in the ready hint (changes + total files)', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: 'NEW',
        otherFileChanges: { 'tokens.mir': 'x', 'components.mir': 'y' },
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()

    const el = getEditStatusElement()
    expect(el).not.toBeNull()
    // Active file (1 hunk: full replacement) + 2 sibling changes = 3 files total.
    expect(el!.textContent).toMatch(/in 3 Dateien/)
    expect(el!.textContent).toContain('Tab akzeptieren')
  })

  it('lead-text says "1 Änderung" when the active file changed in one hunk', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    handler.handleEditFlow(view)
    await flush()
    const el = getEditStatusElement()
    expect(el!.textContent).toMatch(/^1 Änderung/)
    // Singular file → no "in N Dateien" suffix.
    expect(el!.textContent).not.toMatch(/in \d+ Datei/)
  })

  it('counts hunks (not lines) when the diff is a multi-region patch', async () => {
    // baseSource has 5 lines; proposed swaps line 2 and line 5 only —
    // two non-adjacent hunks.
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'A\nB\nC\nD\nE' } })
    const proposed = 'A\nBB\nC\nD\nEE'
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: proposed,
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    handler.handleEditFlow(view)
    await flush()
    const el = getEditStatusElement()
    expect(el!.textContent).toMatch(/^2 Änderungen/)
  })

  it('falls back to bare Tab/Esc when proposed equals base (no diff)', async () => {
    // Edge case: defensive path. `runEditFlow` returns a `ready` whose
    // proposedSource is identical to the current doc. computeLineDiff
    // yields zero hunks; the lead text should be omitted entirely.
    const docNow = view.state.doc.toString()
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: docNow,
        retries: 0,
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    handler.handleEditFlow(view)
    await flush()
    const el = getEditStatusElement()
    // The bare default message ("Tab akzeptieren · Esc verwerfen") fires —
    // no leading "0 Änderungen" noise.
    expect(el!.textContent).not.toMatch(/0 Änderung/)
    expect(el!.textContent).toContain('Tab akzeptieren')
  })

  it('appends Quality-Issues to the ready hint when violations remain', async () => {
    const runEditFlow = vi.fn(
      async (): Promise<EditResult> => ({
        status: 'ready',
        proposedSource: 'REPLACED',
        retries: 0,
        qualityViolations: {
          token: [{} as never],
          component: [{} as never],
          redundancy: [],
        },
      })
    )
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    handler.handleEditFlow(view)
    await flush()
    const el = getEditStatusElement()
    expect(el!.textContent).toMatch(/2 Quality-Issues/)
  })
})

describe('EditHandler — dismissGhost', () => {
  it('clears the ghost without changing the doc', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
    await flush()
    const docBefore = view.state.doc.toString()

    handler.dismissGhost(view)
    expect(view.state.doc.toString()).toBe(docBefore)
    expect(view.state.field(ghostDiffField).active).toBe(false)
  })

  it('returns false when there is nothing to dismiss', () => {
    const handler = createEditHandler(baseConfig())
    expect(handler.dismissGhost(view)).toBe(false)
  })
})

describe('EditHandler — ghostDiscardOnEditExtension (T4.4)', () => {
  it('hides the status indicator when the user types and the ghost auto-discards', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    // Re-create view with the discard listener wired in, matching the
    // production extension order (app.js).
    const state = EditorState.create({
      doc: 'Frame gap 12\n  Text "Hello"',
      extensions: [ghostDiffExtension(), handler.ghostDiscardOnEditExtension],
    })
    document.body.innerHTML = ''
    parent = document.createElement('div')
    document.body.appendChild(parent)
    view = new EditorView({ state, parent })

    handler.handleEditFlow(view)
    await flush()
    expect(view.state.field(ghostDiffField).active).toBe(true)
    expect(getEditStatusElement()?.classList.contains('cm-llm-status-ready')).toBe(true)

    // User types — auto-discard kicks in via the StateField, status
    // listener picks up the active→inactive transition.
    view.dispatch({ changes: { from: 0, to: 0, insert: 'X' } })

    expect(view.state.field(ghostDiffField).active).toBe(false)
    expect(getEditStatusElement()).toBeNull()
  })

  it('does NOT hide the status when the doc change is the accept dispatch', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    const state = EditorState.create({
      doc: 'Frame gap 12\n  Text "Hello"',
      extensions: [ghostDiffExtension(), handler.ghostDiscardOnEditExtension],
    })
    document.body.innerHTML = ''
    parent = document.createElement('div')
    document.body.appendChild(parent)
    view = new EditorView({ state, parent })

    handler.handleEditFlow(view)
    await flush()
    expect(view.state.field(ghostDiffField).active).toBe(true)

    // acceptGhost dispatches doc change + clearGhostDiffEffect together.
    // The listener must NOT treat this as auto-discard (acceptGhost
    // already calls hideEditStatus itself; if the listener also fired
    // it would be a double-hide which is fine, but we want the
    // semantics to be unambiguous).
    handler.acceptGhost(view)
    expect(view.state.doc.toString()).toBe('REPLACED')
    expect(view.state.field(ghostDiffField).active).toBe(false)
    // acceptGhost already called hideEditStatus, so this is null
    // either way — but the key is the listener didn't crash on the
    // clear-effect transaction.
    expect(getEditStatusElement()).toBeNull()
  })

  it('is a no-op when typing while ghost was already inactive', async () => {
    const handler = createEditHandler(baseConfig())
    const state = EditorState.create({
      doc: 'Frame gap 12',
      extensions: [ghostDiffExtension(), handler.ghostDiscardOnEditExtension],
    })
    document.body.innerHTML = ''
    parent = document.createElement('div')
    document.body.appendChild(parent)
    view = new EditorView({ state, parent })

    // No ghost has ever been active. Typing should not call hideEditStatus
    // (nothing to hide), and should not crash.
    expect(view.state.field(ghostDiffField).active).toBe(false)
    view.dispatch({ changes: { from: 0, to: 0, insert: 'X' } })
    expect(getEditStatusElement()).toBeNull()
  })

  it('is a no-op for selection-only transactions', async () => {
    const runEditFlow = vi.fn(async () => ready('REPLACED'))
    const handler = createEditHandler(baseConfig({ runEditFlow }))
    const state = EditorState.create({
      doc: 'Frame gap 12\n  Text "Hello"',
      extensions: [ghostDiffExtension(), handler.ghostDiscardOnEditExtension],
    })
    document.body.innerHTML = ''
    parent = document.createElement('div')
    document.body.appendChild(parent)
    view = new EditorView({ state, parent })

    handler.handleEditFlow(view)
    await flush()
    expect(view.state.field(ghostDiffField).active).toBe(true)

    // Move cursor — no docChanged.
    view.dispatch({ selection: EditorSelection.cursor(5) })

    // Ghost still active, status still ready.
    expect(view.state.field(ghostDiffField).active).toBe(true)
    expect(getEditStatusElement()?.classList.contains('cm-llm-status-ready')).toBe(true)
  })
})

describe('EditHandler — openPromptField', () => {
  it('opens the prompt-field and on submit captures the instruction', async () => {
    let capturedInstruction: string | null | undefined = undefined
    const runEditFlow = vi.fn(async (ctx: EditCaptureCtx) => {
      capturedInstruction = ctx.instruction
      return ready('done')
    })
    let onSubmit: ((text: string) => void) | null = null
    const openPromptField = vi.fn((_view, options) => {
      onSubmit = options.onSubmit
      return {
        element: document.createElement('div'),
        close: () => {},
      }
    })
    const handler = createEditHandler(
      baseConfig({
        runEditFlow,
        openPromptField,
      })
    )

    handler.openPromptField(view)
    expect(openPromptField).toHaveBeenCalled()
    expect(runEditFlow).not.toHaveBeenCalled()

    onSubmit!('mach das responsive')
    await flush()

    expect(runEditFlow).toHaveBeenCalled()
    expect(capturedInstruction).toBe('mach das responsive')
  })

  it('does not call runEditFlow on cancel', () => {
    const runEditFlow = vi.fn()
    let onCancel: (() => void) | null = null
    const openPromptField = vi.fn((_view, options) => {
      onCancel = options.onCancel
      return {
        element: document.createElement('div'),
        close: () => {},
      }
    })
    const handler = createEditHandler(
      baseConfig({
        runEditFlow,
        openPromptField,
      })
    )

    handler.openPromptField(view)
    onCancel!()
    expect(runEditFlow).not.toHaveBeenCalled()
  })
})

// ============================================================
// generateFromPrompt — Mod-Alt-Enter (full-file LLM generation)
// ============================================================

describe('EditHandler — generateFromPrompt', () => {
  it('passes project files as siblings to the generation pipeline', async () => {
    // Without this wiring, the user-facing Cmd+Alt+Enter path generates
    // HTML using a parallel palette regardless of what tokens.tok defines —
    // exactly the architectural failure mode that p4-tokens-resolved
    // surfaced in the eval suite. Lock the wiring so it cannot regress.
    let capturedInput: { siblings?: Record<string, string> } | null = null
    const runGenerationPipeline = vi.fn(async (input: { siblings?: Record<string, string> }) => {
      capturedInput = input
      return { status: 'success' as const, mirror: 'Frame', html: '<html></html>' }
    })
    let onSubmit: ((text: string) => void) | null = null
    const openPromptField = vi.fn((_view, options) => {
      onSubmit = options.onSubmit
      return { element: document.createElement('div'), close: () => {} }
    })

    const handler = createEditHandler(
      baseConfig({
        runGenerationPipeline: runGenerationPipeline as unknown as Parameters<
          typeof createEditHandler
        >[0]['runGenerationPipeline'],
        openPromptField,
        getProjectFiles: () => ({
          'tokens.tok': 'brand.bg: #2271C1',
          'components.com': 'Btn: pad 10 20',
        }),
      })
    )

    handler.generateFromPrompt(view)
    onSubmit!('three stat cards')
    await flush()

    expect(runGenerationPipeline).toHaveBeenCalled()
    expect(capturedInput).not.toBeNull()
    expect(capturedInput!.siblings).toEqual({
      'tokens.tok': 'brand.bg: #2271C1',
      'components.com': 'Btn: pad 10 20',
    })
  })

  it('passes an empty object when the project has no other files', async () => {
    let capturedInput: { siblings?: Record<string, string> } | null = null
    const runGenerationPipeline = vi.fn(async (input: { siblings?: Record<string, string> }) => {
      capturedInput = input
      return { status: 'success' as const, mirror: 'Frame', html: '<html></html>' }
    })
    let onSubmit: ((text: string) => void) | null = null
    const openPromptField = vi.fn((_view, options) => {
      onSubmit = options.onSubmit
      return { element: document.createElement('div'), close: () => {} }
    })

    const handler = createEditHandler(
      baseConfig({
        runGenerationPipeline: runGenerationPipeline as unknown as Parameters<
          typeof createEditHandler
        >[0]['runGenerationPipeline'],
        openPromptField,
        getProjectFiles: () => ({}),
      })
    )

    handler.generateFromPrompt(view)
    onSubmit!('hello world')
    await flush()

    expect(capturedInput!.siblings).toEqual({})
  })
})

// ============================================================
// Helpers
// ============================================================

async function flush(): Promise<void> {
  // Three microtasks should be enough to settle: thinking, await, handle.
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}
