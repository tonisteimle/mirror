/**
 * Trusted Interactions — opt-in CDP-driven user input for browser tests.
 *
 * The existing `Interactions` class dispatches synthetic events
 * (`new MouseEvent(...).dispatchEvent`) — `isTrusted = false`, no native
 * focus, no `dataTransfer` on dragstart, no IME composition. ~225 existing
 * suites depend on those semantics (the altKey-bypass hack, manual
 * `setSelection` / `setEditorFocus` calls). Replacing them in-place would
 * break those suites.
 *
 * `TrustedInteractions` is a *parallel* surface that goes through the CDP
 * Input domain via `cdp-input-client`. New tests use it when they need
 * realism: focus management, dragstart-with-dataTransfer, IME, key
 * shortcuts that the browser handles natively.
 *
 * Available only when the test runner has installed the CDP Input bridge.
 * Outside the runner (`isCdpInputAvailable() === false`) every method
 * rejects with a clear error — there is no synthetic fallback here, so
 * callers can detect the missing bridge instead of silently degrading.
 */

import {
  cdpInput,
  isCdpInputAvailable,
  type CdpKeyArgs,
  type CdpModifiers,
} from './cdp-input-client'

// =============================================================================
// Coordinate helpers
// =============================================================================

export interface ViewportPoint {
  x: number
  y: number
}

/**
 * Compute the viewport-space center of an element identified by node id.
 * Returns `null` if the element is not found.
 *
 * Mirrors the `findElement` resolver used by `Interactions`: supports both
 * regular `node-1` and slot pseudo-IDs `node-1:Slot[:value[:index]]`.
 */
export function coordsOfNode(nodeId: string): ViewportPoint | null {
  const el = findElement(nodeId)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** Compute viewport-space center of any element. */
export function coordsOfElement(el: Element): ViewportPoint {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function findElement(nodeId: string): HTMLElement | null {
  const preview = document.getElementById('preview')
  if (!preview) return null

  if (!nodeId.includes(':')) {
    return preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
  }

  const [parentId, slotName, value, indexStr] = nodeId.split(':')
  const parent = preview.querySelector(`[data-mirror-id="${parentId}"]`)
  if (!parent) return null

  let selector = `[data-slot="${slotName}"]`
  if (value !== undefined && value !== '') selector += `[data-value="${value}"]`

  const elements = parent.querySelectorAll(selector)
  if (elements.length === 0) return null
  if (indexStr !== undefined) {
    const i = parseInt(indexStr, 10)
    return (elements[i] ?? null) as HTMLElement | null
  }
  return elements[0] as HTMLElement
}

// =============================================================================
// Public API
// =============================================================================

export interface TrustedInteractionAPI {
  /** Whether the CDP Input bridge is present (i.e. running under the test runner). */
  isAvailable(): boolean

  /** Viewport-space center of an element by node id, or null if missing. */
  coordsOf(nodeId: string): ViewportPoint | null

  click(target: ViewportPoint | string, opts?: { modifiers?: CdpModifiers }): Promise<void>
  doubleClick(target: ViewportPoint | string): Promise<void>
  mouseDown(target: ViewportPoint | string, opts?: { modifiers?: CdpModifiers }): Promise<void>
  mouseUp(target: ViewportPoint | string, opts?: { modifiers?: CdpModifiers }): Promise<void>
  mouseMove(target: ViewportPoint): Promise<void>
  /**
   * Drag from a source point or node to a target point or node. Issues a real
   * mousedown → mousemove(s) → mouseup sequence — sufficient to fire HTML5
   * `dragstart`/`dragover`/`drop` with proper `dataTransfer`.
   */
  drag(
    from: ViewportPoint | string,
    to: ViewportPoint | string,
    opts?: { steps?: number }
  ): Promise<void>

  /** Focus an element by clicking on it (CDP click runs the full focus pipeline). */
  focus(target: ViewportPoint | string): Promise<void>

  keyDown(key: string, opts?: { modifiers?: CdpModifiers; code?: string }): Promise<void>
  keyUp(key: string, opts?: { modifiers?: CdpModifiers; code?: string }): Promise<void>
  /** keyDown + keyUp (single keystroke). */
  press(key: string, opts?: { modifiers?: CdpModifiers; code?: string }): Promise<void>
  /** Type a string via the IME-friendly insertText path. */
  type(text: string, opts?: { perCharDelay?: number }): Promise<void>

  wheel(point: ViewportPoint, deltaX: number, deltaY: number): Promise<void>
}

function ensureBridge(): void {
  if (!isCdpInputAvailable()) {
    throw new Error(
      'TrustedInteractions: CDP Input bridge not installed. ' +
        'This API requires the CDP test runner. Use `Interactions` for ' +
        'jsdom / regular Studio sessions, or guard with isAvailable().'
    )
  }
}

function resolvePoint(target: ViewportPoint | string): ViewportPoint {
  if (typeof target !== 'string') return target
  const pt = coordsOfNode(target)
  if (!pt) throw new Error(`TrustedInteractions: node ${target} not found`)
  return pt
}

function toKeyArgs(key: string, opts?: { modifiers?: CdpModifiers; code?: string }): CdpKeyArgs {
  const args: CdpKeyArgs = { key }
  if (opts?.code !== undefined) args.code = opts.code
  if (opts?.modifiers !== undefined) args.modifiers = opts.modifiers
  return args
}

export const trustedInteractions: TrustedInteractionAPI = {
  isAvailable: isCdpInputAvailable,
  coordsOf: coordsOfNode,

  async click(target, opts) {
    ensureBridge()
    const pt = resolvePoint(target)
    await cdpInput.mouseClick({ ...pt, modifiers: opts?.modifiers })
  },
  async doubleClick(target) {
    ensureBridge()
    await cdpInput.mouseDoubleClick(resolvePoint(target))
  },
  async mouseDown(target, opts) {
    ensureBridge()
    await cdpInput.mouseDown({ ...resolvePoint(target), modifiers: opts?.modifiers })
  },
  async mouseUp(target, opts) {
    ensureBridge()
    await cdpInput.mouseUp({ ...resolvePoint(target), modifiers: opts?.modifiers })
  },
  async mouseMove(point) {
    ensureBridge()
    await cdpInput.mouseMove(point)
  },
  async drag(from, to, opts) {
    ensureBridge()
    const a = resolvePoint(from)
    const b = resolvePoint(to)
    const steps = Math.max(1, opts?.steps ?? 8)
    await cdpInput.mouseDown(a)
    // Interpolated mousemoves so dragover fires multiple times along the path.
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      await cdpInput.mouseMove({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      })
    }
    await cdpInput.mouseUp(b)
  },
  async focus(target) {
    ensureBridge()
    await cdpInput.focus(resolvePoint(target))
  },
  async keyDown(key, opts) {
    ensureBridge()
    await cdpInput.keyDown(toKeyArgs(key, opts))
  },
  async keyUp(key, opts) {
    ensureBridge()
    await cdpInput.keyUp(toKeyArgs(key, opts))
  },
  async press(key, opts) {
    ensureBridge()
    const args = toKeyArgs(key, opts)
    await cdpInput.keyDown(args)
    await cdpInput.keyUp(args)
  },
  async type(text, opts) {
    ensureBridge()
    await cdpInput.typeText({ text, perCharDelay: opts?.perCharDelay })
  },
  async wheel(point, deltaX, deltaY) {
    ensureBridge()
    await cdpInput.wheel({ ...point, deltaX, deltaY })
  },
}
