/**
 * Contract for the bridge `/export` orchestration function.
 *
 * The Studio export-button POSTs `{ files, target, snapshot, projectName }`
 * to BRIDGE_URL/export and consumes an NDJSON stream of phase events:
 *   init → write-files → export [→ snapshot] → done | error
 *
 * Until this commit, the bridge had NO /export route — the button always
 * 404'd in production. Browser tests masked the gap with a fetch stub.
 *
 * `runExportPipeline()` is the pure orchestration core: it accepts the
 * request payload + an `emit(event)` callback, writes the supplied files
 * to a temp dir, calls buildBundle, and emits the same phase sequence the
 * UI consumes. Pure-function shape makes this unit-testable without
 * starting an HTTP server.
 *
 * The thin HTTP wrapper in `ai-bridge-server.ts` adapts emit → NDJSON
 * write-to-response.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  runExportPipeline,
  type PhaseEvent,
  type ExportRequest,
} from '../../scripts/ai-bridge/run-export'

let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-export-pipe-'))
})

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function captureEmits(): {
  events: PhaseEvent[]
  emit: (e: PhaseEvent) => void
} {
  const events: PhaseEvent[] = []
  return { events, emit: (e: PhaseEvent) => events.push(e) }
}

const MINIMAL_FILES = {
  'app.mir': 'canvas mobile, bg #1a1a1a\nText "Hello", col white, fs 24\n',
}

function defaultRequest(over: Partial<ExportRequest>): ExportRequest {
  return {
    files: MINIMAL_FILES,
    target: 'react',
    snapshot: false,
    projectName: 'test-project',
    ...over,
  }
}

describe('runExportPipeline — happy path', () => {
  it('emits init → write-files → export → done in order', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(defaultRequest({}), emit, { tmpRoot })
    expect(result).toBeDefined()
    const phases = events.map(e => e.phase)
    // Must contain these in order (logs may be interleaved between phases)
    const required = ['init', 'write-files', 'export', 'done'] as const
    let cursor = 0
    for (const want of required) {
      const idx = phases.indexOf(want, cursor)
      expect(idx, `phase ${want} not found after position ${cursor}`).toBeGreaterThanOrEqual(0)
      cursor = idx
    }
  })

  it('init event carries target + snapshot + fileCount', async () => {
    const { events, emit } = captureEmits()
    await runExportPipeline(
      defaultRequest({
        target: 'svelte',
        snapshot: false,
        files: { 'app.mir': 'canvas mobile', 'tokens.tok': 'p.bg: #fff' },
      }),
      emit,
      { tmpRoot }
    )
    const init = events.find(e => e.phase === 'init')!
    expect(init.target).toBe('svelte')
    expect(init.snapshot).toBe(false)
    expect(init.fileCount).toBe(2)
  })

  it('done event includes a bundlePath that exists on disk', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(defaultRequest({}), emit, { tmpRoot })
    const done = events.find(e => e.phase === 'done')!
    expect(done.bundlePath).toBeTruthy()
    expect(fs.existsSync(done.bundlePath!)).toBe(true)
    expect(fs.existsSync(path.join(done.bundlePath!, 'INSTRUCTIONS.md'))).toBe(true)
    expect(fs.existsSync(path.join(done.bundlePath!, 'manifest.json'))).toBe(true)
    expect(result?.bundlePath).toBe(done.bundlePath)
  })

  it('done.command references INSTRUCTIONS.md and the bundlePath', async () => {
    const { events, emit } = captureEmits()
    await runExportPipeline(defaultRequest({}), emit, { tmpRoot })
    const done = events.find(e => e.phase === 'done')!
    expect(done.command).toMatch(/INSTRUCTIONS\.md/)
    expect(done.command).toContain(done.bundlePath!)
  })

  it('files written to bundle source/ match the input', async () => {
    const { events, emit } = captureEmits()
    await runExportPipeline(
      defaultRequest({
        files: {
          'app.mir': 'canvas mobile',
          'tokens.tok': 'primary.bg: #2271C1',
          'screens/home.mir': 'canvas tablet',
        },
      }),
      emit,
      { tmpRoot }
    )
    const done = events.find(e => e.phase === 'done')!
    const sourceDir = path.join(done.bundlePath!, 'source')
    expect(fs.readFileSync(path.join(sourceDir, 'app.mir'), 'utf8')).toBe('canvas mobile')
    expect(fs.readFileSync(path.join(sourceDir, 'tokens.tok'), 'utf8')).toBe('primary.bg: #2271C1')
    expect(fs.readFileSync(path.join(sourceDir, 'screens', 'home.mir'), 'utf8')).toBe(
      'canvas tablet'
    )
  })

  it('manifest.target reflects the requested target', async () => {
    const { events, emit } = captureEmits()
    await runExportPipeline(defaultRequest({ target: 'vue' }), emit, { tmpRoot })
    const done = events.find(e => e.phase === 'done')!
    const m = JSON.parse(fs.readFileSync(path.join(done.bundlePath!, 'manifest.json'), 'utf8'))
    expect(m.target).toBe('vue')
  })
})

describe('runExportPipeline — input validation', () => {
  it('emits error and resolves undefined when files is empty', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(defaultRequest({ files: {} }), emit, { tmpRoot })
    expect(result).toBeUndefined()
    const err = events.find(e => e.phase === 'error')
    expect(err).toBeDefined()
    expect(err!.error).toMatch(/no files|empty/i)
    // Must not have proceeded past init
    expect(events.some(e => e.phase === 'done')).toBe(false)
  })

  it('emits error for invalid target', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(
      // @ts-expect-error intentional bad target
      defaultRequest({ target: 'angular' }),
      emit,
      { tmpRoot }
    )
    expect(result).toBeUndefined()
    const err = events.find(e => e.phase === 'error')
    expect(err).toBeDefined()
    expect(err!.error).toMatch(/target/i)
  })

  it('emits error when no Mirror files (only non-Mirror extensions)', async () => {
    const { events, emit } = captureEmits()
    const result = await runExportPipeline(
      defaultRequest({ files: { 'README.txt': 'unrelated' } }),
      emit,
      { tmpRoot }
    )
    expect(result).toBeUndefined()
    const err = events.find(e => e.phase === 'error')
    expect(err).toBeDefined()
  })
})

describe('runExportPipeline — isolation', () => {
  it('two parallel runs produce distinct bundlePaths', async () => {
    const a = captureEmits()
    const b = captureEmits()
    const [resA, resB] = await Promise.all([
      runExportPipeline(defaultRequest({}), a.emit, { tmpRoot }),
      runExportPipeline(defaultRequest({}), b.emit, { tmpRoot }),
    ])
    expect(resA?.bundlePath).toBeTruthy()
    expect(resB?.bundlePath).toBeTruthy()
    expect(resA?.bundlePath).not.toBe(resB?.bundlePath)
    // Both bundles exist on disk
    expect(fs.existsSync(resA!.bundlePath)).toBe(true)
    expect(fs.existsSync(resB!.bundlePath)).toBe(true)
  })

  it('cleans up source temp-dir but preserves the bundle', async () => {
    const { events, emit } = captureEmits()
    await runExportPipeline(defaultRequest({}), emit, { tmpRoot })
    const done = events.find(e => e.phase === 'done')!
    // Bundle must survive (agent uses it next)
    expect(fs.existsSync(done.bundlePath!)).toBe(true)
    // Inside tmpRoot only the bundle dir(s) should remain — sources cleaned up
    const remaining = fs.readdirSync(tmpRoot)
    const bundles = remaining.filter(n => n.includes('bundle'))
    const sources = remaining.filter(n => n.includes('src'))
    expect(bundles.length).toBeGreaterThanOrEqual(1)
    expect(sources.length).toBe(0)
  })
})
