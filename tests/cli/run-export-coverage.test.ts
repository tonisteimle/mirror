/**
 * Edge-case coverage for runExportPipeline + the /export HTTP wrapper.
 *
 * The contract tests in `run-export.test.ts` cover the happy paths and
 * the most common error shapes. This suite drills into the seams that
 * matter at production time but rarely fire:
 *
 *   - Path-traversal hardening — a malicious `files` entry like
 *     `../../etc/passwd` MUST NOT escape the temp source dir.
 *   - Empty file content — zero-byte source files are valid input.
 *   - Synchronous buildBundle errors surface as `error` events, not
 *     unhandled rejections.
 *   - Snapshot=true path emits a `snapshot` phase even if the snapshot
 *     tool itself fails (Chrome unavailable in test env).
 *   - HTTP layer end-to-end — a spawned bridge actually answers
 *     /export with NDJSON, proving the route registration works
 *     (the existing browser-test fetch-stub did NOT verify this).
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn, type ChildProcess } from 'child_process'
import {
  runExportPipeline,
  type PhaseEvent,
  type ExportRequest,
} from '../../scripts/ai-bridge/run-export'

let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-export-cov-'))
})

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function captureEmits(): { events: PhaseEvent[]; emit: (e: PhaseEvent) => void } {
  const events: PhaseEvent[] = []
  return { events, emit: (e: PhaseEvent) => events.push(e) }
}

function defaultRequest(over: Partial<ExportRequest>): ExportRequest {
  return {
    files: { 'app.mir': 'canvas mobile' },
    target: 'react',
    snapshot: false,
    projectName: 'cov',
    ...over,
  }
}

describe('runExportPipeline — security', () => {
  it('rejects file paths that escape the temp root via ../', async () => {
    // Use a unique probe name so stale state from earlier failing runs
    // does not leak between mutation iterations.
    const probe = `escape-${Date.now()}-${Math.random().toString(36).slice(2)}.mir`
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(
      defaultRequest({
        files: { [`../../${probe}`]: 'canvas mobile' },
      }),
      emit,
      { tmpRoot }
    )
    expect(result).toBeUndefined()
    const err = events.find(e => e.phase === 'error')
    expect(err).toBeDefined()
    // The escape file MUST NOT exist on disk
    expect(fs.existsSync(path.join(tmpRoot, '..', '..', probe))).toBe(false)
    expect(fs.existsSync(path.join(os.tmpdir(), probe))).toBe(false)
  })

  it('rejects absolute file paths', async () => {
    const { events, emit } = captureEmits()
    const probePath = path.join(os.tmpdir(), 'should-not-exist-' + Date.now() + '.mir')
    const result = await runExportPipeline(
      defaultRequest({ files: { [probePath]: 'canvas mobile' } }),
      emit,
      { tmpRoot }
    )
    expect(result).toBeUndefined()
    expect(events.some(e => e.phase === 'error')).toBe(true)
    expect(fs.existsSync(probePath)).toBe(false)
  })
})

describe('runExportPipeline — robustness', () => {
  it('accepts zero-byte file content as valid', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(defaultRequest({ files: { 'app.mir': '' } }), emit, {
      tmpRoot,
    })
    expect(result).toBeDefined()
    const done = events.find(e => e.phase === 'done')!
    expect(fs.readFileSync(path.join(done.bundlePath!, 'source', 'app.mir'), 'utf8')).toBe('')
  })

  it('does not throw if buildBundle internals fail — surfaces as error event', async () => {
    // Invalid target slipped past the type system (e.g. cast from JSON body).
    const { events, emit } = captureEmits()
    let threw = false
    try {
      await runExportPipeline(
        // @ts-expect-error deliberately bad target
        defaultRequest({ target: 'flutter' }),
        emit,
        { tmpRoot }
      )
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    expect(events.some(e => e.phase === 'error')).toBe(true)
  })

  it('a single bad file does not pollute parallel runs', async () => {
    const a = captureEmits()
    const b = captureEmits()
    const c = captureEmits()
    const [resA, resB, resC] = await Promise.all([
      runExportPipeline(defaultRequest({}), a.emit, { tmpRoot }),
      runExportPipeline(defaultRequest({ files: { '../escape.mir': 'x' } }), b.emit, { tmpRoot }),
      runExportPipeline(defaultRequest({}), c.emit, { tmpRoot }),
    ])
    expect(resA).toBeDefined()
    expect(resB).toBeUndefined()
    expect(resC).toBeDefined()
    expect(resA?.bundlePath).not.toBe(resC?.bundlePath)
  })

  it('snapshot=true emits a `snapshot` phase event before done', async () => {
    // We can't run real Chrome in unit tests, but the phase-event
    // ordering must still hold (snapshot tool either succeeds or
    // emits an error log line and proceeds).
    const { events, emit } = captureEmits()
    await runExportPipeline(defaultRequest({ snapshot: true }), emit, { tmpRoot })
    const phases = events.map(e => e.phase)
    const snapIdx = phases.indexOf('snapshot')
    const doneIdx = phases.lastIndexOf('done')
    // Snapshot phase must appear, and must precede done if both exist.
    expect(snapIdx).toBeGreaterThanOrEqual(0)
    if (doneIdx >= 0) expect(snapIdx).toBeLessThan(doneIdx)
    // Generous: snapshot has its own 120s cap inside the orchestrator;
    // headroom for tsx startup + Chrome attach makes 30s tight.
  }, 180_000)
})

// ---------------------------------------------------------------------------
// HTTP integration — start a real bridge, post a real request
// ---------------------------------------------------------------------------

describe('/export — HTTP integration', () => {
  const PORT = 13_457 + Math.floor(Math.random() * 100)
  let bridge: ChildProcess | null = null

  beforeAll(async () => {
    const repoRoot = path.resolve(__dirname, '..', '..')
    bridge = spawn('npx', ['tsx', path.join(repoRoot, 'scripts/ai-bridge-server.ts')], {
      env: { ...process.env, AI_BRIDGE_PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    // Wait for "listening" line on stdout
    await new Promise<void>((resolvePromise, reject) => {
      const t = setTimeout(() => reject(new Error('bridge boot timeout')), 10_000)
      bridge!.stdout!.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('listening')) {
          clearTimeout(t)
          resolvePromise()
        }
      })
      bridge!.on('error', reject)
    })
  }, 15_000)

  afterAll(() => {
    if (bridge && !bridge.killed) bridge.kill('SIGTERM')
  })

  it('POST /export streams NDJSON ending in a `done` event', async () => {
    const res = await fetch(`http://localhost:${PORT}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { 'app.mir': 'canvas mobile, bg #fff' },
        target: 'react',
        snapshot: false,
        projectName: 'http-test',
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/ndjson/)
    const text = await res.text()
    const lines = text.split('\n').filter(l => l.trim())
    const events = lines.map(l => JSON.parse(l) as PhaseEvent)
    expect(events.some(e => e.phase === 'init')).toBe(true)
    expect(events.some(e => e.phase === 'export')).toBe(true)
    const done = events.find(e => e.phase === 'done')
    expect(done).toBeDefined()
    expect(done!.bundlePath).toBeTruthy()
    // Cleanup the bundle the smoke test created
    if (done?.bundlePath && fs.existsSync(done.bundlePath)) {
      fs.rmSync(done.bundlePath, { recursive: true, force: true })
    }
  }, 20_000)

  it('POST /export with malformed JSON returns 400', async () => {
    const res = await fetch(`http://localhost:${PORT}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  }, 10_000)

  it('POST /export with missing target defaults to react', async () => {
    const res = await fetch(`http://localhost:${PORT}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { 'app.mir': 'canvas mobile' },
        snapshot: false,
      }),
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    const events = text
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as PhaseEvent)
    const init = events.find(e => e.phase === 'init')
    expect(init?.target).toBe('react')
    const done = events.find(e => e.phase === 'done')
    if (done?.bundlePath && fs.existsSync(done.bundlePath)) {
      fs.rmSync(done.bundlePath, { recursive: true, force: true })
    }
  }, 20_000)
})
