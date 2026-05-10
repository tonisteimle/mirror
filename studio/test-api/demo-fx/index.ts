/**
 * Mirror Demo API — bundled, typed counterpart to the demo-runner's
 * inline-eval'd `window.__mirrorDemo`.
 *
 * Today the demo-runner injects ~300 LOC of JavaScript as a string via
 * `Runtime.evaluate`. That works but trades type safety, testability,
 * and version coupling for the convenience of bundling everything into
 * one runtime command.
 *
 * This module ships the same surface as part of the studio bundle:
 *   - `DemoCursor` + `KeystrokeOverlay` from `./cursor` and `./keystroke-overlay`
 *   - A `MirrorDemoAPI` class matching the legacy `DemoAPI`
 *     (init / click / doubleClick / type / pressKey / drag / scroll /
 *     highlight / wait / moveTo / moveToPoint / cursor / overlay)
 *   - Installs at `window.__mirrorDemo` from `installMirrorDemo()`
 *
 * The shape mirrors the legacy `__mirrorDemo` 1:1 so existing demo
 * scripts (44 in `tools/test-runner/demo/scripts/`) keep working
 * unchanged. The Step-Runner can also call `__mirrorDemo.click(...)`
 * for headed scenarios that want demo-style visual feedback.
 *
 * Source-of-truth for timings is `tools/test-runner/demo/timing.ts` —
 * a Node-and-browser-safe TS module imported from both stacks.
 */

import {
  getTimingProfile,
  type ActionTimings,
  type PacingProfile,
} from '../../../tools/test-runner/demo/timing'
import { DemoCursor, type CursorPoint } from './cursor'
import { KeystrokeOverlay, type Modifier } from './keystroke-overlay'

export type { CursorPoint, Modifier, PacingProfile, ActionTimings }
export { DemoCursor, KeystrokeOverlay }

// =============================================================================
// Config — superset of the legacy inline DemoAPI's config shape
// =============================================================================

export interface MirrorDemoConfig {
  /** Legacy speed preset — kept for back-compat. */
  speed?: 'slow' | 'normal' | 'fast'
  /** Whether the bottom-right key chip overlay is visible. */
  showKeystrokeOverlay?: boolean
  /** Render style — only `'default'` exists today. */
  cursorStyle?: 'default'
  /** Multiplier applied to non-action waits. */
  pauseMultiplier?: number
  /**
   * Override `ActionTimings` directly. The demo-runner CLI computes
   * effective timings from `--pacing=PROFILE × --typing-speed × …`
   * before injection; passing them through here keeps that logic on
   * the Node side and lets the bundled API use them as-is.
   */
  timings?: ActionTimings
  /**
   * Convenience: pick a profile by name. Ignored if `timings` is set.
   */
  pacing?: PacingProfile
}

interface CodeMirrorEditor {
  state: {
    doc: { length: number; toString(): string }
    selection: { main: { from: number; to: number; head: number; empty: boolean } }
  }
  dispatch: (tr: {
    changes?: { from: number; to?: number; insert?: string }
    selection?: { anchor: number; head?: number }
  }) => void
}

interface CodeMirrorTestAPI {
  executeKeyBinding?: (combo: string) => boolean
}

interface BrowserGlobals {
  editor?: CodeMirrorEditor
  __mirrorTest?: { codemirror?: CodeMirrorTestAPI }
}

const SPEED_PRESETS: Record<'slow' | 'normal' | 'fast', { mouseMs: number; charMs: number }> = {
  slow: { mouseMs: 1200, charMs: 150 },
  normal: { mouseMs: 600, charMs: 100 },
  fast: { mouseMs: 300, charMs: 50 },
}

// =============================================================================
// MirrorDemoAPI — the public face of `window.__mirrorDemo`
// =============================================================================

export class MirrorDemoAPI {
  /** Animated cursor (Mac-style SVG pointer). */
  cursor: DemoCursor
  /** Bottom-right key-chip overlay. */
  overlay: KeystrokeOverlay

  private config: Required<Omit<MirrorDemoConfig, 'timings' | 'pacing'>>
  private timings: ActionTimings

  constructor(initialPacing: PacingProfile = 'video') {
    this.timings = getTimingProfile(initialPacing)
    this.cursor = new DemoCursor(this.timings.moveTo, this.timings.click)
    this.overlay = new KeystrokeOverlay(this.timings.pressKey)
    this.config = {
      speed: 'normal',
      showKeystrokeOverlay: true,
      cursorStyle: 'default',
      pauseMultiplier: 1.0,
    }
  }

  /**
   * Boot the visible layer. Subsequent calls update timings/config
   * without re-creating the cursor / overlay (avoids flicker between
   * scenarios).
   *
   * Mirrors the legacy `__mirrorDemo.init(config)` exactly so the
   * demo-runner's existing call site keeps working.
   */
  init(config?: MirrorDemoConfig): void {
    if (config) {
      const { timings, pacing, ...rest } = config
      this.config = { ...this.config, ...rest }
      const next = timings ?? (pacing ? getTimingProfile(pacing) : null)
      if (next) {
        this.timings = next
        this.cursor.setTimings(next.moveTo, next.click)
        this.overlay.setTiming(next.pressKey)
      }
    }
    this.overlay.init()
    this.overlay.setEnabled(this.config.showKeystrokeOverlay)
    // Legacy parity — the synthetic SVG cursor is intentionally NOT shown
    // by default. The OS-level mouse driver (driver=os) drives the real
    // macOS cursor, and a synthetic pointer would produce a confusing
    // double-cursor. Tests that want the visible cursor call showCursor()
    // explicitly.
  }

  destroy(): void {
    this.cursor.hide()
    this.overlay.destroy()
  }

  // ===========================================================================
  // Speed / timings accessors (legacy)
  // ===========================================================================

  getSpeedPreset(): { mouseMs: number; charMs: number } {
    return SPEED_PRESETS[this.config.speed]
  }

  getTimings(): ActionTimings {
    return this.timings
  }

  // ===========================================================================
  // Cursor visibility
  // ===========================================================================

  showCursor(x: number, y: number): void {
    this.cursor.show({ x, y })
  }

  hideCursor(): void {
    this.cursor.hide()
  }

  // ===========================================================================
  // Movement
  // ===========================================================================

  async moveTo(selector: string, duration?: number): Promise<void> {
    const target = this.getTargetCenter(selector)
    if (!target) {
      console.warn('[Demo] Target not found:', selector)
      return
    }
    await this.cursor.moveTo(target, duration)
  }

  async moveToPoint(x: number, y: number, duration?: number): Promise<void> {
    await this.cursor.moveTo({ x, y }, duration)
  }

  // ===========================================================================
  // Click / DoubleClick — synthetic dispatch via elementFromPoint(cursor)
  // ===========================================================================

  async click(selector?: string): Promise<void> {
    const t = this.timings.click
    if (selector) await this.moveTo(selector)
    if (t.preDelayMs > 0) await this.delay(t.preDelayMs)

    this.cursor.showClickEffect()
    const pos = this.cursor.getPosition()
    const target = document.elementFromPoint(pos.x, pos.y)
    if (target) {
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: pos.x,
          clientY: pos.y,
          view: window,
        })
      )
    }
    await this.delay(t.postDelayMs)
  }

  async doubleClick(selector?: string): Promise<void> {
    const t = this.timings.doubleClick
    if (selector) await this.moveTo(selector)
    if (t.preDelayMs > 0) await this.delay(t.preDelayMs)

    this.cursor.showClickEffect()
    const pos = this.cursor.getPosition()
    const target = document.elementFromPoint(pos.x, pos.y)
    if (target) {
      target.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          clientX: pos.x,
          clientY: pos.y,
          view: window,
        })
      )
    }
    await this.delay(t.postDelayMs)
  }

  // ===========================================================================
  // Typing — CodeMirror-aware character-by-character with variance
  // ===========================================================================

  async type(text: string, target?: string): Promise<void> {
    if (target) await this.click(target)

    const t = this.timings.type
    if (t.thoughtPauseMs > 0) await this.delay(t.thoughtPauseMs)

    // ONE overlay chip with the typed snippet (truncated), not one chip
    // per character — viewers already see the chars appear in the
    // editor; per-char chips just produce visual noise. Skip ws-only
    // strings (e.g. an indent paste).
    if (this.config.showKeystrokeOverlay && text.trim().length > 0) {
      const preview = text.length > 24 ? text.slice(0, 24) + '…' : text
      // Single-line preview — replace internal whitespace with a space
      // so multiline pastes don't blow the chip up.
      this.overlay.showText('"' + preview.replace(/\s+/g, ' ') + '"')
    }

    const w = window as unknown as BrowserGlobals
    const cm = w.editor
    if (cm && cm.state && cm.dispatch) {
      let isFirstChar = true
      for (const char of text) {
        const sel = cm.state.selection.main
        if (isFirstChar && !sel.empty) {
          cm.dispatch({
            changes: { from: sel.from, to: sel.to, insert: char },
            selection: { anchor: sel.from + 1 },
          })
        } else {
          const pos = cm.state.selection.main.head
          cm.dispatch({
            changes: { from: pos, insert: char },
            selection: { anchor: pos + 1 },
          })
        }
        isFirstChar = false

        let charDelay = t.charMs
        if (t.variance > 0) {
          charDelay *= 1 + (Math.random() - 0.5) * 2 * t.variance
        }
        if (char === ' ') charDelay += t.wordPauseMs
        if (char === '\n') charDelay += t.linePauseMs
        await this.delay(charDelay)
      }
      return
    }

    // Fallback: regular input/textarea elements.
    for (const char of text) {
      const activeEl = document.activeElement as HTMLElement | null
      if (activeEl) {
        activeEl.dispatchEvent(
          new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true })
        )
        if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
          activeEl.value += char
          activeEl.dispatchEvent(
            new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' })
          )
        }
        activeEl.dispatchEvent(
          new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true })
        )
      }

      let charDelay = t.charMs
      if (t.variance > 0) charDelay *= 1 + (Math.random() - 0.5) * 2 * t.variance
      if (char === ' ') charDelay += t.wordPauseMs
      if (char === '\n') charDelay += t.linePauseMs
      await this.delay(charDelay)
    }
  }

  // ===========================================================================
  // Single keypress — routes through CodeMirror keymap when applicable
  // ===========================================================================

  async pressKey(key: string, modifiers?: readonly string[]): Promise<void> {
    const overlayMods = modifiers
      ? (modifiers
          .map(m => m.toLowerCase())
          .filter(m => m === 'meta' || m === 'ctrl' || m === 'alt' || m === 'shift') as Modifier[])
      : undefined
    this.overlay.show(key, overlayMods)

    const keyMs = this.timings.pressKey.keyMs
    const w = window as unknown as BrowserGlobals
    const cm = w.editor
    if (cm && cm.state && cm.dispatch) {
      const cmTest = w.__mirrorTest?.codemirror
      const hasModifier = !!(modifiers && modifiers.length)
      const useKeymap =
        cmTest?.executeKeyBinding && (hasModifier || key === 'Tab' || key === 'Escape')

      if (useKeymap && cmTest?.executeKeyBinding) {
        const parts: string[] = []
        if (modifiers?.includes('Meta')) parts.push('Mod')
        else if (modifiers?.includes('Ctrl')) parts.push('Ctrl')
        if (modifiers?.includes('Alt')) parts.push('Alt')
        if (modifiers?.includes('Shift')) parts.push('Shift')
        parts.push(key)
        const handled = cmTest.executeKeyBinding(parts.join('-'))
        await this.delay(keyMs)
        if (handled) return
      }

      const isMeta = modifiers?.includes('Meta') || modifiers?.includes('Ctrl')
      if (isMeta && key.toLowerCase() === 'a') {
        cm.dispatch({ selection: { anchor: 0, head: cm.state.doc.length } })
        await this.delay(keyMs)
        return
      }
      if (key === 'Enter') {
        const pos = cm.state.selection.main.head
        cm.dispatch({ changes: { from: pos, insert: '\n' }, selection: { anchor: pos + 1 } })
        await this.delay(keyMs)
        return
      }
      if (key === 'Backspace') {
        const sel = cm.state.selection.main
        if (sel.empty && sel.from > 0) {
          cm.dispatch({ changes: { from: sel.from - 1, to: sel.from } })
        } else if (!sel.empty) {
          cm.dispatch({ changes: { from: sel.from, to: sel.to } })
        }
        await this.delay(keyMs)
        return
      }
    }

    const activeEl = document.activeElement as HTMLElement | null
    if (activeEl) {
      const opts: KeyboardEventInit = {
        key,
        code: 'Key' + key.toUpperCase(),
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers?.includes('Ctrl') ?? false,
        altKey: modifiers?.includes('Alt') ?? false,
        shiftKey: modifiers?.includes('Shift') ?? false,
        metaKey: modifiers?.includes('Meta') ?? false,
      }
      activeEl.dispatchEvent(new KeyboardEvent('keydown', opts))
      activeEl.dispatchEvent(new KeyboardEvent('keyup', opts))
    }
    await this.delay(keyMs)
  }

  // ===========================================================================
  // Drag — moveTo + mousedown + moveTo + mouseup (visible motion path)
  // ===========================================================================

  async drag(fromSelector: string, toSelector: string): Promise<void> {
    const from = this.getTargetCenter(fromSelector)
    const to = this.getTargetCenter(toSelector)
    if (!from || !to) {
      console.warn('[Demo] Drag targets not found')
      return
    }

    await this.cursor.moveTo(from)
    const fromEl = document.elementFromPoint(from.x, from.y)
    fromEl?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: from.x, clientY: from.y })
    )
    await this.delay(this.timings.transitions.afterClick)

    const dragDuration = this.cursor.calculateDuration(to) * 1.5
    await this.cursor.moveTo(to, dragDuration)
    const toEl = document.elementFromPoint(to.x, to.y)
    toEl?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: to.x, clientY: to.y }))
    await this.delay(this.timings.transitions.afterClick)
  }

  // ===========================================================================
  // Scroll / Highlight / Wait — passive aids for video pacing
  // ===========================================================================

  async scroll(deltaY: number, selector?: string): Promise<void> {
    const target = selector ? document.querySelector(selector) : document.documentElement
    if (target && 'scrollBy' in target) {
      ;(target as HTMLElement).scrollBy({ top: deltaY, behavior: 'smooth' })
    }
    await this.delay(Math.min(Math.abs(deltaY) * 2, 1000))
  }

  async highlight(selector: string, duration?: number): Promise<void> {
    const t = this.timings.highlight
    const effectiveDuration = duration ?? t.durationMs
    const element = document.querySelector(selector)
    if (!element) return
    const rect = element.getBoundingClientRect()

    const ring = document.createElement('div')
    ring.style.cssText =
      `position:fixed;left:${rect.left - 4}px;top:${rect.top - 4}px;` +
      `width:${rect.width + 8}px;height:${rect.height + 8}px;` +
      `border:3px solid #5BA8F5;border-radius:8px;background:rgba(91,168,245,0.1);` +
      `pointer-events:none;z-index:999996;opacity:0;` +
      `transition:opacity ${t.fadeInMs / 1000}s ease-out;`
    document.body.appendChild(ring)
    requestAnimationFrame(() => {
      ring.style.opacity = '1'
    })

    await this.delay(effectiveDuration - t.fadeOutMs)
    ring.style.transition = `opacity ${t.fadeOutMs / 1000}s ease-out`
    ring.style.opacity = '0'
    await this.delay(t.fadeOutMs)
    ring.remove()
  }

  async wait(duration: number): Promise<void> {
    const t = this.timings.wait
    const scaled = duration * t.scale
    const clamped = Math.max(t.minMs, Math.min(t.maxMs, scaled))
    await this.delay(clamped)
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /** Mirror's selector resolution — querySelector, then data-mirror-id, then in #preview. */
  getTargetCenter(selector: string): CursorPoint | null {
    let el: Element | null = document.querySelector(selector)
    if (!el) el = document.querySelector(`[data-mirror-id="${selector}"]`)
    if (!el) el = document.querySelector(`#preview ${selector}`)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Installation
// =============================================================================

interface MirrorDemoGlobals {
  __mirrorDemo?: MirrorDemoAPI
}

/**
 * Idempotently install `window.__mirrorDemo`. Safe to call multiple times;
 * subsequent calls are no-ops, matching the inline-string's
 * `if (window.__mirrorDemo) return;` guard.
 */
export function installMirrorDemo(initialPacing: PacingProfile = 'video'): MirrorDemoAPI {
  const w = globalThis as MirrorDemoGlobals
  if (w.__mirrorDemo) return w.__mirrorDemo
  const api = new MirrorDemoAPI(initialPacing)
  w.__mirrorDemo = api
  return api
}

export function getMirrorDemo(): MirrorDemoAPI | null {
  return (globalThis as MirrorDemoGlobals).__mirrorDemo ?? null
}

export function isMirrorDemoInstalled(): boolean {
  return !!(globalThis as MirrorDemoGlobals).__mirrorDemo
}
