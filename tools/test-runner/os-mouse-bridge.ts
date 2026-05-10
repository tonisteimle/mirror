/**
 * OS-Mouse Bridge — Node ↔ browser RPC for real-OS-cursor input.
 *
 * Where `cdp-input-bridge.ts` synthesises trusted events at the browser
 * boundary, this bridge drives the actual macOS cursor via nut-js. The
 * browser receives native input events through the OS — Mirror's drag
 * pipeline (HTML5 dragstart on draggable palette items, mousedown/move/
 * up listeners on document) engages exactly as it does for a human user.
 *
 * Use cases:
 *   - HTML5 drag-and-drop with real `dataTransfer` (the Studio palette)
 *   - Capturing video where a visible cursor matters
 *   - Final-fidelity smoke before shipping
 *
 * Cost: requires Accessibility permission for the node process and moves
 * the actual cursor (don't run unattended on a machine you're using).
 *
 * Wire protocol mirrors `cdp-input-bridge.ts`:
 *   - `Runtime.addBinding` named `__osMouseCall`
 *   - Browser sends `{id, op, args}` JSON
 *   - Node responds via `window.__osMouseResponse(id, payload)`
 */

import type { CDPSession } from './types'
import { OsMouse } from './os-mouse'

// =============================================================================
// Wire protocol
// =============================================================================

interface PageMouseArgs {
  /** Page-space x/y coordinate (window.innerWidth/Height space). */
  x: number
  y: number
}

interface DragArgs {
  fromX: number
  fromY: number
  toX: number
  toY: number
  preHoldMs?: number
  dwellMs?: number
  settleMs?: number
  via?: Array<{ x: number; y: number; pauseMs?: number }>
  /** Optional modifier held for the duration of the drag. */
  modifier?: 'shift' | 'alt' | 'cmd' | 'ctrl'
}

export type OsMouseRequest =
  | { id: number; op: 'calibrate'; args: Record<string, never> }
  | { id: number; op: 'moveTo'; args: PageMouseArgs }
  | { id: number; op: 'click'; args: PageMouseArgs }
  | { id: number; op: 'doubleClick'; args: PageMouseArgs }
  | { id: number; op: 'mouseDown'; args: Record<string, never> }
  | { id: number; op: 'mouseUp'; args: Record<string, never> }
  | { id: number; op: 'drag'; args: DragArgs }
  | { id: number; op: 'tapKey'; args: { letter: string } }
  | { id: number; op: 'park'; args: Record<string, never> }

const BINDING_NAME = '__osMouseCall'

// =============================================================================
// Request router
// =============================================================================

async function handleRequest(osMouse: OsMouse, req: OsMouseRequest): Promise<unknown> {
  switch (req.op) {
    case 'calibrate':
      await osMouse.calibrate()
      return { ok: true }
    case 'moveTo':
      await osMouse.moveToPage(req.args.x, req.args.y)
      return { ok: true }
    case 'click':
      await osMouse.clickPage(req.args.x, req.args.y)
      return { ok: true }
    case 'doubleClick':
      await osMouse.doubleClickPage(req.args.x, req.args.y)
      return { ok: true }
    case 'mouseDown':
      await osMouse.pressLeft()
      return { ok: true }
    case 'mouseUp':
      await osMouse.releaseLeft()
      return { ok: true }
    case 'drag': {
      const { fromX, fromY, toX, toY, modifier, ...opts } = req.args
      if (modifier) {
        await osMouse.dragPageWithModifier(fromX, fromY, toX, toY, modifier, opts)
      } else {
        await osMouse.dragPage(fromX, fromY, toX, toY, opts)
      }
      return { ok: true }
    }
    case 'tapKey':
      await osMouse.tapKey(req.args.letter)
      return { ok: true }
    case 'park':
      await osMouse.park()
      return { ok: true }
    default: {
      const _exhaustive: never = req
      throw new Error(`Unknown OS-mouse op: ${(_exhaustive as { op: string }).op}`)
    }
  }
}

// =============================================================================
// Bridge installation
// =============================================================================

/**
 * Install the bridge on a CDP session. Idempotent for a given session.
 *
 * The bridge calibrates on first install (reads window.screenX/Y) so the
 * page-to-screen mapping is correct. Re-calibration after window moves
 * is the caller's responsibility — invoke `calibrate` from the browser
 * client before any cursor work after a window move.
 */
export async function installOsMouseBridge(cdp: CDPSession): Promise<void> {
  const evaluate = async <T>(expression: string): Promise<T> => {
    const result = await cdp.send<{
      result: { value: T }
      exceptionDetails?: { text: string }
    }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  const osMouse = new OsMouse(evaluate)
  await osMouse.calibrate()

  try {
    await cdp.send('Runtime.addBinding', { name: BINDING_NAME })
  } catch (err) {
    if (!String(err).includes('Binding')) throw err
  }

  cdp.on('Runtime.bindingCalled', async (params: unknown) => {
    const evt = params as { name?: string; payload?: string }
    if (evt.name !== BINDING_NAME) return

    let req: OsMouseRequest
    try {
      req = JSON.parse(evt.payload ?? '{}') as OsMouseRequest
    } catch (e) {
      console.error('[os-mouse-bridge] invalid payload:', evt.payload, e)
      return
    }

    try {
      const result = await handleRequest(osMouse, req)
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
  const expr = `window.__osMouseResponse && window.__osMouseResponse(${id}, ${JSON.stringify(payload)})`
  try {
    await cdp.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: false,
      returnByValue: true,
    })
  } catch (e) {
    console.error('[os-mouse-bridge] respond failed:', e)
  }
}

export const OS_MOUSE_BINDING_NAME = BINDING_NAME
