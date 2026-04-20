/**
 * SnapIndicator - Visual feedback for snapping operations
 *
 * Shows a small label near the cursor when a value snaps to a token or grid.
 * - Token snap: Shows "$s" or similar
 * - Grid snap: Shows "8px" or similar
 *
 * Design:
 * - Small pill-shaped label
 * - Same color as smart guides
 * - Auto-hide after timeout or on next move
 */

import { Z_INDEX_RESIZE_HANDLES } from './constants/z-index'

// Visual constants
const INDICATOR_BG = '#10B981' // Green (success/snap color)
const INDICATOR_TOKEN_BG = '#8B5CF6' // Purple for token snaps
const INDICATOR_COLOR = '#FFFFFF'
const INDICATOR_FONT_SIZE = 10
const INDICATOR_PADDING = '2px 6px'
const INDICATOR_RADIUS = 3
const AUTO_HIDE_DELAY = 800 // ms

export interface SnapIndicatorConfig {
  container: HTMLElement
}

export class SnapIndicator {
  private container: HTMLElement
  private element: HTMLElement | null = null
  private hideTimeout: number | null = null

  constructor(config: SnapIndicatorConfig) {
    this.container = config.container
  }

  /**
   * Show snap indicator at position
   *
   * @param x - X position relative to container
   * @param y - Y position relative to container
   * @param label - Text to show (e.g., "$s" or "8px grid")
   * @param isToken - Whether this is a token snap (affects color)
   */
  show(x: number, y: number, label: string, isToken: boolean = false): void {
    this.hide()

    const el = document.createElement('div')
    el.className = 'snap-indicator'

    Object.assign(el.style, {
      position: 'absolute',
      left: `${x + 10}px`, // Offset from cursor
      top: `${y - 20}px`, // Above cursor
      background: isToken ? INDICATOR_TOKEN_BG : INDICATOR_BG,
      color: INDICATOR_COLOR,
      fontSize: `${INDICATOR_FONT_SIZE}px`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '500',
      padding: INDICATOR_PADDING,
      borderRadius: `${INDICATOR_RADIUS}px`,
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_RESIZE_HANDLES + 10),
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      opacity: '0',
      transform: 'translateY(4px)',
      transition: 'opacity 0.1s ease, transform 0.1s ease',
    })

    el.textContent = label

    this.container.appendChild(el)
    this.element = el

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.element) {
        this.element.style.opacity = '1'
        this.element.style.transform = 'translateY(0)'
      }
    })

    // Auto-hide after delay
    this.hideTimeout = window.setTimeout(() => {
      this.hide()
    }, AUTO_HIDE_DELAY)
  }

  /**
   * Show token snap indicator
   */
  showTokenSnap(x: number, y: number, tokenName: string): void {
    this.show(x, y, tokenName, true)
  }

  /**
   * Show grid snap indicator
   */
  showGridSnap(x: number, y: number, gridSize: number): void {
    this.show(x, y, `${gridSize}px`, false)
  }

  /**
   * Update position (call during drag)
   */
  updatePosition(x: number, y: number): void {
    if (this.element) {
      this.element.style.left = `${x + 10}px`
      this.element.style.top = `${y - 20}px`
    }
  }

  /**
   * Hide the indicator
   */
  hide(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout)
      this.hideTimeout = null
    }

    if (this.element) {
      this.element.style.opacity = '0'
      this.element.style.transform = 'translateY(4px)'

      // Remove after animation
      const el = this.element
      setTimeout(() => {
        el.remove()
      }, 100)

      this.element = null
    }
  }

  /**
   * Dispose the indicator
   */
  dispose(): void {
    this.hide()
  }
}

/**
 * Factory function
 */
export function createSnapIndicator(config: SnapIndicatorConfig): SnapIndicator {
  return new SnapIndicator(config)
}
