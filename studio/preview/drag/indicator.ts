/**
 * Indicator - Visual insertion line and container highlight
 *
 * Shows both:
 * 1. An insertion line where the element will be placed
 * 2. A highlight around the target container
 *
 * No create/destroy cycles, no transitions for max responsiveness.
 */

import type { Point } from './types'
import type { IndicatorReport, Reportable } from './reporter/types'

const INDICATOR_ID = 'drag-insertion-indicator'
const CONTAINER_HIGHLIGHT_ID = 'drag-container-highlight'
const GHOST_INDICATOR_ID = 'drag-ghost-indicator'
const INDICATOR_COLOR = '#5BA8F5'
const INDICATOR_GLOW = 'rgba(91, 168, 245, 0.4)'
const GHOST_COLOR = 'rgba(139, 92, 246, 0.15)'
const GHOST_BORDER = 'rgba(139, 92, 246, 0.6)'
const INDICATOR_THICKNESS = 3

export class Indicator implements Reportable<IndicatorReport> {
  private element: HTMLDivElement | null = null
  private containerHighlight: HTMLDivElement | null = null
  private ghostElement: HTMLDivElement | null = null
  private currentContainerId: string | null = null

  // Last state for reporting
  private lastLinePosition: Point | null = null
  private lastHighlightRect: DOMRect | null = null
  private lastGhostRect: DOMRect | null = null

  /** Ensure the indicator element exists */
  private ensureElement(): HTMLDivElement {
    if (this.element) return this.element

    this.element = this.createElement()
    document.body.appendChild(this.element)
    return this.element
  }

  /** Ensure the container highlight element exists */
  private ensureContainerHighlight(): HTMLDivElement {
    if (this.containerHighlight) return this.containerHighlight

    this.containerHighlight = this.createContainerHighlight()
    document.body.appendChild(this.containerHighlight)
    return this.containerHighlight
  }

  /** Create the indicator DOM element */
  private createElement(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = INDICATOR_ID
    this.applyStyles(el)
    return el
  }

  /** Create the container highlight DOM element */
  private createContainerHighlight(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = CONTAINER_HIGHLIGHT_ID
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      border: `1px dashed ${INDICATOR_COLOR}`,
      borderRadius: '4px',
      display: 'none',
      background: 'rgba(91, 168, 245, 0.08)',
      willChange: 'left, top, width, height',
      transition: 'all 0.15s ease-out',
    })
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

    // Hide ghost when showing line indicator
    this.hideGhost()

    // Store for reporting
    this.lastLinePosition = { ...position }
  }

  /** Show ghost indicator for absolute positioning */
  showGhost(rect: DOMRect): void {
    const el = this.ensureGhostElement()
    el.style.left = `${rect.x}px`
    el.style.top = `${rect.y}px`
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'

    // Hide line indicator when showing ghost
    if (this.element) {
      this.element.style.display = 'none'
    }

    // Store for reporting
    this.lastGhostRect = rect
    this.lastLinePosition = null
  }

  /** Hide ghost indicator */
  hideGhost(): void {
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
    }
    this.lastGhostRect = null
  }

  /** Ensure the ghost element exists */
  private ensureGhostElement(): HTMLDivElement {
    if (this.ghostElement) return this.ghostElement

    this.ghostElement = document.createElement('div')
    this.ghostElement.id = GHOST_INDICATOR_ID
    Object.assign(this.ghostElement.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      background: GHOST_COLOR,
      border: `2px dashed ${GHOST_BORDER}`,
      borderRadius: '4px',
      display: 'none',
      willChange: 'left, top, width, height',
    })
    document.body.appendChild(this.ghostElement)
    return this.ghostElement
  }

  /** Highlight the target container */
  highlightContainer(containerId: string, rect: DOMRect): void {
    // Skip if same container
    if (this.currentContainerId === containerId) return
    this.currentContainerId = containerId

    const el = this.ensureContainerHighlight()
    el.style.left = `${rect.x}px`
    el.style.top = `${rect.y}px`
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'

    // Store for reporting
    this.lastHighlightRect = rect
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
   * Hide the indicator and container highlight
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none'
    }
    if (this.containerHighlight) {
      this.containerHighlight.style.display = 'none'
    }
    this.hideGhost()
    this.currentContainerId = null
    this.lastLinePosition = null
    this.lastHighlightRect = null
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
    if (this.containerHighlight) {
      this.containerHighlight.remove()
      this.containerHighlight = null
    }
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
    this.currentContainerId = null
    this.lastLinePosition = null
    this.lastHighlightRect = null
    this.lastGhostRect = null
  }

  /** Report current state for debugging */
  report(): IndicatorReport {
    const lineVisible = this.element?.style.display === 'block'
    const ghostVisible = this.ghostElement?.style.display === 'block'
    const highlightVisible = this.containerHighlight?.style.display === 'block'

    return {
      lineVisible,
      linePosition: this.lastLinePosition ? { ...this.lastLinePosition } : null,
      ghostVisible: ghostVisible ?? false,
      ghostRect: this.lastGhostRect,
      highlightVisible,
      highlightedContainerId: this.currentContainerId,
      highlightRect: this.lastHighlightRect,
    }
  }
}
