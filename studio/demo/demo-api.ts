/**
 * Demo API - Browser-side API for demo mode
 *
 * Provides visual cursor, keystroke overlay, and smooth animations
 * for video recording of demos.
 */

// =============================================================================
// Types
// =============================================================================

interface Point {
  x: number
  y: number
}

interface DemoConfig {
  speed: 'slow' | 'normal' | 'fast'
  showKeystrokeOverlay: boolean
  cursorStyle: 'default' | 'pointer' | 'text'
  pauseMultiplier: number
}

interface SpeedPreset {
  mouseMs: number
  charMs: number
  pauseMultiplier: number
}

const SPEED_PRESETS: Record<DemoConfig['speed'], SpeedPreset> = {
  slow: { mouseMs: 1200, charMs: 150, pauseMultiplier: 2.0 },
  normal: { mouseMs: 600, charMs: 100, pauseMultiplier: 1.0 },
  fast: { mouseMs: 300, charMs: 50, pauseMultiplier: 0.5 },
}

// =============================================================================
// Easing Functions
// =============================================================================

type EasingFn = (t: number) => number

const easeInOutCubic: EasingFn = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const easeOutCubic: EasingFn = t => 1 - Math.pow(1 - t, 3)

// =============================================================================
// Demo Cursor
// =============================================================================

class DemoCursor {
  private element: HTMLDivElement | null = null
  private rippleElement: HTMLDivElement | null = null
  private position: Point = { x: 0, y: 0 }
  private cursorStyle: DemoConfig['cursorStyle'] = 'default'

  /**
   * Show the demo cursor at a position
   */
  show(pos: Point): void {
    if (this.element) return

    this.element = document.createElement('div')
    this.element.id = '__demo-cursor'
    this.element.innerHTML = this.getCursorSVG()
    this.element.style.cssText = `
      position: fixed;
      width: 24px;
      height: 24px;
      pointer-events: none;
      z-index: 999999;
      transform: translate(0, 0);
      transition: none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    `
    this.updatePosition(pos)
    document.body.appendChild(this.element)
  }

  /**
   * Hide the cursor
   */
  hide(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
    this.hideRipple()
  }

  /**
   * Set cursor style
   */
  setStyle(style: DemoConfig['cursorStyle']): void {
    this.cursorStyle = style
    if (this.element) {
      this.element.innerHTML = this.getCursorSVG()
    }
  }

  /**
   * Move cursor instantly to position
   */
  updatePosition(pos: Point): void {
    this.position = pos
    if (this.element) {
      this.element.style.left = `${pos.x}px`
      this.element.style.top = `${pos.y}px`
    }
  }

  /**
   * Animate cursor to target position
   */
  async moveTo(target: Point, duration: number, easing: EasingFn = easeInOutCubic): Promise<void> {
    if (!this.element) {
      this.show(target)
      return
    }

    const start = { ...this.position }
    const startTime = performance.now()

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / duration, 1)
        const easedT = easing(t)

        const x = start.x + (target.x - start.x) * easedT
        const y = start.y + (target.y - start.y) * easedT
        this.updatePosition({ x, y })

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * Show click ripple effect
   */
  showClickEffect(): void {
    if (!this.element) return

    this.rippleElement = document.createElement('div')
    this.rippleElement.id = '__demo-cursor-ripple'
    this.rippleElement.style.cssText = `
      position: fixed;
      left: ${this.position.x}px;
      top: ${this.position.y}px;
      width: 40px;
      height: 40px;
      border: 3px solid #5BA8F5;
      border-radius: 50%;
      pointer-events: none;
      z-index: 999998;
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 1;
      animation: demo-ripple 0.4s ease-out forwards;
    `

    // Add animation keyframes if not already present
    if (!document.getElementById('__demo-ripple-style')) {
      const style = document.createElement('style')
      style.id = '__demo-ripple-style'
      style.textContent = `
        @keyframes demo-ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(this.rippleElement)

    // Remove ripple after animation
    setTimeout(() => this.hideRipple(), 400)
  }

  private hideRipple(): void {
    if (this.rippleElement) {
      this.rippleElement.remove()
      this.rippleElement = null
    }
  }

  /**
   * Get current position
   */
  getPosition(): Point {
    return { ...this.position }
  }

  private getCursorSVG(): string {
    // Standard arrow cursor SVG
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.79C5.5 21.33 6.12 21.64 6.54 21.32L10.56 18.18C10.82 17.98 11.16 17.9 11.48 17.97L16.75 19.03C17.32 19.14 17.82 18.64 17.71 18.07L14.75 3.71C14.6 2.96 13.64 2.76 13.22 3.39L5.73 13.5C5.26 14.16 5.5 15.13 6.24 15.5"
              fill="white" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
  }
}

// =============================================================================
// Keystroke Overlay
// =============================================================================

class KeystrokeOverlay {
  private container: HTMLDivElement | null = null
  private keyElements: Map<string, HTMLDivElement> = new Map()
  private enabled: boolean = true

  /**
   * Initialize the overlay container
   */
  init(): void {
    if (this.container) return

    this.container = document.createElement('div')
    this.container.id = '__demo-keystroke-overlay'
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: row;
      gap: 8px;
      pointer-events: none;
      z-index: 999997;
    `
    document.body.appendChild(this.container)
  }

  /**
   * Show a key press
   */
  show(key: string, modifiers?: string[]): void {
    if (!this.enabled || !this.container) return

    const displayKey = this.formatKey(key, modifiers)
    const id = `key-${Date.now()}`

    const keyEl = document.createElement('div')
    keyEl.id = id
    keyEl.textContent = displayKey
    keyEl.style.cssText = `
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    `

    this.container.appendChild(keyEl)
    this.keyElements.set(id, keyEl)

    // Fade out after delay
    setTimeout(() => {
      keyEl.style.opacity = '0'
      keyEl.style.transform = 'translateY(10px)'
    }, 1200)

    // Remove element after fade
    setTimeout(() => {
      keyEl.remove()
      this.keyElements.delete(id)
    }, 1500)
  }

  /**
   * Enable/disable overlay
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    this.keyElements.clear()
  }

  private formatKey(key: string, modifiers?: string[]): string {
    const parts: string[] = []

    if (modifiers) {
      if (modifiers.includes('Meta') || modifiers.includes('Ctrl')) {
        parts.push(navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl')
      }
      if (modifiers.includes('Alt')) {
        parts.push(navigator.platform.includes('Mac') ? '\u2325' : 'Alt')
      }
      if (modifiers.includes('Shift')) {
        parts.push('\u21E7')
      }
    }

    // Format special keys
    const keyMap: Record<string, string> = {
      Enter: '\u21B5',
      Tab: '\u21E5',
      Escape: 'Esc',
      Backspace: '\u232B',
      Delete: '\u2326',
      ArrowUp: '\u2191',
      ArrowDown: '\u2193',
      ArrowLeft: '\u2190',
      ArrowRight: '\u2192',
      Space: 'Space',
    }

    parts.push(keyMap[key] || key)
    return parts.join(' + ')
  }
}

// =============================================================================
// Demo API
// =============================================================================

class DemoAPI {
  private cursor = new DemoCursor()
  private overlay = new KeystrokeOverlay()
  private config: DemoConfig = {
    speed: 'normal',
    showKeystrokeOverlay: true,
    cursorStyle: 'default',
    pauseMultiplier: 1.0,
  }

  /**
   * Initialize demo mode
   */
  init(config?: Partial<DemoConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.overlay.init()
    this.overlay.setEnabled(this.config.showKeystrokeOverlay)
  }

  /**
   * Clean up demo mode
   */
  destroy(): void {
    this.cursor.hide()
    this.overlay.destroy()
  }

  /**
   * Get speed preset values
   */
  getSpeedPreset(): SpeedPreset {
    return SPEED_PRESETS[this.config.speed]
  }

  /**
   * Show cursor at position
   */
  showCursor(x: number, y: number): void {
    this.cursor.show({ x, y })
  }

  /**
   * Hide cursor
   */
  hideCursor(): void {
    this.cursor.hide()
  }

  /**
   * Move cursor to element
   */
  async moveTo(selector: string, duration?: number): Promise<void> {
    const target = this.getTargetCenter(selector)
    if (!target) {
      console.warn(`[Demo] Target not found: ${selector}`)
      return
    }

    const effectiveDuration = duration ?? this.getSpeedPreset().mouseMs
    await this.cursor.moveTo(target, effectiveDuration)
  }

  /**
   * Move cursor to coordinates
   */
  async moveToPoint(x: number, y: number, duration?: number): Promise<void> {
    const effectiveDuration = duration ?? this.getSpeedPreset().mouseMs
    await this.cursor.moveTo({ x, y }, effectiveDuration)
  }

  /**
   * Click at current position or on target
   */
  async click(selector?: string): Promise<void> {
    if (selector) {
      await this.moveTo(selector)
    }

    this.cursor.showClickEffect()

    // Dispatch actual click event
    const pos = this.cursor.getPosition()
    const target = document.elementFromPoint(pos.x, pos.y)
    if (target) {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: pos.x,
        clientY: pos.y,
        view: window,
      })
      target.dispatchEvent(clickEvent)
    }

    await this.delay(100)
  }

  /**
   * Double click
   */
  async doubleClick(selector?: string): Promise<void> {
    if (selector) {
      await this.moveTo(selector)
    }

    this.cursor.showClickEffect()

    const pos = this.cursor.getPosition()
    const target = document.elementFromPoint(pos.x, pos.y)
    if (target) {
      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: pos.x,
        clientY: pos.y,
        view: window,
      })
      target.dispatchEvent(dblClickEvent)
    }

    await this.delay(100)
  }

  /**
   * Type text with realistic timing
   */
  async type(text: string, target?: string): Promise<void> {
    if (target) {
      await this.click(target)
    }

    const charDelay = this.getSpeedPreset().charMs

    for (const char of text) {
      // Show keystroke in overlay
      if (this.config.showKeystrokeOverlay && char !== ' ') {
        this.overlay.show(char)
      }

      // Dispatch keydown and input events
      const activeEl = document.activeElement as HTMLElement
      if (activeEl) {
        const keydownEvent = new KeyboardEvent('keydown', {
          key: char,
          bubbles: true,
          cancelable: true,
        })
        activeEl.dispatchEvent(keydownEvent)

        // For input/textarea, update value
        if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
          activeEl.value += char
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            data: char,
            inputType: 'insertText',
          })
          activeEl.dispatchEvent(inputEvent)
        }

        const keyupEvent = new KeyboardEvent('keyup', {
          key: char,
          bubbles: true,
          cancelable: true,
        })
        activeEl.dispatchEvent(keyupEvent)
      }

      // Add slight randomness to timing for natural feel
      const variance = charDelay * 0.3
      const actualDelay = charDelay + (Math.random() - 0.5) * variance
      await this.delay(actualDelay)
    }
  }

  /**
   * Press a key combination
   */
  async pressKey(key: string, modifiers?: ('Ctrl' | 'Alt' | 'Shift' | 'Meta')[]): Promise<void> {
    this.overlay.show(key, modifiers)

    const activeEl = document.activeElement as HTMLElement
    if (activeEl) {
      const keydownEvent = new KeyboardEvent('keydown', {
        key,
        code: `Key${key.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers?.includes('Ctrl'),
        altKey: modifiers?.includes('Alt'),
        shiftKey: modifiers?.includes('Shift'),
        metaKey: modifiers?.includes('Meta'),
      })
      activeEl.dispatchEvent(keydownEvent)

      const keyupEvent = new KeyboardEvent('keyup', {
        key,
        code: `Key${key.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers?.includes('Ctrl'),
        altKey: modifiers?.includes('Alt'),
        shiftKey: modifiers?.includes('Shift'),
        metaKey: modifiers?.includes('Meta'),
      })
      activeEl.dispatchEvent(keyupEvent)
    }

    await this.delay(150)
  }

  /**
   * Drag from one element to another
   */
  async drag(fromSelector: string, toSelector: string): Promise<void> {
    const from = this.getTargetCenter(fromSelector)
    const to = this.getTargetCenter(toSelector)

    if (!from || !to) {
      console.warn(`[Demo] Drag targets not found: ${fromSelector} -> ${toSelector}`)
      return
    }

    // Move to source
    await this.cursor.moveTo(from, this.getSpeedPreset().mouseMs)

    // Dispatch mousedown
    const fromEl = document.elementFromPoint(from.x, from.y)
    if (fromEl) {
      fromEl.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: from.x,
          clientY: from.y,
        })
      )
    }

    await this.delay(100)

    // Move to target (slower for drag)
    await this.cursor.moveTo(to, this.getSpeedPreset().mouseMs * 1.5)

    // Dispatch mouseup
    const toEl = document.elementFromPoint(to.x, to.y)
    if (toEl) {
      toEl.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          clientX: to.x,
          clientY: to.y,
        })
      )
    }

    await this.delay(100)
  }

  /**
   * Scroll within an element
   */
  async scroll(deltaY: number, selector?: string): Promise<void> {
    const target = selector ? document.querySelector(selector) : document.documentElement
    if (target) {
      target.scrollBy({ top: deltaY, behavior: 'smooth' })
    }
    await this.delay(Math.abs(deltaY) * 2)
  }

  /**
   * Highlight an element temporarily
   */
  async highlight(selector: string, duration: number = 1000): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const highlight = document.createElement('div')
    highlight.id = '__demo-highlight'
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left - 4}px;
      top: ${rect.top - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #5BA8F5;
      border-radius: 8px;
      background: rgba(91, 168, 245, 0.1);
      pointer-events: none;
      z-index: 999996;
      animation: demo-highlight-pulse 0.5s ease-in-out infinite alternate;
    `

    // Add animation keyframes
    if (!document.getElementById('__demo-highlight-style')) {
      const style = document.createElement('style')
      style.id = '__demo-highlight-style'
      style.textContent = `
        @keyframes demo-highlight-pulse {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(highlight)

    await this.delay(duration)

    highlight.remove()
  }

  /**
   * Wait for a duration
   */
  async wait(duration: number): Promise<void> {
    const effectiveDuration = duration * this.config.pauseMultiplier
    await this.delay(effectiveDuration)
  }

  // Private helpers

  private getTargetCenter(selector: string): Point | null {
    // Try CSS selector first
    let element = document.querySelector(selector) as HTMLElement

    // Try data-mirror-id
    if (!element) {
      element = document.querySelector(`[data-mirror-id="${selector}"]`) as HTMLElement
    }

    // Try preview-scoped selector
    if (!element) {
      element = document.querySelector(`#preview ${selector}`) as HTMLElement
    }

    if (!element) return null

    const rect = element.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Global Registration
// =============================================================================

declare global {
  interface Window {
    __mirrorDemo: DemoAPI
  }
}

/**
 * Setup the global demo API
 */
export function setupDemoAPI(): DemoAPI {
  if (window.__mirrorDemo) return window.__mirrorDemo

  const api = new DemoAPI()
  window.__mirrorDemo = api
  return api
}

/**
 * Get the demo API instance
 */
export function getDemoAPI(): DemoAPI | null {
  return window.__mirrorDemo || null
}

export { DemoAPI, DemoCursor, KeystrokeOverlay }
