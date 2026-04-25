/**
 * OS-level mouse driver for demo runs.
 *
 * Uses nut-js to drive the actual macOS cursor. The browser receives
 * native input events — Mirror's drag pipeline (HTML5 dragstart on
 * draggable palette items, mousedown/move/up listeners on document)
 * engages 100% naturally.
 *
 * Coordinates: nut-js uses screen coordinates (logical points). We
 * convert browser page coordinates to screen coordinates by reading
 * window.screenX/Y plus the chrome offset.
 *
 * Requires Accessibility permission for the process running node
 * (System Settings → Privacy & Security → Accessibility).
 */

import { mouse, Point, straightTo, Button, keyboard, Key } from '@nut-tree-fork/nut-js'

export interface OsMouseOffset {
  /** Screen X of the viewport's top-left in CSS points. */
  x: number
  /** Screen Y of the viewport's top-left. */
  y: number
}

/** Minimum interface we need from the demo runner: evaluate JS in the page. */
export type EvaluateFn = <T>(expression: string) => Promise<T>

export class OsMouse {
  private offset: OsMouseOffset = { x: 0, y: 0 }
  private evaluate: EvaluateFn

  constructor(evaluate: EvaluateFn) {
    this.evaluate = evaluate
    // mouseSpeed in px/s — nut-js's "smooth" motion divides distance by this.
    // 1500 ≈ "deliberate but watchable" cursor velocity for video pacing.
    mouse.config.mouseSpeed = 1500
  }

  /**
   * Compute the page→screen offset by reading window.screenX/Y and the
   * chrome height. Call once after the demo page has loaded; offset is
   * stable as long as the window doesn't move.
   */
  async calibrate(): Promise<void> {
    const result = await this.evaluate<{ x: number; y: number }>(`
      ({
        x: window.screenX + (window.outerWidth - window.innerWidth),
        y: window.screenY + (window.outerHeight - window.innerHeight),
      })
    `)
    this.offset = result
  }

  /** Convert a page coordinate to a screen coordinate. */
  pageToScreen(pageX: number, pageY: number): Point {
    return new Point(this.offset.x + pageX, this.offset.y + pageY)
  }

  /** Smooth-move the OS cursor to a page coordinate. */
  async moveToPage(pageX: number, pageY: number): Promise<void> {
    const target = this.pageToScreen(pageX, pageY)
    await mouse.move(straightTo(target))
  }

  async pressLeft(): Promise<void> {
    await mouse.pressButton(Button.LEFT)
  }

  async releaseLeft(): Promise<void> {
    await mouse.releaseButton(Button.LEFT)
  }

  /**
   * Drag from one page point to another with a real OS mouse press.
   * The browser receives native mousedown / mousemove* / mouseup, and
   * — for `draggable=true` elements — fires native HTML5 drag events.
   */
  async dragPage(
    startPageX: number,
    startPageY: number,
    endPageX: number,
    endPageY: number,
    opts: { preHoldMs?: number; settleMs?: number } = {}
  ): Promise<void> {
    await this.moveToPage(startPageX, startPageY)
    await mouse.pressButton(Button.LEFT)
    if (opts.preHoldMs) await new Promise(r => setTimeout(r, opts.preHoldMs))
    await this.moveToPage(endPageX, endPageY)
    await mouse.releaseButton(Button.LEFT)
    if (opts.settleMs) await new Promise(r => setTimeout(r, opts.settleMs))
  }

  /** Click at a page coordinate (move + press + release). */
  async clickPage(pageX: number, pageY: number): Promise<void> {
    await this.moveToPage(pageX, pageY)
    await mouse.pressButton(Button.LEFT)
    await new Promise(r => setTimeout(r, 60))
    await mouse.releaseButton(Button.LEFT)
  }

  /** Double-click at a page coordinate. */
  async doubleClickPage(pageX: number, pageY: number): Promise<void> {
    await this.moveToPage(pageX, pageY)
    await mouse.pressButton(Button.LEFT)
    await new Promise(r => setTimeout(r, 50))
    await mouse.releaseButton(Button.LEFT)
    await new Promise(r => setTimeout(r, 80))
    await mouse.pressButton(Button.LEFT)
    await new Promise(r => setTimeout(r, 50))
    await mouse.releaseButton(Button.LEFT)
  }

  /**
   * Drag with a modifier key held. Used for e.g. padding "all sides" mode
   * (Shift) or padding axis mode (Alt/Option).
   */
  async dragPageWithModifier(
    startPageX: number,
    startPageY: number,
    endPageX: number,
    endPageY: number,
    modifier: 'shift' | 'alt' | 'cmd' | 'ctrl',
    opts: { preHoldMs?: number; settleMs?: number } = {}
  ): Promise<void> {
    const key =
      modifier === 'shift'
        ? Key.LeftShift
        : modifier === 'alt'
          ? Key.LeftAlt
          : modifier === 'cmd'
            ? Key.LeftCmd
            : Key.LeftControl
    await this.moveToPage(startPageX, startPageY)
    await keyboard.pressKey(key)
    try {
      await mouse.pressButton(Button.LEFT)
      if (opts.preHoldMs) await new Promise(r => setTimeout(r, opts.preHoldMs))
      await this.moveToPage(endPageX, endPageY)
      await mouse.releaseButton(Button.LEFT)
      if (opts.settleMs) await new Promise(r => setTimeout(r, opts.settleMs))
    } finally {
      await keyboard.releaseKey(key)
    }
  }

  /** Park the cursor somewhere out of the way at the end of the demo. */
  async park(): Promise<void> {
    await this.moveToPage(20, 20)
  }
}
