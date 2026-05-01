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

beforeEach(() => {
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
  getProjectFiles: () => ({ tokens: {}, components: {} }),
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
          tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
          components: { 'card.com': 'Card: bg #111' },
        }),
      })
    )

    handler.handleEditFlow(view)
    await flush()

    expect(captured!.projectFiles.tokens).toEqual({ 'tokens.tok': 'primary.bg: #2271C1' })
    expect(captured!.projectFiles.components).toEqual({ 'card.com': 'Card: bg #111' })
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
    const runEditFlow = vi.fn(async () => {
      // Some legacy code paths reject with bare strings.
      return Promise.reject('plain-string-rejection')
    })
    const handler = createEditHandler(baseConfig({ runEditFlow }))

    handler.handleEditFlow(view)
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
// Helpers
// ============================================================

async function flush(): Promise<void> {
  // Three microtasks should be enough to settle: thinking, await, handle.
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}
