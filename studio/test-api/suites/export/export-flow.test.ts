/**
 * Studio Export Flow — Test Runner Suite
 *
 * Drives the Export-Button + Dialog + NDJSON-stream UI in real Chrome
 * via CDP. The tests don't depend on a running ai-bridge server: they
 * monkey-patch `globalThis.fetch` to return crafted ReadableStream
 * responses, exercising the streaming consumer end-to-end.
 *
 * Surfaces under test:
 *   - studio/preview/export-button.ts          (dialog + stream parser)
 *   - studio/preview/index.ts                  (barrel re-export)
 *   - studio/app.ts: initExportButton() call   (boot wiring)
 *   - studio/index.html: #export-btn           (toolbar mounting)
 *   - studio/styles/export-dialog.css          (visible classes)
 *
 * NB: the export button is Studio chrome, not a Mirror node — so these
 * tests use raw `document` queries instead of the Mirror-node-id API.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helpers (run in the browser context)
// =============================================================================

interface FetchSpy {
  calls: Array<{ url: string; init: RequestInit | undefined }>
  restore: () => void
}

/**
 * Replaces globalThis.fetch with a stub that records calls and
 * dispatches to a per-URL handler. Use `.restore()` in cleanup.
 */
function installFetchStub(
  routes: Record<string, (init: RequestInit | undefined) => Promise<Response> | Response>
): FetchSpy {
  const original = globalThis.fetch
  const calls: FetchSpy['calls'] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.includes(pattern)) return await handler(init)
    }
    throw new Error(`fetch stub: no route matched ${url}`)
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

/**
 * Build a Response whose body is a ReadableStream that emits one
 * JSON+'\n' chunk per event in the given list.
 */
function ndjsonResponse(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder()
  let i = 0
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= events.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(JSON.stringify(events[i]) + '\n'))
      i++
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Studio runs the dialog asynchronously (DOM mutations, await fetch).
 * waitFor polls a predicate up to `timeoutMs`.
 */
async function waitFor(
  predicate: () => boolean,
  description: string,
  timeoutMs = 2000
): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out: ${description}`)
    }
    await new Promise(r => setTimeout(r, 25))
  }
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.export-dialog-overlay')
}

function closeDialog(): void {
  const close = document.querySelector<HTMLButtonElement>('.export-dialog-close')
  close?.click()
}

/**
 * Set Studio's editor file-set so `state.get().files` returns these.
 * Reads from app-state via the same actions Studio uses internally.
 */
function setFiles(files: Record<string, string>): void {
  // The studio state surface — bootstrapped in app.ts. We just patch
  // .files directly via a custom event the studio listens for, OR if
  // not available, fall back to mutating the state store. Using the
  // public state.set if exposed.
  type StoreShape = {
    state?: {
      get: () => { files: Record<string, string> }
      set?: (patch: Record<string, unknown>) => void
    }
  }
  const studio = (window as unknown as { studio?: StoreShape }).studio
  if (!studio?.state?.set) {
    throw new Error('window.studio.state.set not available — Studio not booted yet?')
  }
  studio.state.set({ files })
}

// =============================================================================
// Tests
// =============================================================================

export const exportFlowTests: TestCase[] = describe('Studio Export Flow', [
  // ---------------------------------------------------------------------------
  // 1. Wiring sanity
  // ---------------------------------------------------------------------------
  test('Export button is present in the preview toolbar', async (api: TestAPI) => {
    const btn = document.getElementById('export-btn')
    api.assert.ok(btn, '#export-btn must exist in the toolbar')
    api.assert.equals(btn!.tagName, 'BUTTON', 'must be a <button>')
    api.assert.ok(
      btn!.getAttribute('title')?.toLowerCase().includes('export'),
      'should have an Export-related title attr'
    )
  }),

  test('Clicking Export button opens the dialog', async (api: TestAPI) => {
    api.assert.ok(!dialog(), 'dialog must not be present before click')
    document.getElementById('export-btn')!.click()
    await waitFor(() => !!dialog(), 'dialog appears after click')
    api.assert.ok(dialog(), 'overlay should be in DOM after click')
    closeDialog()
    await waitFor(() => !dialog(), 'dialog removed by close button')
  }),

  // ---------------------------------------------------------------------------
  // 2. Initial dialog UI
  // ---------------------------------------------------------------------------
  test('Dialog exposes target select, snapshot toggle, submit/cancel', async (api: TestAPI) => {
    document.getElementById('export-btn')!.click()
    await waitFor(() => !!dialog(), 'dialog opens')

    const sel = dialog()!.querySelector<HTMLSelectElement>('select[name="target"]')
    api.assert.ok(sel, 'target <select> exists')
    const targets = Array.from(sel!.options).map(o => o.value)
    api.assert.equals(
      targets.join(','),
      'react,vue,svelte,vanilla',
      'all four targets offered in canonical order'
    )

    const snap = dialog()!.querySelector<HTMLInputElement>('input[name="snapshot"]')
    api.assert.ok(snap, 'snapshot checkbox exists')
    api.assert.equals(snap!.checked, true, 'snapshot defaults to checked')

    api.assert.ok(dialog()!.querySelector('.export-dialog-submit'), 'submit button exists')
    api.assert.ok(dialog()!.querySelector('.export-dialog-cancel'), 'cancel button exists')

    closeDialog()
    await waitFor(() => !dialog(), 'cleanup')
  }),

  test('Escape key closes the dialog', async (api: TestAPI) => {
    document.getElementById('export-btn')!.click()
    await waitFor(() => !!dialog(), 'dialog open')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await waitFor(() => !dialog(), 'dialog closed by Escape')
    api.assert.ok(true, 'Escape closes')
  }),

  // ---------------------------------------------------------------------------
  // 3. Empty-project guard
  // ---------------------------------------------------------------------------
  test('Submit with no files surfaces an error and does not call fetch', async (api: TestAPI) => {
    setFiles({})
    const spy = installFetchStub({})
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      const submit = dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!
      submit.click()
      await waitFor(() => {
        const phase = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-phase')
        return !!phase?.textContent && /keine Dateien/i.test(phase.textContent)
      }, 'empty-files error surfaces in phase label')
      api.assert.equals(spy.calls.length, 0, 'fetch must not be called for empty project')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  // ---------------------------------------------------------------------------
  // 4. Happy-path submission with streamed phases
  // ---------------------------------------------------------------------------
  test('Submit posts files+target+snapshot to /export and reflects done event', async (api: TestAPI) => {
    setFiles({
      'app.mir': 'canvas mobile, bg #1a1a1a\nText "Hi"',
      'tokens.tok': 'primary.bg: #2271C1',
    })

    const spy = installFetchStub({
      '/export': () =>
        ndjsonResponse([
          { phase: 'init', target: 'react', snapshot: true, fileCount: 2 },
          { phase: 'write-files', message: '2 Dateien' },
          { phase: 'export', message: 'Bundle bauen (react)' },
          { phase: 'log', stream: 'stdout', message: '📦 Building bundle' },
          { phase: 'log', stream: 'stdout', message: '✓ Bundle written' },
          { phase: 'done', bundlePath: '/tmp/bundle-42', command: 'cd /tmp/bundle-42 && claude' },
        ]),
    })

    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()

      // Wait until success UI rendered
      await waitFor(() => {
        const result = dialog()!.querySelector<HTMLElement>('.export-dialog-result')
        return !!result && !result.hidden
      }, 'success UI appears')

      // Verify fetch contract
      api.assert.equals(spy.calls.length, 1, 'exactly one /export POST')
      api.assert.contains(spy.calls[0].url, '/export', 'POSTed to /export')
      api.assert.equals(spy.calls[0].init?.method, 'POST', 'method is POST')
      const sentBody = JSON.parse((spy.calls[0].init?.body as string) || '{}')
      api.assert.equals(sentBody.target, 'react', 'target propagated')
      api.assert.equals(sentBody.snapshot, true, 'snapshot propagated')
      api.assert.ok(sentBody.files['app.mir'], 'app.mir included in payload')
      api.assert.ok(sentBody.files['tokens.tok'], 'tokens.tok included in payload')

      // Verify rendered success state
      const result = dialog()!.querySelector<HTMLElement>('.export-dialog-result')!
      api.assert.contains(result.innerHTML, '/tmp/bundle-42', 'bundle path shown')
      api.assert.contains(result.innerHTML, 'cd /tmp/bundle-42', 'claude command shown')

      // Progress bar should reach 100%
      const fill = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-bar-fill')!
      api.assert.equals(fill.style.width, '100%', 'progress bar full')
      api.assert.contains(fill.className, 'success', 'progress bar marked success')

      // Submit button should be hidden after success
      const submit = dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!
      api.assert.equals(submit.hidden, true, 'submit hidden after success')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  test('Selecting a different target propagates to /export body', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () => ndjsonResponse([{ phase: 'done', bundlePath: '/tmp/x', command: 'echo' }]),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      const sel = dialog()!.querySelector<HTMLSelectElement>('select[name="target"]')!
      sel.value = 'svelte'
      const cb = dialog()!.querySelector<HTMLInputElement>('input[name="snapshot"]')!
      cb.checked = false
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => spy.calls.length > 0, '/export hit')
      const body = JSON.parse((spy.calls[0].init?.body as string) || '{}')
      api.assert.equals(body.target, 'svelte', 'svelte target sent')
      api.assert.equals(body.snapshot, false, 'snapshot off propagated')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  // ---------------------------------------------------------------------------
  // 5. Phase events drive the progress UI
  // ---------------------------------------------------------------------------
  test('Phase + log events render in the progress panel live', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () =>
        ndjsonResponse([
          { phase: 'init', target: 'react', snapshot: false, fileCount: 1 },
          { phase: 'write-files' },
          { phase: 'export' },
          { phase: 'log', stream: 'stdout', message: '📦 Building bundle: foo' },
          { phase: 'log', stream: 'stderr', message: 'minor warning' },
          { phase: 'done', bundlePath: '/tmp/x', command: 'echo' },
        ]),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => {
        const log = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-log')
        return !!log?.textContent && log.textContent.includes('Building bundle')
      }, 'log line accumulates')
      const log = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-log')!
      api.assert.contains(log.textContent || '', '📦 Building bundle: foo', 'stdout line in log')
      api.assert.contains(log.textContent || '', '⚠ minor warning', 'stderr line tagged with ⚠')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  test('Snapshot step events nudge progress bar past 50%', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })

    // Manually controlled stream so we can inspect the bar before `done`
    const encoder = new TextEncoder()
    let releaseDone: () => void = () => {}
    const donePromise = new Promise<void>(r => (releaseDone = r))
    const spy = installFetchStub({
      '/export': () =>
        new Response(
          new ReadableStream<Uint8Array>({
            async pull(controller) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ phase: 'init', target: 'react' }) + '\n')
              )
              controller.enqueue(
                encoder.encode(JSON.stringify({ phase: 'snapshot', step: 'mobile' }) + '\n')
              )
              await donePromise
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ phase: 'done', bundlePath: '/tmp/x', command: 'echo' }) + '\n'
                )
              )
              controller.close()
            },
          })
        ),
    })

    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => {
        const fill = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-bar-fill')
        return fill?.style.width === '55%'
      }, 'bar advances on snapshot:mobile')
      const phase = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-phase')!
      api.assert.matches(phase.textContent || '', /Snapshot mobile/, 'phase label reflects step')

      releaseDone()
      await waitFor(() => {
        const fill = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-bar-fill')
        return fill?.style.width === '100%'
      }, 'final 100% reached after done')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  // ---------------------------------------------------------------------------
  // 6. Error states
  // ---------------------------------------------------------------------------
  test('Stream `error` phase renders error label and re-enables retry', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () => ndjsonResponse([{ phase: 'error', error: 'mock failure' }]),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => {
        const phase = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-phase')
        return !!phase?.textContent && /mock failure/.test(phase.textContent)
      }, 'error phase rendered')
      const phase = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-phase')!
      api.assert.contains(phase.className, 'error', 'phase styled as error')
      const submit = dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!
      api.assert.equals(submit.disabled, false, 'submit re-enabled for retry')
      api.assert.matches(submit.textContent || '', /erneut/i, 'submit relabelled to retry')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  test('Network failure shows "Bridge nicht erreichbar"', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () => Promise.reject(new TypeError('failed to fetch')),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => {
        const phase = dialog()!.querySelector<HTMLElement>('.export-dialog-progress-phase')
        return !!phase?.textContent && /Bridge nicht erreichbar/.test(phase.textContent)
      }, 'network error message rendered')
      api.assert.ok(true, 'bridge-down message reached UI')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  // ---------------------------------------------------------------------------
  // 7. Run-Claude follow-up
  // ---------------------------------------------------------------------------
  test('Run-Claude button posts to /agent/run with bundle prompt', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () =>
        ndjsonResponse([
          { phase: 'done', bundlePath: '/tmp/runme', command: 'cd /tmp/runme && claude' },
        ]),
      '/agent/run': () => jsonResponse({ success: true, output: 'agent finished' }),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => {
        return !!dialog()!.querySelector<HTMLButtonElement>('.export-dialog-run-claude')
      }, 'run-claude button appears')

      const runBtn = dialog()!.querySelector<HTMLButtonElement>('.export-dialog-run-claude')!
      runBtn.click()

      await waitFor(() => spy.calls.some(c => c.url.includes('/agent/run')), '/agent/run was hit')
      const agentCall = spy.calls.find(c => c.url.includes('/agent/run'))!
      const agentBody = JSON.parse((agentCall.init?.body as string) || '{}')
      api.assert.contains(agentBody.prompt, 'cd /tmp/runme', 'prompt cds into bundle')
      api.assert.contains(agentBody.prompt, 'INSTRUCTIONS.md', 'prompt references INSTRUCTIONS')
      api.assert.equals(agentBody.projectPath, '/tmp/runme', 'projectPath set to bundle path')

      await waitFor(() => {
        const out = dialog()!.querySelector<HTMLElement>('.export-dialog-claude-output')
        return !!out?.textContent && /agent finished/.test(out.textContent)
      }, 'agent output reflected back')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  // ---------------------------------------------------------------------------
  // 8. Project-name derivation
  // ---------------------------------------------------------------------------
  test('Project name derived from first folder when files are nested', async (api: TestAPI) => {
    setFiles({
      'task-app/app.mirror': 'canvas mobile',
      'task-app/tokens.tok': '',
    })
    const spy = installFetchStub({
      '/export': () => ndjsonResponse([{ phase: 'done', bundlePath: '/tmp/x', command: 'echo' }]),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => spy.calls.length > 0, '/export hit')
      const body = JSON.parse((spy.calls[0].init?.body as string) || '{}')
      api.assert.equals(body.projectName, 'task-app', 'first-folder used as project name')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),

  test('Project name falls back to "mirror-project" for flat files', async (api: TestAPI) => {
    setFiles({ 'app.mir': 'canvas mobile' })
    const spy = installFetchStub({
      '/export': () => ndjsonResponse([{ phase: 'done', bundlePath: '/tmp/x', command: 'echo' }]),
    })
    try {
      document.getElementById('export-btn')!.click()
      await waitFor(() => !!dialog(), 'dialog open')
      dialog()!.querySelector<HTMLButtonElement>('.export-dialog-submit')!.click()
      await waitFor(() => spy.calls.length > 0, '/export hit')
      const body = JSON.parse((spy.calls[0].init?.body as string) || '{}')
      api.assert.equals(body.projectName, 'mirror-project', 'flat files → fallback name')
    } finally {
      spy.restore()
      closeDialog()
      await waitFor(() => !dialog(), 'cleanup')
    }
  }),
])
