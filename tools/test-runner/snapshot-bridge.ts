/**
 * Snapshot Bridge — Node ↔ browser RPC for capturing & diffing viewport
 * snapshots from in-browser Step-Runner scenarios.
 *
 * Defaults from the runner CLI propagate into the bridge state at install
 * time. Scenarios then call `setConfig` through the binding to override
 * whichever fields they care about — typically `dir` (per-scenario PNG
 * dump location). Fields not set by the scenario fall back to the
 * runner's defaults, so a CLI-only `--snapshot-baseline=DIR` reaches
 * scenarios that didn't think to declare one.
 *
 * Phase 7 closes the headed-mode realism gap: the Step-Runner already
 * validates source code, computed-style, and panel state per step, but
 * cursor smoothness, drop indicators, and animations are only visible
 * in the rendered viewport. This bridge lets a scenario auto-capture a
 * PNG at every expectation boundary and pixel-diff against a baseline.
 *
 * Wire protocol mirrors `cdp-input-bridge.ts`:
 *   - `Runtime.addBinding` named `__snapshotCall`
 *   - Browser sends `{id, op, args}` JSON
 *   - Node responds via `window.__snapshotResponse(id, payload)`
 *
 * Operations:
 *   - `capture` — capture viewport, write to `dir/<filename>`, optionally
 *     pixel-diff against `baselineDir/<filename>`. Returns
 *     `{ path, mismatch?: { diffPixels, totalPixels, ratio, diffPath } }`.
 *   - `setConfig` — set the active dir / baselineDir / threshold so
 *     the scenario can pre-configure once and capture by short labels.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from './types'
import { comparePngBuffers } from './pixel-diff'

interface SnapshotConfig {
  dir: string
  baselineDir?: string
  threshold: number
}

interface CaptureArgs {
  /** Filename without extension; .png is appended. */
  label: string
}

interface SetConfigArgs {
  dir: string
  baselineDir?: string
  threshold?: number
}

export type SnapshotRequest =
  | { id: number; op: 'setConfig'; args: SetConfigArgs }
  | { id: number; op: 'capture'; args: CaptureArgs }

export interface CaptureResult {
  path: string
  mismatch?: {
    diffPixels: number
    totalPixels: number
    ratio: number
    diffPath: string
    sizeMismatch?: boolean
  }
  /** Set when no baseline exists for this label — first run hint. */
  noBaseline?: boolean
}

const BINDING_NAME = '__snapshotCall'

// =============================================================================
// Per-bridge state
// =============================================================================

interface BridgeState {
  config: SnapshotConfig | null
  counter: number
  /** Runner-CLI defaults seeded at install time. */
  defaults?: Partial<SnapshotConfig>
}

function sanitize(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60) || 'snapshot'
  )
}

async function captureScreenshot(cdp: CDPSession): Promise<Buffer> {
  const result = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' })
  return Buffer.from(result.data, 'base64')
}

async function handleCapture(
  cdp: CDPSession,
  state: BridgeState,
  args: CaptureArgs
): Promise<CaptureResult> {
  if (!state.config) {
    throw new Error('Snapshot bridge: capture called before setConfig')
  }

  state.counter += 1
  const seq = String(state.counter).padStart(3, '0')
  const filename = `${seq}-${sanitize(args.label)}.png`

  const png = await captureScreenshot(cdp)

  const fullPath = path.resolve(state.config.dir, filename)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, png)

  if (!state.config.baselineDir) {
    return { path: fullPath }
  }

  const baselinePath = path.resolve(state.config.baselineDir, filename)
  if (!fs.existsSync(baselinePath)) {
    return { path: fullPath, noBaseline: true }
  }

  const baseline = fs.readFileSync(baselinePath)
  const diff = await comparePngBuffers(baseline, png, state.config.threshold)
  if (diff.match) return { path: fullPath }

  const diffPath = path.resolve(state.config.dir, filename.replace(/\.png$/, '.diff.png'))
  if (diff.diffPng) fs.writeFileSync(diffPath, diff.diffPng)
  const ratio = (diff.diffPixels / diff.totalPixels) * 100
  return {
    path: fullPath,
    mismatch: {
      diffPixels: diff.diffPixels,
      totalPixels: diff.totalPixels,
      ratio,
      diffPath,
      ...(diff.sizeMismatch !== undefined ? { sizeMismatch: diff.sizeMismatch } : {}),
    },
  }
}

async function handleRequest(
  cdp: CDPSession,
  state: BridgeState,
  req: SnapshotRequest
): Promise<unknown> {
  switch (req.op) {
    case 'setConfig': {
      // Merge: scenario fields take priority; runner-level defaults fill
      // gaps. So `--snapshot-baseline=DIR` on the CLI reaches scenarios
      // that didn't set `baselineDir` themselves.
      const baselineDir = req.args.baselineDir ?? state.defaults?.baselineDir
      state.config = {
        dir: req.args.dir ?? state.defaults?.dir ?? '',
        ...(baselineDir !== undefined ? { baselineDir } : {}),
        threshold: req.args.threshold ?? state.defaults?.threshold ?? 0.1,
      }
      state.counter = 0
      if (state.config.dir) fs.mkdirSync(state.config.dir, { recursive: true })
      return { ok: true }
    }
    case 'capture':
      return handleCapture(cdp, state, req.args)
    default: {
      const _exhaustive: never = req
      throw new Error(`Unknown snapshot op: ${(_exhaustive as { op: string }).op}`)
    }
  }
}

// =============================================================================
// Bridge installation
// =============================================================================

export async function installSnapshotBridge(
  cdp: CDPSession,
  defaults?: Partial<SnapshotConfig>
): Promise<void> {
  const state: BridgeState = { config: null, counter: 0, ...(defaults ? { defaults } : {}) }

  try {
    await cdp.send('Runtime.addBinding', { name: BINDING_NAME })
  } catch (err) {
    if (!String(err).includes('Binding')) throw err
  }

  cdp.on('Runtime.bindingCalled', async (params: unknown) => {
    const evt = params as { name?: string; payload?: string }
    if (evt.name !== BINDING_NAME) return

    let req: SnapshotRequest
    try {
      req = JSON.parse(evt.payload ?? '{}') as SnapshotRequest
    } catch (e) {
      console.error('[snapshot-bridge] invalid payload:', evt.payload, e)
      return
    }

    try {
      const result = await handleRequest(cdp, state, req)
      await respond(cdp, req.id, { ok: true, result })
    } catch (e) {
      await respond(cdp, req.id, { ok: false, error: String(e) })
    }
  })
}

async function respond(
  cdp: CDPSession,
  id: number,
  payload: { ok: true; result: unknown } | { ok: false; error: string }
): Promise<void> {
  const expr = `window.__snapshotResponse && window.__snapshotResponse(${id}, ${JSON.stringify(payload)})`
  try {
    await cdp.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: false,
      returnByValue: true,
    })
  } catch (e) {
    console.error('[snapshot-bridge] respond failed:', e)
  }
}

export const SNAPSHOT_BINDING_NAME = BINDING_NAME
