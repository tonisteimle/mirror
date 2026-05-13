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
 * Endpoints:
 *   GET  /agent/check  →  { available: boolean }
 *   POST /agent/run    →  { session_id, success, output, error }
 *     body: { prompt: string, agentType?: string, projectPath?: string,
 *             sessionId?: string | null }
 *   POST /export       →  application/x-ndjson stream of phase events
 *     body: { files: Record<path, content>, target, snapshot, projectName? }
 *     events: init → write-files → export [→ snapshot] → done | error
 *
 * Run with:  npm run ai-bridge
 */

import { spawn } from 'child_process'
import { createServer, type ServerResponse, type IncomingMessage } from 'http'
import { existsSync } from 'fs'
import { join } from 'path'
import { runExportPipeline, type PhaseEvent } from './ai-bridge/run-export'
import * as fsBridge from './ai-bridge/fs-bridge'
import { BridgeProtocolError } from './ai-bridge/fs-bridge'

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
    //
    // NOTE on sessionId: claude CLI's `--resume` requires a real UUID from a
    // prior session. We don't have one (no JSON output, no session id capture),
    // and the orchestrator's prompts are self-contained anyway (each prompt
    // includes the full context). So we ignore sessionId — every call is a
    // fresh session. Trade: slightly more tokens per call vs reliable
    // multi-call orchestration. Reliability wins.
    const args = ['-p', '--output-format', 'text']

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

  // POST /export — NDJSON-streamed Mirror project → spec bundle
  if (req.method === 'POST' && req.url === '/export') {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', async () => {
      let parsed: {
        files?: Record<string, string>
        target?: string
        snapshot?: boolean
        projectName?: string
      }
      try {
        parsed = JSON.parse(body)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid JSON body' }))
        return
      }

      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store',
        'Transfer-Encoding': 'chunked',
      })
      const emit = (e: PhaseEvent) => writeNdjson(res, e)
      try {
        await runExportPipeline(
          {
            files: parsed.files ?? {},
            // runExportPipeline validates target itself — pass through.
            target: (parsed.target ?? 'react') as 'react' | 'vue' | 'svelte' | 'vanilla',
            snapshot: !!parsed.snapshot,
            projectName: parsed.projectName,
          },
          emit
        )
      } catch (err) {
        emit({ phase: 'error', error: (err as Error).message })
      }
      res.end()
    })
    return
  }

  // ── Filesystem-Bridge ────────────────────────────────────────────
  if (req.url && req.url.startsWith('/fs/')) {
    await handleFsRequest(req, res)
    return
  }

  res.writeHead(404).end('Not Found')
})

function writeNdjson(res: ServerResponse, event: PhaseEvent): void {
  res.write(JSON.stringify(event) + '\n')
}

// =============================================================================
// Filesystem-Bridge — /fs/* endpoints
// =============================================================================

async function handleFsRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', `http://localhost:${PORT}`)
  const method = req.method ?? 'GET'

  try {
    // GET /fs/state
    if (method === 'GET' && url.pathname === '/fs/state') {
      writeJson(res, 200, fsBridge.getState())
      return
    }

    // GET /fs/recents
    if (method === 'GET' && url.pathname === '/fs/recents') {
      const recents = await fsBridge.getRecents()
      writeJson(res, 200, { recents })
      return
    }

    // GET /fs/tree
    if (method === 'GET' && url.pathname === '/fs/tree') {
      const tree = await fsBridge.getTree()
      writeJson(res, 200, { tree })
      return
    }

    // GET /fs/read?path=relative/path
    if (method === 'GET' && url.pathname === '/fs/read') {
      const path = url.searchParams.get('path') ?? ''
      const content = await fsBridge.readFile(path)
      writeJson(res, 200, { content })
      return
    }

    // POST /fs/open { path }
    if (method === 'POST' && url.pathname === '/fs/open') {
      const body = await readJsonBody<{ path?: string }>(req)
      const state = await fsBridge.openDirectory(body.path ?? '')
      writeJson(res, 200, state)
      return
    }

    // POST /fs/close
    if (method === 'POST' && url.pathname === '/fs/close') {
      writeJson(res, 200, fsBridge.closeDirectory())
      return
    }

    res.writeHead(404).end('Not Found')
  } catch (err) {
    if (err instanceof BridgeProtocolError) {
      writeJson(res, 400, { error: err.message, code: err.code })
      return
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AI Bridge] /fs/* error:', msg)
    writeJson(res, 500, { error: msg })
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let buf = ''
    req.on('data', chunk => (buf += chunk))
    req.on('end', () => {
      if (!buf.trim()) {
        // Empty body — return empty object so callers handle missing fields uniformly.
        resolve({} as T)
        return
      }
      try {
        resolve(JSON.parse(buf) as T)
      } catch {
        reject(new BridgeProtocolError('invalid JSON body', 'BAD_REQUEST'))
      }
    })
    req.on('error', reject)
  })
}

server.listen(PORT, () => {
  console.log(`[AI Bridge Server] listening on http://localhost:${PORT}`)
  console.log(`[AI Bridge Server] claude binary: ${CLAUDE_BIN}`)
  console.log('  GET  /agent/check         → { available }')
  console.log('  POST /agent/run           → { session_id, success, output, error }')
  console.log('       body: { prompt, sessionId? }')
  console.log('  POST /export              → application/x-ndjson stream')
  console.log('       body: { files, target, snapshot, projectName? }')
  console.log('  GET  /fs/state            → { open, path, name }')
  console.log('  GET  /fs/recents          → { recents: string[] }')
  console.log('  GET  /fs/tree             → { tree: BridgeTreeItem[] }')
  console.log('  GET  /fs/read?path=…      → { content }')
  console.log('  POST /fs/open             → { open, path, name }')
  console.log('       body: { path }')
  console.log('  POST /fs/close            → { open: false, … }')
})

// Clean shutdown
process.on('SIGINT', () => {
  console.log('\n[AI Bridge Server] shutting down')
  server.close(() => process.exit(0))
})
