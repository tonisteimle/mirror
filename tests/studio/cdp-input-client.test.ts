/**
 * CDP Input Client tests
 *
 * Verifies the browser-side client wires up correctly:
 *   - response handler is installed on the global
 *   - call without binding rejects with a clear error
 *   - call with mocked binding round-trips through __cdpInputResponse
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  cdpInput,
  installCdpInputClient,
  isCdpInputAvailable,
} from '../../studio/test-api/cdp-input-client'

interface BridgedGlobal {
  __cdpInputCall?: (payload: string) => void
  __cdpInputResponse?: (
    id: number,
    payload: { ok: true; result: unknown } | { ok: false; error: string }
  ) => void
  __cdpInputPending?: Map<number, unknown>
  __cdpInputNextId?: number
}

const g = globalThis as BridgedGlobal

describe('cdp-input-client', () => {
  beforeEach(() => {
    delete g.__cdpInputCall
    delete g.__cdpInputResponse
    delete g.__cdpInputPending
    delete g.__cdpInputNextId
  })

  afterEach(() => {
    delete g.__cdpInputCall
    delete g.__cdpInputResponse
    delete g.__cdpInputPending
    delete g.__cdpInputNextId
  })

  it('install is idempotent and exposes __cdpInputResponse', () => {
    installCdpInputClient()
    installCdpInputClient()
    expect(typeof g.__cdpInputResponse).toBe('function')
  })

  it('isCdpInputAvailable reports false without binding, true with', () => {
    installCdpInputClient()
    expect(isCdpInputAvailable()).toBe(false)
    g.__cdpInputCall = () => {}
    expect(isCdpInputAvailable()).toBe(true)
  })

  it('rejects when no bridge is installed', async () => {
    await expect(cdpInput.mouseClick({ x: 10, y: 10 })).rejects.toThrow(
      /CDP input bridge not installed/
    )
  })

  it('round-trips a mouseClick request through the binding', async () => {
    let captured = ''
    g.__cdpInputCall = (payload: string) => {
      captured = payload
      const req = JSON.parse(payload) as { id: number; op: string; args: unknown }
      // Simulate the Node-side bridge resolving asynchronously
      queueMicrotask(() => {
        g.__cdpInputResponse?.(req.id, { ok: true, result: { ok: true } })
      })
    }

    const result = await cdpInput.mouseClick({ x: 42, y: 7 })
    const decoded = JSON.parse(captured) as {
      id: number
      op: string
      args: { x: number; y: number }
    }

    expect(decoded.op).toBe('mouseClick')
    expect(decoded.args).toEqual({ x: 42, y: 7 })
    expect(typeof decoded.id).toBe('number')
    expect(result).toEqual({ ok: true })
  })

  it('propagates bridge-side errors as Promise rejections', async () => {
    g.__cdpInputCall = (payload: string) => {
      const req = JSON.parse(payload) as { id: number }
      queueMicrotask(() => {
        g.__cdpInputResponse?.(req.id, { ok: false, error: 'boom' })
      })
    }

    await expect(cdpInput.keyDown({ key: 'Enter' })).rejects.toThrow('boom')
  })

  it('supports concurrent calls without id collision', async () => {
    g.__cdpInputCall = (payload: string) => {
      const req = JSON.parse(payload) as { id: number; op: string }
      queueMicrotask(() => {
        g.__cdpInputResponse?.(req.id, { ok: true, result: req.op })
      })
    }

    const [a, b, c] = await Promise.all([
      cdpInput.mouseDown({ x: 1, y: 1 }),
      cdpInput.mouseUp({ x: 1, y: 1 }),
      cdpInput.keyDown({ key: 'Tab' }),
    ])
    expect(a).toBe('mouseDown')
    expect(b).toBe('mouseUp')
    expect(c).toBe('keyDown')
  })
})
