/**
 * Export-pipeline orchestration for the AI bridge.
 *
 * The Studio export-button POSTs files + target settings to the bridge
 * `/export` endpoint and consumes a stream of phase events. This module
 * provides the pure orchestration core — no HTTP, no I/O abstractions
 * beyond fs/spawn — that the HTTP wrapper in `ai-bridge-server.ts`
 * adapts onto NDJSON.
 *
 * Why a separate module: the orchestration deserves unit tests that
 * don't need an HTTP server. By taking a generic `emit` callback, we
 * exercise every phase event in isolation. The HTTP layer becomes a
 * thin adapter that wires emit → stream-write.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildBundle } from '../../tools/export'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')

const VALID_TARGETS = ['react', 'vue', 'svelte', 'vanilla'] as const
type Target = (typeof VALID_TARGETS)[number]

export interface ExportRequest {
  files: Record<string, string>
  target: Target
  snapshot: boolean
  projectName?: string
}

export interface PhaseEvent {
  phase: 'init' | 'write-files' | 'export' | 'snapshot' | 'log' | 'done' | 'error'
  message?: string
  error?: string
  bundlePath?: string
  command?: string
  target?: string
  snapshot?: boolean
  fileCount?: number
  step?: string
  stream?: 'stdout' | 'stderr'
}

export type EmitFn = (e: PhaseEvent) => void

export interface ExportResult {
  bundlePath: string
  command: string
}

interface RunOptions {
  tmpRoot?: string
}

function buildClaudeCommand(bundlePath: string): string {
  // Heredoc-form prompt — same shape the README inside the bundle prints,
  // but inlined so the user can copy-paste from the dialog directly.
  return [
    `cd ${bundlePath} && claude --print "$(cat <<'EOF'`,
    `Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*, and`,
    `visual-reference.html (if present). Execute the pipeline in`,
    `INSTRUCTIONS.md, gating on each step. Use Write/Edit/Bash to create`,
    `files in ./generated/.`,
    `EOF`,
    `)"`,
  ].join('\n')
}

async function runSnapshot(sourceDir: string, bundleDir: string, emit: EmitFn): Promise<boolean> {
  const snapshotDir = path.join(bundleDir, 'render-snapshot')
  fs.mkdirSync(snapshotDir, { recursive: true })
  const snapshotCli = path.join(REPO_ROOT, 'tools', 'snapshot.ts')
  if (!fs.existsSync(snapshotCli)) {
    emit({ phase: 'log', stream: 'stderr', message: 'snapshot tool missing — skipping' })
    return false
  }

  return await new Promise<boolean>(resolvePromise => {
    const proc = spawn('npx', ['tsx', snapshotCli, sourceDir, '--out', snapshotDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    proc.stdout.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (!line.trim()) continue
        emit({ phase: 'log', stream: 'stdout', message: line })
        // Surface per-viewport progress so the UI can advance the bar.
        for (const step of ['mobile', 'tablet', 'desktop']) {
          if (line.toLowerCase().includes(step)) {
            emit({ phase: 'snapshot', step })
            break
          }
        }
      }
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim()) emit({ phase: 'log', stream: 'stderr', message: line })
      }
    })
    proc.on('error', err => {
      emit({ phase: 'log', stream: 'stderr', message: `snapshot spawn failed: ${err.message}` })
      resolvePromise(false)
    })
    proc.on('exit', code => resolvePromise(code === 0))
  })
}

/**
 * Orchestrate one export run.
 *
 *   1. Validate input (files non-empty, target in allowlist).
 *   2. Materialize files into a temp source dir.
 *   3. buildBundle(...) — synchronous, throws on bad input.
 *   4. Optionally invoke snapshot.ts via spawn, streaming logs.
 *   5. Emit `done` with bundlePath + claude-invocation command.
 *
 * Source temp-dir is deleted after the run; bundle dir is preserved
 * so the agent (or the user) can use it.
 */
export async function runExportPipeline(
  req: ExportRequest,
  emit: EmitFn,
  opts: RunOptions = {}
): Promise<ExportResult | undefined> {
  // --- input validation -----------------------------------------------------
  if (!req.files || Object.keys(req.files).length === 0) {
    emit({ phase: 'error', error: 'no files provided' })
    return undefined
  }
  if (!VALID_TARGETS.includes(req.target)) {
    emit({ phase: 'error', error: `invalid target: ${String(req.target)}` })
    return undefined
  }
  // Reject absolute paths and parent-traversal segments BEFORE we touch
  // disk — every key in req.files becomes a path under tmpProj, and a
  // malicious caller could otherwise overwrite arbitrary files.
  for (const relPath of Object.keys(req.files)) {
    if (path.isAbsolute(relPath)) {
      emit({ phase: 'error', error: `absolute paths not allowed: ${relPath}` })
      return undefined
    }
    const segments = relPath.split(/[/\\]/)
    if (segments.some(s => s === '..')) {
      emit({ phase: 'error', error: `path traversal not allowed: ${relPath}` })
      return undefined
    }
  }

  const fileCount = Object.keys(req.files).length
  emit({ phase: 'init', target: req.target, snapshot: req.snapshot, fileCount })

  const tmpRoot = opts.tmpRoot ?? os.tmpdir()
  const tmpProj = fs.mkdtempSync(path.join(tmpRoot, 'mirror-export-src-'))
  const bundleDir = fs.mkdtempSync(path.join(tmpRoot, 'mirror-export-bundle-'))

  try {
    emit({ phase: 'write-files', message: `${fileCount} Datei(en) → temp` })
    for (const [relPath, content] of Object.entries(req.files)) {
      const full = path.join(tmpProj, relPath)
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, content, 'utf8')
    }

    emit({ phase: 'export', message: `Bundle bauen (${req.target})` })
    let bundleResult: { outAbs: string; fileCount: number }
    try {
      bundleResult = buildBundle({
        projectDir: tmpProj,
        outDir: bundleDir,
        target: req.target,
        styling: 'tailwind',
        typescript: true,
        visualReference: null,
        snapshot: false, // we orchestrate snapshot ourselves
        incremental: false,
        run: false,
        help: false,
      })
    } catch (err) {
      emit({ phase: 'error', error: (err as Error).message })
      return undefined
    }
    emit({
      phase: 'log',
      stream: 'stdout',
      message: `📦 Bundle written: ${bundleResult.outAbs} (${bundleResult.fileCount} source files)`,
    })

    if (req.snapshot) {
      emit({ phase: 'snapshot', message: 'capturing render-snapshot' })
      const ok = await runSnapshot(tmpProj, bundleResult.outAbs, emit)
      if (!ok) {
        emit({
          phase: 'log',
          stream: 'stderr',
          message: 'snapshot capture failed — continuing without',
        })
      }
    }

    const command = buildClaudeCommand(bundleResult.outAbs)
    emit({ phase: 'done', bundlePath: bundleResult.outAbs, command })
    return { bundlePath: bundleResult.outAbs, command }
  } catch (err) {
    emit({ phase: 'error', error: (err as Error).message })
    return undefined
  } finally {
    try {
      fs.rmSync(tmpProj, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}
