/**
 * Suggestion Tooltip - Auto-Layout Suggestions UI
 * Feature 8: Auto-Layout Suggestions
 *
 * Displays a tooltip when a layout pattern is detected,
 * allowing users to apply the suggested layout.
 */

import type { LayoutSuggestion, LayoutPattern } from './pattern-detector'

/**
 * Configuration for the suggestion tooltip
 */
export interface SuggestionTooltipConfig {
  /** Container element for the tooltip */
  container: HTMLElement
  /** Callback when apply is clicked */
  onApply?: (suggestion: LayoutSuggestion) => void
  /** Callback when dismiss is clicked */
  onDismiss?: (suggestion: LayoutSuggestion) => void
}

/**
 * Pattern labels for UI
 */
const PATTERN_LABELS: Record<LayoutPattern, string> = {
  'horizontal-stack': 'Horizontal Row',
  'vertical-stack': 'Vertical Column',
  'grid': 'Grid Layout',
  'wrap': 'Wrap Layout',
}

/**
 * Pattern icons (Lucide icon names)
 */
const PATTERN_ICONS: Record<LayoutPattern, string> = {
  'horizontal-stack': 'layout-list',
  'vertical-stack': 'layout-list',
  'grid': 'layout-grid',
  'wrap': 'wrap-text',
}

/**
 * Suggestion Tooltip class
 */
export class SuggestionTooltip {
  private container: HTMLElement
  private element: HTMLElement | null = null
  private currentSuggestion: LayoutSuggestion | null = null
  private onApply?: (suggestion: LayoutSuggestion) => void
  private onDismiss?: (suggestion: LayoutSuggestion) => void

  constructor(config: SuggestionTooltipConfig) {
    this.container = config.container
    this.onApply = config.onApply
    this.onDismiss = config.onDismiss
  }

  /**
   * Show the suggestion tooltip
   */
  show(suggestion: LayoutSuggestion, position: { x: number; y: number }): void {
    this.hide()
    this.currentSuggestion = suggestion

    const element = document.createElement('div')
    element.className = 'auto-layout-suggestion'
    element.style.cssText = `
      position: absolute;
      left: ${position.x}px;
      top: ${position.y}px;
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: white;
      min-width: 200px;
      animation: fadeIn 0.15s ease-out;
    `

    // Add animation keyframes if not exists
    if (!document.querySelector('#auto-layout-suggestion-styles')) {
      const style = document.createElement('style')
      style.id = 'auto-layout-suggestion-styles'
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auto-layout-suggestion-btn {
          padding: 6px 12px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s;
        }
        .auto-layout-suggestion-btn:hover {
          filter: brightness(1.1);
        }
      `
      document.head.appendChild(style)
    }

    const patternLabel = PATTERN_LABELS[suggestion.pattern]
    const confidence = Math.round(suggestion.confidence * 100)

    element.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="
          width: 28px;
          height: 28px;
          background: rgba(91, 168, 245, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5BA8F5" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div>
          <div style="font-weight: 600; color: white;">${patternLabel}</div>
          <div style="font-size: 11px; color: #888;">${suggestion.nodeIds.length} elements detected</div>
        </div>
      </div>

      <div style="
        background: rgba(91, 168, 245, 0.1);
        border: 1px solid rgba(91, 168, 245, 0.3);
        border-radius: 4px;
        padding: 8px 12px;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 12px;
        color: #5BA8F5;
        margin-bottom: 12px;
      ">
        ${suggestion.preview}
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="auto-layout-suggestion-btn apply-btn" style="
          background: #5BA8F5;
          color: white;
          flex: 1;
        ">Apply</button>
        <button class="auto-layout-suggestion-btn dismiss-btn" style="
          background: #333;
          color: #888;
        ">Dismiss</button>
      </div>

      <div style="font-size: 10px; color: #666; margin-top: 8px; text-align: center;">
        ${confidence}% confidence
      </div>
    `

    // Add event listeners
    const applyBtn = element.querySelector('.apply-btn')
    const dismissBtn = element.querySelector('.dismiss-btn')

    applyBtn?.addEventListener('click', () => {
      if (this.currentSuggestion && this.onApply) {
        this.onApply(this.currentSuggestion)
      }
      this.hide()
    })

    dismissBtn?.addEventListener('click', () => {
      if (this.currentSuggestion && this.onDismiss) {
        this.onDismiss(this.currentSuggestion)
      }
      this.hide()
    })

    // Click outside to dismiss
    const handleClickOutside = (e: MouseEvent) => {
      if (this.element && !this.element.contains(e.target as Node)) {
        this.hide()
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    this.container.appendChild(element)
    this.element = element

    // Ensure tooltip stays within viewport
    this.adjustPosition()
  }

  /**
   * Hide the tooltip
   */
  hide(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
    this.currentSuggestion = null
  }

  /**
   * Check if tooltip is currently visible
   */
  isVisible(): boolean {
    return this.element !== null
  }

  /**
   * Get current suggestion
   */
  getCurrentSuggestion(): LayoutSuggestion | null {
    return this.currentSuggestion
  }

  /**
   * Adjust position to stay within container
   */
  private adjustPosition(): void {
    if (!this.element) return

    const rect = this.element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    // Check right edge
    if (rect.right > containerRect.right) {
      const currentLeft = parseInt(this.element.style.left, 10)
      this.element.style.left = `${currentLeft - (rect.right - containerRect.right) - 16}px`
    }

    // Check bottom edge
    if (rect.bottom > containerRect.bottom) {
      const currentTop = parseInt(this.element.style.top, 10)
      this.element.style.top = `${currentTop - (rect.bottom - containerRect.bottom) - 16}px`
    }

    // Check left edge
    if (rect.left < containerRect.left) {
      this.element.style.left = `${containerRect.left + 16}px`
    }

    // Check top edge
    if (rect.top < containerRect.top) {
      this.element.style.top = `${containerRect.top + 16}px`
    }
  }

  /**
   * Dispose of the tooltip
   */
  dispose(): void {
    this.hide()
  }
}

/**
 * Create a suggestion tooltip instance
 */
export function createSuggestionTooltip(config: SuggestionTooltipConfig): SuggestionTooltip {
  return new SuggestionTooltip(config)
}
