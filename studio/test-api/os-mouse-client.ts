/**
 * OS-Mouse Client — browser-side counterpart to
 * `tools/test-runner/os-mouse-bridge.ts`.
 *
 * The Node-side bridge wraps nut-js and drives the macOS cursor for real.
 * Calling `osMouse.click({x, y})` from the browser sends an RPC over the
 * `__osMouseCall` binding, the bridge calls `OsMouse.clickPage(x, y)`,
 * the cursor moves, the OS dispatches the click, and the browser sees a
 * fully native input sequence — exactly as a human user produces.
 *
 * Coordinates are page-space: same coordinate system as
 * `getBoundingClientRect()` / `window.innerWidth`. The bridge handles
 * the page→screen translation via window.screenX/Y.
 *
 * Availability: only when running under the test runner with the
 * `--os-mouse` flag. Outside that, every method rejects clearly so
 * callers fail loud rather than silently downgrading.
 */

// =============================================================================
// Wire-protocol types — must mirror tools/test-runner/os-mouse-bridge.ts
// =============================================================================

export interface OsMousePoint {
  x: number
  y: number
}

export interface OsMouseDragOptions {
  preHoldMs?: number
  dwellMs?: number
  settleMs?: number
  /** Intermediate stops with the button held — visible drag-over states. */
  via?: Array<{ x: number; y: number; pauseMs?: number }>
  /** Hold this modifier for the entire drag. */
  modifier?: 'shift' | 'alt' | 'cmd' | 'ctrl'
}

type Op =
  | 'calibrate'
  | 'moveTo'
  | 'click'
  | 'doubleClick'
  | 'mouseDown'
  | 'mouseUp'
  | 'drag'
  | 'tapKey'
  | 'park'

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: unknown) => void
}

type ResponsePayload = { ok: true; result: unknown } | { ok: false; error: string }

// =============================================================================
// Globals
// =============================================================================

const BINDING_NAME = '__osMouseCall'
const RESPONSE_NAME = '__osMouseResponse'

interface OsMouseGlobals {
  [BINDING_NAME]?: (payload: string) => void
  [RESPONSE_NAME]?: (id: number, payload: ResponsePayload) => void
  __osMousePending?: Map<number, Pending>
  __osMouseNextId?: number
}

function getGlobals(): OsMouseGlobals {
  return globalThis as OsMouseGlobals
}

/**
 * Install the response handler. Idempotent — safe to call multiple times.
 * Idempotency is checked against globals so test resets work correctly.
 */
export function installOsMouseClient(): void {
  const g = getGlobals()
  if (!g.__osMousePending) g.__osMousePending = new Map<number, Pending>()
  if (!g.__osMouseNextId) g.__osMouseNextId = 1
  if (typeof g[RESPONSE_NAME] !== 'function') {
    g[RESPONSE_NAME] = (id: number, payload: ResponsePayload): void => {
      const pending = g.__osMousePending?.get(id)
      if (!pending) return
      g.__osMousePending?.delete(id)
      if (payload.ok) pending.resolve(payload.result)
      else pending.reject(new Error(payload.error))
    }
  }
}

/**
 * Returns true when the Node-side OS-mouse bridge is installed.
 */
export function isOsMouseAvailable(): boolean {
  const g = getGlobals()
  return typeof g[BINDING_NAME] === 'function'
}

// =============================================================================
// Request/response plumbing
// =============================================================================

function call(op: Op, args: unknown): Promise<unknown> {
  installOsMouseClient()

  const g = getGlobals()
  const binding = g[BINDING_NAME]
  if (typeof binding !== 'function') {
    return Promise.reject(
      new Error(
        `OS-mouse bridge not installed (window.${BINDING_NAME} missing). ` +
          'Run via the CDP test runner with --os-mouse, or check ' +
          'isOsMouseAvailable() before calling.'
      )
    )
  }

  const id = (g.__osMouseNextId = (g.__osMouseNextId ?? 1) + 1)
  return new Promise((resolve, reject) => {
    g.__osMousePending!.set(id, { resolve, reject })
    try {
      binding(JSON.stringify({ id, op, args }))
    } catch (e) {
      g.__osMousePending!.delete(id)
      reject(e)
    }
  })
}

// =============================================================================
// Typed public API
// =============================================================================

export const osMouse = {
  /** Re-read window.screenX/Y so the page→screen mapping is current. */
  calibrate(): Promise<void> {
    return call('calibrate', {}) as Promise<void>
  },
  moveTo(point: OsMousePoint): Promise<void> {
    return call('moveTo', point) as Promise<void>
  },
  click(point: OsMousePoint): Promise<void> {
    return call('click', point) as Promise<void>
  },
  doubleClick(point: OsMousePoint): Promise<void> {
    return call('doubleClick', point) as Promise<void>
  },
  mouseDown(): Promise<void> {
    return call('mouseDown', {}) as Promise<void>
  },
  mouseUp(): Promise<void> {
    return call('mouseUp', {}) as Promise<void>
  },
  drag(from: OsMousePoint, to: OsMousePoint, opts: OsMouseDragOptions = {}): Promise<void> {
    return call('drag', {
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      ...opts,
    }) as Promise<void>
  },
  /** Tap a single character or named key (e.g. 'p', 'Escape'). */
  tapKey(letter: string): Promise<void> {
    return call('tapKey', { letter }) as Promise<void>
  },
  /** Park the cursor in a corner so it doesn't sit on a hover target. */
  park(): Promise<void> {
    return call('park', {}) as Promise<void>
  },
}

export type OsMouseAPI = typeof osMouse
