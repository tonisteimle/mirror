/**
 * Demo Cursor — animated synthetic pointer for headed Step-Runner runs.
 *
 * Ported from the Demo-Runner's inline-eval'd `DemoCursor` class
 * (`tools/test-runner/demo/runner.ts`) into a real TypeScript module
 * shipped in the studio bundle. Both runners now share one
 * implementation — fix once, see twice.
 *
 * The cursor hotspot is at SVG (0, 0): `style.left/top` directly equal
 * the pointer tip position in viewport coords (no offset math).
 *
 * Animation cadence is parameterised by `MoveToTiming` from the shared
 * `timing.ts` source-of-truth so video / presentation / tutorial /
 * testing / instant profiles all behave identically across runners.
 */

import type { MoveToTiming, ClickTiming } from '../../../tools/test-runner/demo/timing'

export interface CursorPoint {
  x: number
  y: number
}

type EasingName = MoveToTiming['easing']

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 2)
const linear = (t: number): number => t
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function getEasing(name: EasingName): (t: number) => number {
  switch (name) {
    case 'easeInOutCubic':
      return easeInOutCubic
    case 'easeOut':
      return easeOut
    case 'linear':
      return linear
    case 'easeInOut':
      return easeInOut
    default:
      return easeInOutCubic
  }
}

const RIPPLE_STYLE_ID = '__demo-fx-ripple-style'
const CURSOR_ELEMENT_ID = '__demo-fx-cursor'

export class DemoCursor {
  private element: HTMLElement | null = null
  private position: CursorPoint = { x: 0, y: 0 }
  private moveTiming: MoveToTiming
  private clickTiming: ClickTiming

  constructor(moveTiming: MoveToTiming, clickTiming: ClickTiming) {
    this.moveTiming = moveTiming
    this.clickTiming = clickTiming
  }

  /** Update timings — used when the runner switches profile mid-scenario. */
  setTimings(moveTiming: MoveToTiming, clickTiming: ClickTiming): void {
    this.moveTiming = moveTiming
    this.clickTiming = clickTiming
  }

  show(pos: CursorPoint): void {
    if (this.element) return
    const el = document.createElement('div')
    el.id = CURSOR_ELEMENT_ID
    // Mac-style pointer; tip at SVG (0, 0) so element.left/top equals
    // the pointer hotspot. Body is a triangle (tip 0,0 → bottom-left
    // 0,14 → shoulder 12,11). The "tail" parallelogram sits exactly
    // on the body's bottom diagonal (line y = 14 - 0.25x).
    el.innerHTML =
      '<svg width="20" height="22" viewBox="-1 -1 16 22" xmlns="http://www.w3.org/2000/svg">' +
      '<polygon points="0,0 0,14 4,13 7,18 10,17 7,12 12,11" ' +
      'fill="white" stroke="black" stroke-width="1.2" stroke-linejoin="round"/></svg>'
    el.style.cssText =
      'position:fixed;width:20px;height:22px;pointer-events:none;z-index:999999;' +
      'transform:translate(-1px,-1px);transition:none;' +
      'filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));'
    this.element = el
    this.updatePosition(pos)
    document.body.appendChild(el)
  }

  hide(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }

  updatePosition(pos: CursorPoint): void {
    this.position = pos
    if (this.element) {
      this.element.style.left = pos.x + 'px'
      this.element.style.top = pos.y + 'px'
    }
  }

  /** Distance-aware duration via the active MoveToTiming profile. */
  calculateDuration(target: CursorPoint): number {
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const t = this.moveTiming
    const duration = t.baseMs + (distance / 100) * t.perHundredPixels
    return Math.max(t.minMs, Math.min(t.maxMs, Math.round(duration)))
  }

  async moveTo(target: CursorPoint, duration?: number): Promise<void> {
    if (!this.element) {
      this.show(target)
      return
    }

    const effectiveDuration = duration ?? this.calculateDuration(target)
    if (effectiveDuration === 0) {
      this.updatePosition(target)
      return
    }

    const start = { ...this.position }
    const startTime = performance.now()
    const easingFn = getEasing(this.moveTiming.easing)

    return new Promise<void>(resolve => {
      const animate = (): void => {
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / effectiveDuration, 1)
        const easedT = easingFn(t)
        this.updatePosition({
          x: start.x + (target.x - start.x) * easedT,
          y: start.y + (target.y - start.y) * easedT,
        })
        if (t < 1) requestAnimationFrame(animate)
        else resolve()
      }
      requestAnimationFrame(animate)
    })
  }

  /** Visual ripple at the current cursor position (no event dispatched). */
  showClickEffect(): void {
    if (!this.element) return
    const rippleDuration = this.clickTiming.rippleDurationMs
    if (rippleDuration === 0) return

    const ripple = document.createElement('div')
    ripple.style.cssText =
      'position:fixed;left:' +
      this.position.x +
      'px;top:' +
      this.position.y +
      'px;width:40px;height:40px;border:3px solid #5BA8F5;border-radius:50%;' +
      'pointer-events:none;z-index:999998;transform:translate(-50%,-50%) scale(0.5);opacity:1;'

    if (!document.getElementById(RIPPLE_STYLE_ID)) {
      const style = document.createElement('style')
      style.id = RIPPLE_STYLE_ID
      style.textContent =
        '@keyframes demo-fx-ripple{' +
        '0%{transform:translate(-50%,-50%) scale(0.5);opacity:1}' +
        '100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}'
      document.head.appendChild(style)
    }
    ripple.style.animation = 'demo-fx-ripple ' + rippleDuration / 1000 + 's ease-out forwards'
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), rippleDuration)
  }

  getPosition(): CursorPoint {
    return { ...this.position }
  }
}
