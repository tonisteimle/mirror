/**
 * CLI Bridge Shim
 *
 * Installs a `window.TauriBridge` object that LOOKS like the real Tauri
 * bridge to the production fixer code, but forwards `agent.checkClaudeCli`
 * and `agent.runAgent` to a local HTTP server (scripts/ai-bridge-server.ts).
 *
 * Use this in browser-based eval/test runs where the Tauri runtime isn't
 * available but `claude` CLI is reachable via the bridge server. The
 * production fixer code (FixerService.generateDraftCode) runs unchanged —
 * we replace only the underlying transport.
 *
 * Setup:
 *   1. Start the server:  npm run ai-bridge
 *   2. In the studio (browser console or test setup):
 *        import { installCliBridgeShim } from '...'
 *        installCliBridgeShim()
 *   3. Type `?? prompt ??` in the editor — the auto-submit fires the real
 *      production wiring through the shim to the real claude CLI.
 *
 * Note: the shim sets `isTauri()` → true, which is a controlled lie scoped
 * to the AI agent path. Do not use in non-AI test contexts where other
 * Tauri APIs (file system, dialogs) would be invoked — those would 404.
 */

export interface CliBridgeShimConfig {
  /** Bridge server URL (default: http://localhost:3456) */
  serverUrl?: string
  /** Log shim activity to console (default: true) */
  verbose?: boolean
}

export function installCliBridgeShim(config: CliBridgeShimConfig = {}): void {
  if (typeof window === 'undefined') {
    throw new Error('installCliBridgeShim: window is undefined')
  }

  const serverUrl = config.serverUrl ?? 'http://localhost:3456'
  const verbose = config.verbose ?? true
  const log = verbose
    ? (msg: string, ...rest: unknown[]) => console.log(`[CliBridgeShim] ${msg}`, ...rest)
    : () => {}

  const outputListeners = new Set<(output: unknown) => void>()

  const bridge = {
    isTauri: () => true,
    agent: {
      async checkClaudeCli(): Promise<boolean> {
        try {
          const r = await fetch(`${serverUrl}/agent/check`)
          if (!r.ok) return false
          const data = (await r.json()) as { available?: boolean }
          return data.available === true
        } catch (err) {
          log('checkClaudeCli failed:', err)
          return false
        }
      },

      async runAgent(
        prompt: string,
        agentType: string,
        projectPath: string,
        sessionId?: string | null
      ): Promise<{ session_id: string; success: boolean; output: string; error: string | null }> {
        log(
          `runAgent: ${prompt.length} chars, agentType=${agentType}, session=${sessionId ?? 'new'}`
        )
        const startTime = performance.now()
        try {
          const r = await fetch(`${serverUrl}/agent/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, agentType, projectPath, sessionId }),
          })
          if (!r.ok) {
            return {
              session_id: '',
              success: false,
              output: '',
              error: `bridge HTTP ${r.status}`,
            }
          }
          const data = (await r.json()) as {
            session_id: string
            success: boolean
            output: string
            error: string | null
          }
          const elapsedS = ((performance.now() - startTime) / 1000).toFixed(1)
          log(
            `runAgent ← ${data.success ? 'OK' : 'ERR'} ${data.output.length} chars in ${elapsedS}s`
          )
          return data
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          log('runAgent fetch failed:', message)
          return {
            session_id: '',
            success: false,
            output: '',
            error: `bridge unreachable: ${message}`,
          }
        }
      },

      async onAgentOutput(callback: (output: unknown) => void): Promise<() => void> {
        // The bridge does not stream — `runAgent` returns once with the full
        // response. Streaming via SSE could be added later if any consumer
        // needs incremental output during draft processing.
        outputListeners.add(callback)
        return () => outputListeners.delete(callback)
      },
    },
  }

  ;(window as any).TauriBridge = bridge
  log(`installed, forwarding to ${serverUrl}`)
}

// Expose globally for non-module callers (e.g. console-driven manual eval)
if (typeof window !== 'undefined') {
  ;(window as any).__installCliBridgeShim = installCliBridgeShim
}
