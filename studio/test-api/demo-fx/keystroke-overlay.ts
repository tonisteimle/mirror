/**
 * Keystroke Overlay — bottom-right key chips that fade in/out as the
 * scenario presses keys. Lets a viewer of a headed run see what shortcut
 * just fired without staring at the cursor.
 *
 * Ported from the Demo-Runner's inline-eval'd `KeystrokeOverlay` class.
 * Single source of truth for both runners; timing reads from the shared
 * `PressKeyTiming` profile.
 */

import type { PressKeyTiming } from '../../../tools/test-runner/demo/timing'

const CONTAINER_ID = '__demo-fx-keystroke-overlay'

const KEY_GLYPHS: Record<string, string> = {
  Enter: '↵',
  Tab: '⇥',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: '⌦',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  ' ': 'Space',
}

export type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift'

export class KeystrokeOverlay {
  private container: HTMLElement | null = null
  private enabled = true
  private timing: PressKeyTiming

  constructor(timing: PressKeyTiming) {
    this.timing = timing
  }

  setTiming(timing: PressKeyTiming): void {
    this.timing = timing
  }

  init(): void {
    if (this.container) return
    const el = document.createElement('div')
    el.id = CONTAINER_ID
    el.style.cssText =
      'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:row;' +
      'gap:8px;pointer-events:none;z-index:999997;'
    document.body.appendChild(el)
    this.container = el
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Render a key chip. `modifiers` is the subset that was held when the
   * key fired — modifier glyphs appear in the canonical macOS order
   * (⌘ ⌥ ⇧) plus Ctrl on non-Mac.
   */
  show(key: string, modifiers?: readonly Modifier[]): void {
    if (!this.enabled || !this.container) return
    const overlayMs = this.timing.overlayMs
    if (overlayMs === 0) return

    const isMac = navigator.platform.includes('Mac')
    const parts: string[] = []
    if (modifiers) {
      if (modifiers.includes('meta')) parts.push(isMac ? '⌘' : 'Win')
      if (modifiers.includes('ctrl')) parts.push(isMac ? '⌃' : 'Ctrl')
      if (modifiers.includes('alt')) parts.push(isMac ? '⌥' : 'Alt')
      if (modifiers.includes('shift')) parts.push('⇧')
    }
    parts.push(KEY_GLYPHS[key] ?? key)

    const chip = document.createElement('div')
    chip.textContent = parts.join(' + ')
    chip.style.cssText =
      'background:rgba(0,0,0,0.85);color:white;padding:8px 16px;border-radius:8px;' +
      'font-family:system-ui,-apple-system,sans-serif;font-size:16px;font-weight:500;' +
      'white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;' +
      'transform:translateY(0);transition:opacity 0.3s ease-out,transform 0.3s ease-out;'
    this.container.appendChild(chip)

    const fadeStart = overlayMs * 0.8
    setTimeout(() => {
      chip.style.opacity = '0'
      chip.style.transform = 'translateY(10px)'
    }, fadeStart)
    setTimeout(() => chip.remove(), overlayMs)
  }

  destroy(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }
}
