/**
 * OS-mouse client tests
 *
 * Verifies the browser-side OS-mouse wrapper:
 *   - install is idempotent and exposes __osMouseResponse
 *   - methods reject with a clear error when the bridge is missing
 *   - drag forwards from/to/options through the wire payload
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  osMouse,
  installOsMouseClient,
  isOsMouseAvailable,
} from '../../studio/test-api/os-mouse-client'

interface BridgedGlobal {
  __osMouseCall?: (payload: string) => void
  __osMouseResponse?: (
    id: number,
    payload: { ok: true; result: unknown } | { ok: false; error: string }
  ) => void
  __osMousePending?: Map<number, unknown>
  __osMouseNextId?: number
}

const g = globalThis as BridgedGlobal

interface Captured {
  op: string
  args: Record<string, unknown>
}

function installFakeBridge(): Captured[] {
  const log: Captured[] = []
  g.__osMouseCall = (payload: string) => {
    const req = JSON.parse(payload) as { id: number; op: string; args: Captured['args'] }
    log.push({ op: req.op, args: req.args })
    queueMicrotask(() => {
      g.__osMouseResponse?.(req.id, { ok: true, result: undefined })
    })
  }
  return log
}

describe('os-mouse-client', () => {
  beforeEach(() => {
    delete g.__osMouseCall
    delete g.__osMouseResponse
    delete g.__osMousePending
    delete g.__osMouseNextId
  })

  afterEach(() => {
    delete g.__osMouseCall
    delete g.__osMouseResponse
    delete g.__osMousePending
    delete g.__osMouseNextId
  })

  it('install is idempotent and exposes the response handler', () => {
    installOsMouseClient()
    installOsMouseClient()
    expect(typeof g.__osMouseResponse).toBe('function')
  })

  it('isAvailable mirrors binding presence', () => {
    installOsMouseClient()
    expect(isOsMouseAvailable()).toBe(false)
    g.__osMouseCall = () => {}
    expect(isOsMouseAvailable()).toBe(true)
  })

  it('rejects when no bridge is installed', async () => {
    await expect(osMouse.click({ x: 10, y: 10 })).rejects.toThrow(/OS-mouse bridge not installed/)
  })

  it('round-trips a click through the binding', async () => {
    const log = installFakeBridge()
    await osMouse.click({ x: 100, y: 200 })
    expect(log).toHaveLength(1)
    expect(log[0].op).toBe('click')
    expect(log[0].args).toEqual({ x: 100, y: 200 })
  })

  it('drag flattens from/to/options into the wire payload', async () => {
    const log = installFakeBridge()
    await osMouse.drag(
      { x: 10, y: 20 },
      { x: 100, y: 80 },
      { preHoldMs: 50, dwellMs: 100, modifier: 'shift' }
    )
    expect(log).toHaveLength(1)
    expect(log[0].op).toBe('drag')
    expect(log[0].args).toEqual({
      fromX: 10,
      fromY: 20,
      toX: 100,
      toY: 80,
      preHoldMs: 50,
      dwellMs: 100,
      modifier: 'shift',
    })
  })

  it('propagates bridge-side errors as Promise rejections', async () => {
    g.__osMouseCall = (payload: string) => {
      const req = JSON.parse(payload) as { id: number }
      queueMicrotask(() => {
        g.__osMouseResponse?.(req.id, { ok: false, error: 'permission denied' })
      })
    }
    await expect(osMouse.calibrate()).rejects.toThrow('permission denied')
  })

  it('supports concurrent calls without id collision', async () => {
    g.__osMouseCall = (payload: string) => {
      const req = JSON.parse(payload) as { id: number; op: string }
      queueMicrotask(() => {
        g.__osMouseResponse?.(req.id, { ok: true, result: req.op })
      })
    }
    const [a, b, c] = await Promise.all([
      osMouse.moveTo({ x: 1, y: 1 }),
      osMouse.click({ x: 2, y: 2 }),
      osMouse.tapKey('a'),
    ])
    expect(a).toBe('moveTo')
    expect(b).toBe('click')
    expect(c).toBe('tapKey')
  })
})
