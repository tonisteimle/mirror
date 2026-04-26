/**
 * AI Bridge Server
 *
 * HTTP server that mirrors the Tauri-bridge `agent` API surface so that
 * browser-based runs (test-runner, manual eval, headed sessions without the
 * Tauri shell) can exercise the production AI path end-to-end against the
 * real `claude` CLI.
 *
 * Originally lived as a one-off prototype at prototypes/ai-assist/server.ts;
 * brought back, reshaped to match the Tauri command contract verbatim so
 * the browser shim can drop in as a `window.TauriBridge` replacement.
 *
 * Endpoints (mirror tauri commands check_claude_cli + run_agent):
 *   GET  /agent/check  →  { available: boolean }
 *   POST /agent/run    →  { session_id, success, output, error }
 *     body: { prompt: string, agentType?: string, projectPath?: string,
 *             sessionId?: string | null }
 *
 * Run with:  npm run ai-bridge
 */

import { spawn } from 'child_process'
import { createServer } from 'http'
import { existsSync } from 'fs'
import { join } from 'path'

const PORT = parseInt(process.env.AI_BRIDGE_PORT || '3456', 10)

// =============================================================================
// CLI Discovery
// =============================================================================

function findClaudeBinary(): string | null {
  // 1. Explicit override
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) {
    return process.env.CLAUDE_BIN
  }
  // 2. ~/.local/bin/claude (user-install location)
  const home = process.env.HOME
  if (home) {
    const local = join(home, '.local', 'bin', 'claude')
    if (existsSync(local)) return local
  }
  // 3. PATH (let spawn resolve)
  return 'claude'
}

const CLAUDE_BIN = findClaudeBinary()

// =============================================================================
// Claude CLI Invocation
// =============================================================================

interface ClaudeResult {
  output: string
  error: string | null
  sessionId: string
}

async function callClaude(prompt: string, sessionId: string | null): Promise<ClaudeResult> {
  return new Promise(resolve => {
    // Pipe prompt via stdin → no argv length issues for large prompts.
    // --output-format text: plain stdout (no JSON wrapping).
    const args = ['-p', '--output-format', 'text']
    if (sessionId) {
      // claude CLI uses --resume <id> to continue a prior conversation
      args.push('--resume', sessionId)
    }

    const proc = spawn(CLAUDE_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', err => {
      resolve({ output: '', error: `spawn failed: ${err.message}`, sessionId: sessionId || '' })
    })
    proc.on('close', code => {
      const newSessionId = sessionId || `bridge-${Date.now()}`
      if (code === 0) {
        resolve({ output: stdout, error: null, sessionId: newSessionId })
      } else {
        resolve({
          output: stdout,
          error: stderr.trim() || `claude exited with code ${code}`,
          sessionId: newSessionId,
        })
      }
    })

    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// =============================================================================
// HTTP Server
// =============================================================================

const server = createServer(async (req, res) => {
  // CORS — bridge is local-only but browser still requires the headers.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  // GET /agent/check
  if (req.method === 'GET' && req.url === '/agent/check') {
    // Quick existence check — actually invoking claude --version costs ~200ms
    // and the real desktop bridge does the same heuristic.
    const available = CLAUDE_BIN === 'claude' || existsSync(CLAUDE_BIN)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ available }))
    return
  }

  // POST /agent/run
  if (req.method === 'POST' && req.url === '/agent/run') {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', async () => {
      let parsed: { prompt?: string; sessionId?: string | null }
      try {
        parsed = JSON.parse(body)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid JSON body' }))
        return
      }
      if (!parsed.prompt || typeof parsed.prompt !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'missing or non-string `prompt`' }))
        return
      }

      const promptLen = parsed.prompt.length
      const sessionLabel = parsed.sessionId ? `resume ${parsed.sessionId}` : 'new session'
      console.log(`[AI Bridge] runAgent: ${promptLen} chars, ${sessionLabel}`)
      const startTime = Date.now()

      const result = await callClaude(parsed.prompt, parsed.sessionId ?? null)
      const elapsedMs = Date.now() - startTime
      const elapsedS = (elapsedMs / 1000).toFixed(1)
      const outLen = result.output.length
      console.log(
        `[AI Bridge] ← ${result.error ? 'ERR' : 'OK'} ${outLen} chars in ${elapsedS}s` +
          (result.error ? ` — ${result.error.slice(0, 80)}` : '')
      )

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          session_id: result.sessionId,
          success: !result.error,
          output: result.output,
          error: result.error,
        })
      )
    })
    return
  }

  res.writeHead(404).end('Not Found')
})

server.listen(PORT, () => {
  console.log(`[AI Bridge Server] listening on http://localhost:${PORT}`)
  console.log(`[AI Bridge Server] claude binary: ${CLAUDE_BIN}`)
  console.log('  GET  /agent/check         → { available }')
  console.log('  POST /agent/run           → { session_id, success, output, error }')
  console.log('       body: { prompt, sessionId? }')
})

// Clean shutdown
process.on('SIGINT', () => {
  console.log('\n[AI Bridge Server] shutting down')
  server.close(() => process.exit(0))
})
