/**
 * CDP Input Client — browser-side counterpart to `tools/test-runner/cdp-input-bridge.ts`.
 *
 * The Node-side bridge exposes a `Runtime.addBinding` named `__cdpInputCall`.
 * Calling that binding from the browser triggers a real CDP `Input.*` command
 * — events arrive at the page with `isTrusted = true` and run through the
 * native input pipeline (focus management, dragstart `dataTransfer`, IME, …).
 *
 * This module:
 *   1. Installs `window.__cdpInputResponse(id, payload)` so the bridge can
 *      resolve the browser-side Promise after running its CDP command.
 *   2. Exposes a typed `cdpInput` API that wraps `__cdpInputCall` with
 *      promise-based ergonomics — `await cdpInput.mouseClick({x, y})`.
 *
 * Availability: `cdpInput` only works when the bridge is installed (i.e.
 * the test runner has called `installCdpInputBridge(cdp)`). In a normal
 * studio session — or in unit tests — the binding is missing; consumers
 * should gate via `isCdpInputAvailable()` and fall back to synthetic events.
 */

// =============================================================================
// Wire-protocol types — must mirror tools/test-runner/cdp-input-bridge.ts
// =============================================================================

export interface CdpModifiers {
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}

export interface CdpMouseArgs {
  x: number
  y: number
  button?: 'left' | 'middle' | 'right'
  modifiers?: CdpModifiers
}

export interface CdpKeyArgs {
  key: string
  code?: string
  modifiers?: CdpModifiers
}

type Op =
  | 'mouseDown'
  | 'mouseUp'
  | 'mouseMove'
  | 'mouseClick'
  | 'mouseDoubleClick'
  | 'keyDown'
  | 'keyUp'
  | 'typeText'
  | 'wheel'
  | 'focus'

interface Pending {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

// =============================================================================
// Globals — installed lazily on first use
// =============================================================================

const BINDING_NAME = '__cdpInputCall'
const RESPONSE_NAME = '__cdpInputResponse'

interface CdpGlobals {
  [BINDING_NAME]?: (payload: string) => void
  [RESPONSE_NAME]?: (id: number, payload: ResponsePayload) => void
  __cdpInputPending?: Map<number, Pending>
  __cdpInputNextId?: number
}

type ResponsePayload = { ok: true; result: unknown } | { ok: false; error: string }

function getGlobals(): CdpGlobals {
  return globalThis as CdpGlobals
}

/**
 * Install the response handler. Idempotent — safe to call multiple times.
 * Must run before the first `cdpInput.*` call so the bridge can resolve.
 *
 * Idempotency is checked against the globals themselves, not a module-local
 * flag, so resetting the globals (e.g. between unit tests) works correctly.
 */
export function installCdpInputClient(): void {
  const g = getGlobals()
  if (!g.__cdpInputPending) g.__cdpInputPending = new Map<number, Pending>()
  if (!g.__cdpInputNextId) g.__cdpInputNextId = 1
  if (typeof g[RESPONSE_NAME] !== 'function') {
    g[RESPONSE_NAME] = (id: number, payload: ResponsePayload): void => {
      const pending = g.__cdpInputPending?.get(id)
      if (!pending) return
      g.__cdpInputPending?.delete(id)
      if (payload.ok) pending.resolve(payload.result)
      else pending.reject(new Error(payload.error))
    }
  }
}

/**
 * Returns true when the Node-side CDP bridge is installed.
 * Use this to gate CDP-input usage in code that also has a synthetic
 * fallback (so unit tests / regular Studio sessions still work).
 */
export function isCdpInputAvailable(): boolean {
  const g = getGlobals()
  return typeof g[BINDING_NAME] === 'function'
}

// =============================================================================
// Request/response plumbing
// =============================================================================

function call(op: Op, args: unknown): Promise<unknown> {
  installCdpInputClient()

  const g = getGlobals()
  const binding = g[BINDING_NAME]
  if (typeof binding !== 'function') {
    return Promise.reject(
      new Error(
        `CDP input bridge not installed (window.${BINDING_NAME} missing). ` +
          'Run via the CDP test runner, or check isCdpInputAvailable() before calling.'
      )
    )
  }

  const id = (g.__cdpInputNextId = (g.__cdpInputNextId ?? 1) + 1)
  return new Promise((resolve, reject) => {
    g.__cdpInputPending!.set(id, { resolve, reject })
    try {
      binding(JSON.stringify({ id, op, args }))
    } catch (e) {
      g.__cdpInputPending!.delete(id)
      reject(e)
    }
  })
}

// =============================================================================
// Typed public API
// =============================================================================

export const cdpInput = {
  mouseDown(args: CdpMouseArgs): Promise<void> {
    return call('mouseDown', args) as Promise<void>
  },
  mouseUp(args: CdpMouseArgs): Promise<void> {
    return call('mouseUp', args) as Promise<void>
  },
  mouseMove(args: CdpMouseArgs): Promise<void> {
    return call('mouseMove', args) as Promise<void>
  },
  mouseClick(args: CdpMouseArgs & { clickCount?: number }): Promise<void> {
    return call('mouseClick', args) as Promise<void>
  },
  mouseDoubleClick(args: CdpMouseArgs): Promise<void> {
    return call('mouseDoubleClick', args) as Promise<void>
  },
  keyDown(args: CdpKeyArgs): Promise<void> {
    return call('keyDown', args) as Promise<void>
  },
  keyUp(args: CdpKeyArgs): Promise<void> {
    return call('keyUp', args) as Promise<void>
  },
  typeText(args: { text: string; perCharDelay?: number }): Promise<void> {
    return call('typeText', args) as Promise<void>
  },
  wheel(args: { x: number; y: number; deltaX: number; deltaY: number }): Promise<void> {
    return call('wheel', args) as Promise<void>
  },
  focus(args: { x: number; y: number }): Promise<void> {
    return call('focus', args) as Promise<void>
  },
}

export type CdpInputAPI = typeof cdpInput
