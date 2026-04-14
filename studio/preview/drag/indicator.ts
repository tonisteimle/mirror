/**
 * Indicator - Visual insertion line
 *
 * A single DOM element that gets repositioned.
 * No create/destroy cycles, no transitions for max responsiveness.
 */

import type { Point } from './types'

const INDICATOR_ID = 'drag-insertion-indicator'
const INDICATOR_COLOR = '#5BA8F5'
const INDICATOR_GLOW = 'rgba(91, 168, 245, 0.4)'
const INDICATOR_THICKNESS = 3

export class Indicator {
  private element: HTMLDivElement | null = null

  /** Ensure the indicator element exists */
  private ensureElement(): HTMLDivElement {
    if (this.element) return this.element

    this.element = this.createElement()
    document.body.appendChild(this.element)
    return this.element
  }

  /** Create the indicator DOM element */
  private createElement(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = INDICATOR_ID
    this.applyStyles(el)
    return el
  }

  /** Apply indicator styles */
  private applyStyles(el: HTMLDivElement): void {
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: INDICATOR_COLOR,
      borderRadius: '2px',
      display: 'none',
      boxShadow: `0 0 8px ${INDICATOR_GLOW}`,
      willChange: 'left, top, width, height',
      transition: 'none',
    })
  }

  /** Show indicator at position */
  show(position: Point, size: number, orientation: 'horizontal' | 'vertical'): void {
    const el = this.ensureElement()
    this.setPosition(el, position)
    this.setSize(el, size, orientation)
    el.style.display = 'block'
  }

  /** Set position styles */
  private setPosition(el: HTMLDivElement, position: Point): void {
    el.style.left = `${position.x}px`
    el.style.top = `${position.y}px`
  }

  /** Set size based on orientation */
  private setSize(el: HTMLDivElement, size: number, orientation: 'horizontal' | 'vertical'): void {
    el.style.width = `${orientation === 'horizontal' ? size : INDICATOR_THICKNESS}px`
    el.style.height = `${orientation === 'vertical' ? size : INDICATOR_THICKNESS}px`
  }

  /**
   * Hide the indicator
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none'
    }
  }

  /**
   * Check if indicator is currently visible
   */
  isVisible(): boolean {
    return this.element?.style.display === 'block'
  }

  /**
   * Remove the indicator from DOM completely
   * Call on cleanup/unmount
   */
  destroy(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}
