/**
 * CDP Input Bridge — Node ↔ browser RPC for trusted user input
 *
 * Synthetic `dispatchEvent` calls produce events with `isTrusted = false`
 * and skip native focus/IME/drag-data flows. CDP's `Input` domain produces
 * events that are indistinguishable from real OS input — they trigger the
 * full browser input pipeline, including:
 *
 *   - native focus management (no `altKey`-bypass hack needed)
 *   - HTML5 dragstart with proper `dataTransfer` (palette → preview drops)
 *   - IME / composition events (real keyboard layout)
 *   - text-selection ranges
 *   - autofocus / blur / focusin / focusout cascades
 *
 * This file installs a `Runtime.addBinding` named `__cdpInputCall` so
 * in-browser test code can request CDP input commands. Each call carries
 * an `id`; the Node side runs the matching `Input.*` command and
 * resolves the browser-side promise via `Runtime.evaluate` setting
 * `window.__cdpInputResponse(id, result)`.
 *
 * Usage from the test runner:
 *
 *     await installCdpInputBridge(cdp)
 *     // browser code can now call window.__cdpInputCall(...)
 */

import type { CDPSession } from './types'

// =============================================================================
// Wire-protocol types
// =============================================================================

/** What the browser asks for (one per CDP call). */
export type InputRequest =
  | { id: number; op: 'mouseDown'; args: MouseArgs }
  | { id: number; op: 'mouseUp'; args: MouseArgs }
  | { id: number; op: 'mouseMove'; args: MouseArgs }
  | { id: number; op: 'mouseClick'; args: MouseArgs & { clickCount?: number } }
  | { id: number; op: 'mouseDoubleClick'; args: MouseArgs }
  | { id: number; op: 'keyDown'; args: KeyArgs }
  | { id: number; op: 'keyUp'; args: KeyArgs }
  | { id: number; op: 'typeText'; args: { text: string; perCharDelay?: number } }
  | { id: number; op: 'wheel'; args: { x: number; y: number; deltaX: number; deltaY: number } }
  | { id: number; op: 'focus'; args: { x: number; y: number } }

interface MouseArgs {
  x: number
  y: number
  button?: 'left' | 'middle' | 'right'
  modifiers?: Modifiers
  /**
   * CDP `buttons` mask override. By default `mouseMove` reports
   * `buttons: 0` (no button held) and `mouseDown/Up/Click` report
   * `buttons: 1` (left held). For drag motion between mouseDown and
   * mouseUp, callers MUST pass `buttons: 1` so Chrome arms HTML5
   * dragstart/dragover. 0=none, 1=left, 2=right, 4=middle.
   */
  buttons?: number
}

interface KeyArgs {
  /** DOM key string, e.g. "Enter", "Escape", "a", "ArrowDown" */
  key: string
  /** Optional override for the DOM `code` (else inferred from key). */
  code?: string
  modifiers?: Modifiers
}

interface Modifiers {
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}

// =============================================================================
// Modifier-bitmask helper (CDP convention)
// =============================================================================
//
//   1 = Alt, 2 = Ctrl, 4 = Meta/Command, 8 = Shift

function modifiersBit(mods: Modifiers | undefined): number {
  if (!mods) return 0
  let bits = 0
  if (mods.alt) bits |= 1
  if (mods.ctrl) bits |= 2
  if (mods.meta) bits |= 4
  if (mods.shift) bits |= 8
  return bits
}

// =============================================================================
// CDP key-code mapping
// =============================================================================
//
// CDP needs both `key` (DOM key value) and `code` (physical key location).
// For most printable ASCII the mapping is mechanical; for special keys
// CDP also wants `windowsVirtualKeyCode` to dispatch correctly to native
// browser-key-handlers (Tab navigation, Enter on focused button, etc.).

interface KeyDescriptor {
  key: string
  code: string
  windowsVirtualKeyCode?: number
  text?: string
}

function describeKey(key: string, codeOverride?: string): KeyDescriptor {
  // Single printable character: use ASCII upper-case as code.
  if (key.length === 1) {
    const upper = key.toUpperCase()
    const isLetter = /[A-Z]/.test(upper)
    const isDigit = /[0-9]/.test(upper)
    const code =
      codeOverride ?? (isLetter ? `Key${upper}` : isDigit ? `Digit${upper}` : keySymbolToCode(key))
    const desc: KeyDescriptor = {
      key,
      code,
      text: key, // CDP needs `text` so input events carry the character
    }
    if (isLetter) desc.windowsVirtualKeyCode = upper.charCodeAt(0)
    else if (isDigit) desc.windowsVirtualKeyCode = upper.charCodeAt(0)
    return desc
  }

  // Named keys. Subset that covers everything Mirror's keyboard handlers
  // actually listen for (extend as new keys appear).
  const named: Record<string, { code: string; vkc: number; text?: string }> = {
    Enter: { code: 'Enter', vkc: 13, text: '\r' },
    Tab: { code: 'Tab', vkc: 9, text: '\t' },
    Backspace: { code: 'Backspace', vkc: 8 },
    Delete: { code: 'Delete', vkc: 46 },
    Escape: { code: 'Escape', vkc: 27 },
    ArrowUp: { code: 'ArrowUp', vkc: 38 },
    ArrowDown: { code: 'ArrowDown', vkc: 40 },
    ArrowLeft: { code: 'ArrowLeft', vkc: 37 },
    ArrowRight: { code: 'ArrowRight', vkc: 39 },
    Home: { code: 'Home', vkc: 36 },
    End: { code: 'End', vkc: 35 },
    PageUp: { code: 'PageUp', vkc: 33 },
    PageDown: { code: 'PageDown', vkc: 34 },
    Shift: { code: 'ShiftLeft', vkc: 16 },
    Control: { code: 'ControlLeft', vkc: 17 },
    Alt: { code: 'AltLeft', vkc: 18 },
    Meta: { code: 'MetaLeft', vkc: 91 },
    F1: { code: 'F1', vkc: 112 },
    F2: { code: 'F2', vkc: 113 },
    F3: { code: 'F3', vkc: 114 },
    F4: { code: 'F4', vkc: 115 },
    Space: { code: 'Space', vkc: 32, text: ' ' },
    ' ': { code: 'Space', vkc: 32, text: ' ' },
  }
  const def = named[key]
  if (def) {
    const desc: KeyDescriptor = {
      key,
      code: codeOverride ?? def.code,
      windowsVirtualKeyCode: def.vkc,
    }
    if (def.text) desc.text = def.text
    return desc
  }

  // Fallback for unknown keys: pass key through, leave code/vkc unset.
  // CDP will still fire keydown/keyup but native shortcuts may misbehave.
  return { key, code: codeOverride ?? key }
}

function keySymbolToCode(symbol: string): string {
  const map: Record<string, string> = {
    ' ': 'Space',
    ',': 'Comma',
    '.': 'Period',
    ';': 'Semicolon',
    "'": 'Quote',
    '`': 'Backquote',
    '-': 'Minus',
    '=': 'Equal',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '\\': 'Backslash',
    '/': 'Slash',
  }
  return map[symbol] ?? `Key${symbol.toUpperCase()}`
}

// =============================================================================
// CDP-level Input dispatchers
// =============================================================================

async function dispatchMouse(
  cdp: CDPSession,
  type: 'mousePressed' | 'mouseReleased' | 'mouseMoved',
  args: MouseArgs & { clickCount?: number }
): Promise<void> {
  // Default buttons mask: mousePressed/Released = 1 (left), mouseMoved = 0
  // (no button). Override via args.buttons when dragging — moves between
  // mouseDown/Up MUST carry buttons=1 so Chrome arms HTML5 dragstart.
  const defaultButtons = type === 'mouseMoved' ? 0 : 1
  await cdp.send('Input.dispatchMouseEvent', {
    type,
    x: args.x,
    y: args.y,
    button: args.button ?? (type === 'mouseMoved' && (args.buttons ?? 0) === 0 ? 'none' : 'left'),
    buttons: args.buttons ?? defaultButtons,
    clickCount: args.clickCount ?? (type === 'mouseMoved' ? 0 : 1),
    modifiers: modifiersBit(args.modifiers),
  })
}

async function dispatchKey(
  cdp: CDPSession,
  type: 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char',
  args: KeyArgs
): Promise<void> {
  const desc = describeKey(args.key, args.code)
  const params: Record<string, unknown> = {
    type,
    key: desc.key,
    code: desc.code,
    modifiers: modifiersBit(args.modifiers),
  }
  if (desc.windowsVirtualKeyCode !== undefined) {
    params.windowsVirtualKeyCode = desc.windowsVirtualKeyCode
    params.nativeVirtualKeyCode = desc.windowsVirtualKeyCode
  }
  if (desc.text !== undefined && (type === 'keyDown' || type === 'char')) {
    params.text = desc.text
  }
  await cdp.send('Input.dispatchKeyEvent', params)
}

async function typeText(cdp: CDPSession, text: string, perCharDelayMs: number): Promise<void> {
  for (const char of text) {
    // For simple printable text, `Input.insertText` is the cleanest path —
    // it synthesizes the full keydown/keypress/input/keyup sequence the
    // way the browser does for IME-composed text. Falls back to keyDown
    // for newlines, which `insertText` doesn't propagate as Enter.
    if (char === '\n' || char === '\r') {
      await dispatchKey(cdp, 'keyDown', { key: 'Enter' })
      await dispatchKey(cdp, 'keyUp', { key: 'Enter' })
    } else {
      await cdp.send('Input.insertText', { text: char })
    }
    if (perCharDelayMs > 0) await new Promise(r => setTimeout(r, perCharDelayMs))
  }
}

// =============================================================================
// Request router
// =============================================================================

async function handleRequest(cdp: CDPSession, req: InputRequest): Promise<unknown> {
  switch (req.op) {
    case 'mouseDown':
      await dispatchMouse(cdp, 'mousePressed', req.args)
      return { ok: true }
    case 'mouseUp':
      await dispatchMouse(cdp, 'mouseReleased', req.args)
      return { ok: true }
    case 'mouseMove':
      await dispatchMouse(cdp, 'mouseMoved', req.args)
      return { ok: true }
    case 'mouseClick':
      await dispatchMouse(cdp, 'mousePressed', {
        ...req.args,
        clickCount: req.args.clickCount ?? 1,
      })
      await dispatchMouse(cdp, 'mouseReleased', {
        ...req.args,
        clickCount: req.args.clickCount ?? 1,
      })
      return { ok: true }
    case 'mouseDoubleClick':
      // dblclick fires from the user agent when two clicks occur in quick
      // succession with clickCount=2 on the second press/release pair.
      await dispatchMouse(cdp, 'mousePressed', { ...req.args, clickCount: 1 })
      await dispatchMouse(cdp, 'mouseReleased', { ...req.args, clickCount: 1 })
      await dispatchMouse(cdp, 'mousePressed', { ...req.args, clickCount: 2 })
      await dispatchMouse(cdp, 'mouseReleased', { ...req.args, clickCount: 2 })
      return { ok: true }
    case 'keyDown':
      await dispatchKey(cdp, 'keyDown', req.args)
      return { ok: true }
    case 'keyUp':
      await dispatchKey(cdp, 'keyUp', req.args)
      return { ok: true }
    case 'typeText':
      await typeText(cdp, req.args.text, req.args.perCharDelay ?? 0)
      return { ok: true }
    case 'wheel':
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: req.args.x,
        y: req.args.y,
        deltaX: req.args.deltaX,
        deltaY: req.args.deltaY,
      })
      return { ok: true }
    case 'focus':
      // Focus via a single click at the target point — simplest reliable
      // path. Trusted click runs the full focus pipeline.
      await dispatchMouse(cdp, 'mousePressed', req.args)
      await dispatchMouse(cdp, 'mouseReleased', req.args)
      return { ok: true }
    default: {
      const _exhaustive: never = req
      throw new Error(`Unknown CDP input op: ${(_exhaustive as { op: string }).op}`)
    }
  }
}

// =============================================================================
// Bridge installation
// =============================================================================

const BINDING_NAME = '__cdpInputCall'

/**
 * Install the bridge on a CDP session. Browser code can then call
 * `window.__cdpInputCall(JSON.stringify(request))` and await the
 * Promise returned by the helper that the matching client installs.
 *
 * Idempotent for a given session — calling twice is a no-op.
 */
export async function installCdpInputBridge(cdp: CDPSession): Promise<void> {
  // Add the binding. Once added, every call from `window.<name>(...)`
  // arrives as `Runtime.bindingCalled` event.
  try {
    await cdp.send('Runtime.addBinding', { name: BINDING_NAME })
  } catch (err) {
    // Re-running on an already-bridged session may throw; ignore.
    if (!String(err).includes('Binding')) throw err
  }

  cdp.on('Runtime.bindingCalled', async (params: unknown) => {
    const evt = params as { name?: string; payload?: string }
    if (evt.name !== BINDING_NAME) return

    let req: InputRequest
    try {
      req = JSON.parse(evt.payload ?? '{}') as InputRequest
    } catch (e) {
      console.error('[cdp-input-bridge] invalid payload:', evt.payload, e)
      return
    }

    try {
      const result = await handleRequest(cdp, req)
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
  // Send the response back via a global `__cdpInputResponse(id, payload)`
  // that the client installs. We JSON-encode so the expression is a single
  // safe string to feed into Runtime.evaluate.
  const expr = `window.__cdpInputResponse && window.__cdpInputResponse(${id}, ${JSON.stringify(payload)})`
  try {
    await cdp.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: false,
      returnByValue: true,
    })
  } catch (e) {
    // Page navigation in flight, etc. — don't crash the bridge.
    console.error('[cdp-input-bridge] respond failed:', e)
  }
}

// Re-exported so tests / callers can construct typed requests if they
// want; the wire format is JSON regardless.
export const CDP_INPUT_BINDING_NAME = BINDING_NAME
