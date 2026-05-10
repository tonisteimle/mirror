/**
 * Snapshot Client — browser-side counterpart to
 * `tools/test-runner/snapshot-bridge.ts`.
 *
 * Lets in-browser code (Step-Runner scenarios) trigger viewport
 * snapshots & pixel-diffs via the bridge. Useful when computed-style
 * assertions don't capture the bug — cursor smoothness, drop indicators,
 * focus rings, and animation frames need a real PNG comparison.
 *
 * Availability: only when the test runner was started with
 * `--snapshots=DIR` (Phase 7 CLI flag). Outside that, every method
 * rejects clearly so callers fail loud rather than silently dropping
 * snapshots.
 */

// =============================================================================
// Wire-protocol types
// =============================================================================

export interface SnapshotConfig {
  dir: string
  baselineDir?: string
  threshold?: number
}

export interface CaptureResult {
  path: string
  mismatch?: {
    diffPixels: number
    totalPixels: number
    ratio: number
    diffPath: string
    sizeMismatch?: boolean
  }
  noBaseline?: boolean
}

type Op = 'setConfig' | 'capture'

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: unknown) => void
}

type ResponsePayload = { ok: true; result: unknown } | { ok: false; error: string }

// =============================================================================
// Globals
// =============================================================================

const BINDING_NAME = '__snapshotCall'
const RESPONSE_NAME = '__snapshotResponse'

interface SnapshotGlobals {
  [BINDING_NAME]?: (payload: string) => void
  [RESPONSE_NAME]?: (id: number, payload: ResponsePayload) => void
  __snapshotPending?: Map<number, Pending>
  __snapshotNextId?: number
}

function getGlobals(): SnapshotGlobals {
  return globalThis as SnapshotGlobals
}

/**
 * Install the response handler. Idempotent based on global state so
 * test resets (delete the globals; call install again) work correctly.
 */
export function installSnapshotClient(): void {
  const g = getGlobals()
  if (!g.__snapshotPending) g.__snapshotPending = new Map<number, Pending>()
  if (!g.__snapshotNextId) g.__snapshotNextId = 1
  if (typeof g[RESPONSE_NAME] !== 'function') {
    g[RESPONSE_NAME] = (id: number, payload: ResponsePayload): void => {
      const pending = g.__snapshotPending?.get(id)
      if (!pending) return
      g.__snapshotPending?.delete(id)
      if (payload.ok) pending.resolve(payload.result)
      else pending.reject(new Error(payload.error))
    }
  }
}

/** Returns true when the Node-side snapshot bridge is installed. */
export function isSnapshotAvailable(): boolean {
  const g = getGlobals()
  return typeof g[BINDING_NAME] === 'function'
}

// =============================================================================
// Request/response plumbing
// =============================================================================

function call(op: Op, args: unknown): Promise<unknown> {
  installSnapshotClient()

  const g = getGlobals()
  const binding = g[BINDING_NAME]
  if (typeof binding !== 'function') {
    return Promise.reject(
      new Error(
        `Snapshot bridge not installed (window.${BINDING_NAME} missing). ` +
          'Run via the CDP test runner with --snapshots=DIR, or check ' +
          'isSnapshotAvailable() before calling.'
      )
    )
  }

  const id = (g.__snapshotNextId = (g.__snapshotNextId ?? 1) + 1)
  return new Promise((resolve, reject) => {
    g.__snapshotPending!.set(id, { resolve, reject })
    try {
      binding(JSON.stringify({ id, op, args }))
    } catch (e) {
      g.__snapshotPending!.delete(id)
      reject(e)
    }
  })
}

// =============================================================================
// Typed public API
// =============================================================================

export const snapshotClient = {
  setConfig(config: SnapshotConfig): Promise<void> {
    return call('setConfig', config) as Promise<void>
  },
  capture(label: string): Promise<CaptureResult> {
    return call('capture', { label }) as Promise<CaptureResult>
  },
}

export type SnapshotAPI = typeof snapshotClient
