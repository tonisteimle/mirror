/**
 * Mirror Fixer — Bridge to the Claude CLI for the LLM-Edit-Flow.
 *
 * Single export: `runEdit(prompt, signal?)`. Sends the prompt to Claude
 * via the Tauri agent bridge with `agentType: 'edit'` and returns the
 * raw output. Stateless (no session reuse) and cancel-aware via
 * `AbortSignal`.
 *
 * The orchestration (prompt building, patch parsing/applying, retry)
 * lives in `edit-flow.ts`. This module is intentionally small — it
 * exists so the bridge call is mockable in tests via `window.TauriBridge`.
 */

declare global {
  interface Window {
    TauriBridge?: TauriBridge
  }
}

interface TauriBridge {
  isTauri: () => boolean
  agent: {
    checkClaudeCli: () => Promise<boolean>
    runAgent: (
      prompt: string,
      agentType: string,
      projectPath: string,
      sessionId?: string | null
    ) => Promise<{
      session_id: string
      success: boolean
      output: string
      error: string | null
    }>
  }
}

function getTauriBridgeOrNull(): TauriBridge | null {
  if (typeof window !== 'undefined' && window.TauriBridge) {
    return window.TauriBridge
  }
  return null
}

function makeAbortError(): Error {
  return new DOMException('Aborted', 'AbortError')
}

/**
 * Send a prompt to Claude (agentType `'edit'`) and return the raw output.
 *
 * @throws AbortError if `signal` is already aborted or aborts during the call.
 * @throws Error if the bridge is unavailable, the CLI is missing, or the
 *         backend reports `success: false`.
 */
export async function runEdit(prompt: string, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    throw makeAbortError()
  }

  const bridge = getTauriBridgeOrNull()
  if (!bridge || !bridge.isTauri()) {
    throw new Error('Claude CLI ist nur in der Desktop-App verfügbar')
  }

  const cliAvailable = await bridge.agent.checkClaudeCli()
  if (!cliAvailable) {
    throw new Error(
      'Claude CLI nicht gefunden. Bitte installieren: npm install -g @anthropic-ai/claude-code'
    )
  }

  const callPromise = bridge.agent.runAgent(prompt, 'edit', '', null)

  const result = signal
    ? await new Promise<Awaited<typeof callPromise>>((resolve, reject) => {
        const onAbort = () => reject(makeAbortError())
        signal.addEventListener('abort', onAbort, { once: true })
        callPromise.then(
          value => {
            signal.removeEventListener('abort', onAbort)
            resolve(value)
          },
          err => {
            signal.removeEventListener('abort', onAbort)
            reject(err)
          }
        )
      })
    : await callPromise

  if (!result.success) {
    throw new Error(result.error || 'Claude CLI Fehler')
  }
  return result.output
}
