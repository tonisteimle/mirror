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

  /**
   * Ensure the indicator element exists
   */
  private ensureElement(): HTMLDivElement {
    if (this.element) return this.element

    this.element = document.createElement('div')
    this.element.id = INDICATOR_ID

    Object.assign(this.element.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: INDICATOR_COLOR,
      borderRadius: '2px',
      display: 'none',
      // Subtle glow for visibility
      boxShadow: `0 0 8px ${INDICATOR_GLOW}`,
      // GPU acceleration
      willChange: 'left, top, width, height',
      // No transition for immediate response
      transition: 'none',
    })

    document.body.appendChild(this.element)
    return this.element
  }

  /**
   * Show the indicator at the specified position
   *
   * @param position - Top-left position
   * @param size - Width (horizontal) or height (vertical)
   * @param orientation - Line direction
   */
  show(position: Point, size: number, orientation: 'horizontal' | 'vertical'): void {
    const el = this.ensureElement()

    const width = orientation === 'horizontal' ? size : INDICATOR_THICKNESS
    const height = orientation === 'vertical' ? size : INDICATOR_THICKNESS

    // Batch style updates
    el.style.left = `${position.x}px`
    el.style.top = `${position.y}px`
    el.style.width = `${width}px`
    el.style.height = `${height}px`
    el.style.display = 'block'
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
