/**
 * Drop Preview Renderer
 *
 * Simple renderer - just shows/hides the preview.
 * No logic, no state management - pure rendering.
 *
 * Features:
 * - Smart label positioning (stays within container bounds)
 * - Flips label below when too close to top edge
 * - Shifts label left when too close to right edge
 */

import type { Point, Size } from './types'

/**
 * Label dimensions for bounds calculation
 * These are estimates - actual size depends on content
 */
const LABEL_HEIGHT = 20 // Approximate label height in pixels
const LABEL_MARGIN = 4 // Margin between label and preview
const LABEL_MIN_WIDTH = 60 // Minimum label width estimate

/**
 * Inline styles for the preview elements
 * Uses CSS variables from studio/styles.css for theming
 */
const STYLES = {
  outline: {
    position: 'absolute',
    border: '1px solid var(--drag-preview-border, #3B82F6)',
    borderRadius: '4px',
    backgroundColor: 'var(--drag-preview-bg, rgba(59, 130, 246, 0.15))',
    pointerEvents: 'none',
    zIndex: '10001',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>,
  label: {
    position: 'absolute',
    fontSize: '11px',
    fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
    fontWeight: '500',
    color: 'var(--drag-label-color, #fff)',
    backgroundColor: 'var(--drag-label-bg, #3B82F6)',
    padding: '2px 6px',
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: '10002',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  } as Partial<CSSStyleDeclaration>,
}

/**
 * Drop Preview Renderer
 */
export class DropPreviewRenderer {
  private container: HTMLElement
  private outlineEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Show preview at position with size
   *
   * Bug 4 fix: Label is now clamped to stay within container bounds.
   * - If too close to top edge, label appears below the preview
   * - If too close to right edge, label shifts left
   */
  show(position: Point, size: Size, label: string): void {
    this.ensureElements()

    if (!this.outlineEl || !this.labelEl) return

    // Update outline
    Object.assign(this.outlineEl.style, {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      display: 'block',
    })

    // Update label with bounds clamping
    this.labelEl.textContent = label

    // Calculate label position with bounds checking
    const containerRect = this.container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Estimate label width (will be refined after render)
    const labelWidth = Math.max(LABEL_MIN_WIDTH, label.length * 7)

    // Determine if label should be above or below
    const spaceAbove = position.y - LABEL_HEIGHT - LABEL_MARGIN
    const showBelow = spaceAbove < 0

    // Calculate label Y position
    let labelY: number
    if (showBelow) {
      // Show below the preview
      labelY = position.y + size.height + LABEL_MARGIN
      // If that goes off bottom, clamp to bottom edge
      if (labelY + LABEL_HEIGHT > containerHeight) {
        labelY = containerHeight - LABEL_HEIGHT - 2
      }
    } else {
      // Show above the preview (default)
      labelY = position.y - LABEL_HEIGHT - LABEL_MARGIN
    }

    // Calculate label X position with right-edge clamping
    let labelX = position.x
    if (labelX + labelWidth > containerWidth) {
      labelX = Math.max(0, containerWidth - labelWidth - 4)
    }

    Object.assign(this.labelEl.style, {
      left: `${labelX}px`,
      top: `${labelY}px`,
      transform: 'none', // Remove translateY - we handle positioning explicitly
      marginTop: '0',
      display: 'block',
    })
  }

  /**
   * Hide preview
   */
  hide(): void {
    if (this.outlineEl) {
      this.outlineEl.style.display = 'none'
    }
    if (this.labelEl) {
      this.labelEl.style.display = 'none'
    }
  }

  /**
   * Clean up DOM elements
   */
  dispose(): void {
    this.outlineEl?.remove()
    this.labelEl?.remove()
    this.outlineEl = null
    this.labelEl = null
  }

  /**
   * Ensure DOM elements exist
   */
  private ensureElements(): void {
    if (!this.outlineEl) {
      this.outlineEl = document.createElement('div')
      this.outlineEl.className = 'drop-preview-outline'
      Object.assign(this.outlineEl.style, STYLES.outline)
      this.outlineEl.style.display = 'none'
      this.container.appendChild(this.outlineEl)
    }

    if (!this.labelEl) {
      this.labelEl = document.createElement('div')
      this.labelEl.className = 'drop-preview-label'
      Object.assign(this.labelEl.style, STYLES.label)
      this.labelEl.style.display = 'none'
      this.container.appendChild(this.labelEl)
    }
  }
}

/**
 * Format position as label
 */
export function formatLabel(position: Point): string {
  return `${Math.round(position.x)}, ${Math.round(position.y)}`
}
