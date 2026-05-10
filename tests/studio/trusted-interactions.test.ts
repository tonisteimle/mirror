/**
 * TrustedInteractions tests
 *
 * Verifies the opt-in CDP-input wrapper:
 *   - throws when bridge is missing
 *   - resolves nodeId targets to viewport coords via the bridge
 *   - drag interpolates correctly
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { trustedInteractions } from '../../studio/test-api/trusted-interactions'

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

interface Captured {
  op: string
  args: { x?: number; y?: number; key?: string; text?: string; deltaX?: number; deltaY?: number }
}

function installFakeBridge(): Captured[] {
  const log: Captured[] = []
  g.__cdpInputCall = (payload: string) => {
    const req = JSON.parse(payload) as { id: number; op: string; args: Captured['args'] }
    log.push({ op: req.op, args: req.args })
    queueMicrotask(() => {
      g.__cdpInputResponse?.(req.id, { ok: true, result: undefined })
    })
  }
  return log
}

describe('trustedInteractions', () => {
  beforeEach(() => {
    delete g.__cdpInputCall
    delete g.__cdpInputResponse
    delete g.__cdpInputPending
    delete g.__cdpInputNextId
    document.body.innerHTML = ''
  })

  afterEach(() => {
    delete g.__cdpInputCall
    delete g.__cdpInputResponse
    delete g.__cdpInputPending
    delete g.__cdpInputNextId
    document.body.innerHTML = ''
  })

  it('isAvailable mirrors the binding presence', () => {
    expect(trustedInteractions.isAvailable()).toBe(false)
    installFakeBridge()
    expect(trustedInteractions.isAvailable()).toBe(true)
  })

  it('throws when bridge is missing', async () => {
    await expect(trustedInteractions.click({ x: 10, y: 10 })).rejects.toThrow(
      /CDP Input bridge not installed/
    )
  })

  it('resolves nodeId targets via the preview DOM', async () => {
    const preview = document.createElement('div')
    preview.id = 'preview'
    const node = document.createElement('div')
    node.setAttribute('data-mirror-id', 'node-1')
    preview.appendChild(node)
    document.body.appendChild(preview)

    // jsdom returns 0×0 rects, so spy on the rect to assert resolution path.
    node.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 40, height: 20, right: 140, bottom: 70 }) as DOMRect

    const log = installFakeBridge()
    await trustedInteractions.click('node-1')
    expect(log).toHaveLength(1)
    expect(log[0].op).toBe('mouseClick')
    expect(log[0].args.x).toBe(120)
    expect(log[0].args.y).toBe(60)
  })

  it('drag interpolates between source and target', async () => {
    const log = installFakeBridge()
    await trustedInteractions.drag({ x: 0, y: 0 }, { x: 100, y: 0 }, { steps: 4 })
    // mouseDown + 4 mouseMoves + mouseUp
    expect(log.map(l => l.op)).toEqual([
      'mouseDown',
      'mouseMove',
      'mouseMove',
      'mouseMove',
      'mouseMove',
      'mouseUp',
    ])
    expect(log[1].args.x).toBe(25)
    expect(log[2].args.x).toBe(50)
    expect(log[3].args.x).toBe(75)
    expect(log[4].args.x).toBe(100)
  })

  it('press emits keyDown then keyUp', async () => {
    const log = installFakeBridge()
    await trustedInteractions.press('Enter', { modifiers: { shift: true } })
    expect(log.map(l => l.op)).toEqual(['keyDown', 'keyUp'])
    expect(log[0].args.key).toBe('Enter')
    expect(log[1].args.key).toBe('Enter')
  })

  it('type forwards via insertText path', async () => {
    const log = installFakeBridge()
    await trustedInteractions.type('hi', { perCharDelay: 5 })
    expect(log).toHaveLength(1)
    expect(log[0].op).toBe('typeText')
    expect(log[0].args.text).toBe('hi')
  })

  it('rejects unknown nodeId', async () => {
    installFakeBridge()
    await expect(trustedInteractions.click('node-missing')).rejects.toThrow(
      /node node-missing not found/
    )
  })
})
