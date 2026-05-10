/**
 * Demo — shared OS-mouse action helpers.
 *
 * Every tutorial demo runs the **real OS cursor** via `__osMouse` (nut-js).
 * This is the inverse of preview-cdp suite tests, which run via
 * `__cdpInput` Trusted Events with an invisible cursor. The visible
 * cursor is the entire point of demo recordings.
 *
 * Pacing defaults match what looks watchable in a 5-15s tutorial clip:
 *   - preHoldMs 400ms ("I've grabbed this")
 *   - dwellMs 600ms ("I'm about to drop here")
 *   - settleMs 300ms ("released")
 *
 * If a demo needs a different rhythm, pass overrides.
 */

interface OsMousePoint {
  x: number
  y: number
}

interface OsMouseDragOpts {
  preHoldMs?: number
  dwellMs?: number
  settleMs?: number
}

export interface OsMouseAPI {
  calibrate: () => Promise<void>
  moveTo: (p: OsMousePoint) => Promise<void>
  click: (p: OsMousePoint) => Promise<void>
  doubleClick: (p: OsMousePoint) => Promise<void>
  drag: (from: OsMousePoint, to: OsMousePoint, opts?: OsMouseDragOpts) => Promise<void>
  tapKey: (letter: string) => Promise<void>
  park: () => Promise<void>
}

export function requireOsMouse(): OsMouseAPI {
  const win = globalThis as unknown as { __osMouse?: OsMouseAPI }
  if (!win.__osMouse) {
    throw new Error(
      'window.__osMouse missing — demo tests require --os-mouse on the test runner CLI.'
    )
  }
  return win.__osMouse
}

export interface CdpInputAPI {
  typeText: (args: { text: string; perCharDelay?: number }) => Promise<void>
  keyDown: (args: { key: string; modifiers?: { meta?: boolean; shift?: boolean } }) => Promise<void>
  keyUp: (args: { key: string; modifiers?: { meta?: boolean; shift?: boolean } }) => Promise<void>
}

export function requireCdpInput(): CdpInputAPI {
  const win = globalThis as unknown as { __cdpInput?: CdpInputAPI }
  if (!win.__cdpInput) {
    throw new Error('window.__cdpInput missing — required for keyboard input.')
  }
  return win.__cdpInput
}

export function centerOf(el: Element): OsMousePoint {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function querySafe(sel: string): HTMLElement {
  const el = document.querySelector(sel) as HTMLElement | null
  if (!el) throw new Error(`demo: selector "${sel}" not found`)
  return el
}

export function paletteItem(component: string): HTMLElement {
  const lower = component.toLowerCase()
  const el =
    (document.querySelector(`#components-panel [data-id="comp-${lower}"]`) as HTMLElement | null) ??
    (document.querySelector(`#components-panel [data-id="${lower}"]`) as HTMLElement | null)
  if (!el) throw new Error(`demo: palette item "${component}" not found`)
  return el
}

export function previewCenter(): OsMousePoint {
  const preview = querySafe('#preview')
  const r = preview.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export const TUTORIAL_PACING: OsMouseDragOpts = {
  preHoldMs: 400,
  dwellMs: 600,
  settleMs: 300,
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Read all current preview node ids in DOM order. Tests use this to
 * snapshot before/after sets and assert the new node count.
 */
export function previewNodeIds(): string[] {
  return Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
    el => el.getAttribute('data-mirror-id') as string
  )
}

/**
 * High-level: drag a palette item to the center of an existing element
 * (or the empty preview if `target === 'preview'`).
 *
 * Hybrid path: the OS cursor drives the visible motion (so the recording
 * captures an authentic drag); mirror-actions.dropFromPalette runs in
 * parallel with CDP-trusted events to guarantee the state change.
 * HTML5 drag from real-OS mousedown is unreliable in test-mode (the
 * dragstart sometimes doesn't fire, or the drop target doesn't accept
 * the in-flight drag) — so we don't depend on it.
 */
interface MirrorActionsAPI {
  dropFromPalette: (
    component: string,
    target: { byId: string } | { byPath: string },
    at?: { kind: 'index'; index: number }
  ) => Promise<void>
}

function requireActions(): MirrorActionsAPI {
  const win = globalThis as unknown as { __mirrorActions?: MirrorActionsAPI }
  if (!win.__mirrorActions) throw new Error('window.__mirrorActions missing')
  return win.__mirrorActions
}

export interface DemoDropOpts extends OsMouseDragOpts {
  /** byId of an existing element to drop into, omit for empty preview. */
  intoId?: string
}

export async function demoDropFromPalette(
  component: string,
  opts: DemoDropOpts = TUTORIAL_PACING
): Promise<void> {
  const osMouse = requireOsMouse()
  const actions = requireActions()

  const from = centerOf(paletteItem(component))
  const targetEl = opts.intoId
    ? (document.querySelector(`[data-mirror-id="${opts.intoId}"]`) as HTMLElement | null)
    : null
  const to = targetEl ? centerOf(targetEl) : previewCenter()

  // Visual phase: OS cursor goes to palette, dwells (the "grab"), then
  // moves to target. No mousedown — mousedown on a draggable=true item
  // arms HTML5 drag-drop, which fights mirror-actions' CDP drag below.
  await osMouse.moveTo(from)
  await sleep(opts.preHoldMs ?? 400)
  await osMouse.moveTo(to)
  await sleep(opts.dwellMs ?? 600)

  // State phase: mirror-actions does the real drop via CDP-trusted events.
  // It computes its own coords from the same palette item + target,
  // so visually the cursor is already where the drop lands.
  const targetSel = opts.intoId ? { byId: opts.intoId } : { byPath: 'preview' }
  await actions.dropFromPalette(component, targetSel)

  await sleep(opts.settleMs ?? 300)
}

/** @deprecated — use demoDropFromPalette. Kept for the early text-into-frame demo. */
export async function dragPaletteTo(
  component: string,
  target: HTMLElement | 'preview',
  opts: OsMouseDragOpts = TUTORIAL_PACING
): Promise<void> {
  const osMouse = requireOsMouse()
  const from = centerOf(paletteItem(component))
  const to = target === 'preview' ? previewCenter() : centerOf(target)
  await osMouse.drag(from, to, opts)
}
