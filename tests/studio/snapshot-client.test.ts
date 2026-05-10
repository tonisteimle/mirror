/**
 * Snapshot client tests
 *
 * Verifies the browser-side snapshot wrapper:
 *   - install is idempotent and exposes __snapshotResponse
 *   - capture / setConfig forward through the binding
 *   - bridge-side errors propagate as Promise rejections
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  snapshotClient,
  installSnapshotClient,
  isSnapshotAvailable,
} from '../../studio/test-api/snapshot-client'

interface BridgedGlobal {
  __snapshotCall?: (payload: string) => void
  __snapshotResponse?: (
    id: number,
    payload: { ok: true; result: unknown } | { ok: false; error: string }
  ) => void
  __snapshotPending?: Map<number, unknown>
  __snapshotNextId?: number
}

const g = globalThis as BridgedGlobal

interface Captured {
  op: string
  args: Record<string, unknown>
}

function installFakeBridge(reply: (req: Captured) => unknown = () => undefined): Captured[] {
  const log: Captured[] = []
  g.__snapshotCall = (payload: string) => {
    const req = JSON.parse(payload) as { id: number; op: string; args: Captured['args'] }
    log.push({ op: req.op, args: req.args })
    queueMicrotask(() => {
      g.__snapshotResponse?.(req.id, { ok: true, result: reply({ op: req.op, args: req.args }) })
    })
  }
  return log
}

describe('snapshot-client', () => {
  beforeEach(() => {
    delete g.__snapshotCall
    delete g.__snapshotResponse
    delete g.__snapshotPending
    delete g.__snapshotNextId
  })
  afterEach(() => {
    delete g.__snapshotCall
    delete g.__snapshotResponse
    delete g.__snapshotPending
    delete g.__snapshotNextId
  })

  it('install is idempotent', () => {
    installSnapshotClient()
    installSnapshotClient()
    expect(typeof g.__snapshotResponse).toBe('function')
  })

  it('isAvailable mirrors binding presence', () => {
    installSnapshotClient()
    expect(isSnapshotAvailable()).toBe(false)
    g.__snapshotCall = () => {}
    expect(isSnapshotAvailable()).toBe(true)
  })

  it('rejects when no bridge is installed', async () => {
    await expect(snapshotClient.capture('x')).rejects.toThrow(/Snapshot bridge not installed/)
  })

  it('setConfig forwards dir / baselineDir / threshold', async () => {
    const log = installFakeBridge()
    await snapshotClient.setConfig({ dir: 'a', baselineDir: 'b', threshold: 0.05 })
    expect(log).toEqual([
      { op: 'setConfig', args: { dir: 'a', baselineDir: 'b', threshold: 0.05 } },
    ])
  })

  it('capture returns the bridge result', async () => {
    installFakeBridge(req => ({
      path: `/tmp/snapshots/${req.args.label}.png`,
      mismatch: { diffPixels: 5, totalPixels: 100, ratio: 5, diffPath: '/tmp/diff.png' },
    }))
    const result = await snapshotClient.capture('first-step')
    expect(result.path).toBe('/tmp/snapshots/first-step.png')
    expect(result.mismatch?.diffPixels).toBe(5)
  })

  it('propagates bridge errors as Promise rejections', async () => {
    g.__snapshotCall = (payload: string) => {
      const req = JSON.parse(payload) as { id: number }
      queueMicrotask(() => {
        g.__snapshotResponse?.(req.id, { ok: false, error: 'baseline missing' })
      })
    }
    await expect(snapshotClient.capture('x')).rejects.toThrow('baseline missing')
  })
})
