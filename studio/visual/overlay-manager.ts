/**
 * OverlayManager - Verwaltet alle visuellen Overlay-Elemente
 *
 * Der Overlay-Layer liegt über der Preview und enthält:
 * - Resize Handles
 * - Drop Zone Highlight
 * - Semantic Zone Dots (9 Punkte)
 * - Sibling Insert Line
 * - Zone Indicator
 */

export type SemanticZone =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface OverlayManagerConfig {
  container: HTMLElement
}

export class OverlayManager {
  private container: HTMLElement
  private overlay: HTMLElement

  constructor(config: OverlayManagerConfig) {
    this.container = config.container
    this.overlay = this.createOverlay()

    // Container muss position: relative haben
    const style = window.getComputedStyle(this.container)
    if (style.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.container.appendChild(this.overlay)
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'visual-overlay'
    overlay.innerHTML = `
      <div class="resize-handles"></div>
      <div class="drop-zone-highlight"></div>
      <div class="semantic-dots"></div>
      <div class="sibling-line"></div>
      <div class="zone-indicator"><span class="zone-name"></span></div>
      <div class="size-indicator"></div>
    `
    return overlay
  }

  // ============================================================================
  // Overlay Management
  // ============================================================================

  /**
   * Ensure the overlay is in the DOM.
   * Call this after compile/preview updates that may clear innerHTML.
   */
  ensureOverlay(): void {
    if (!this.container.contains(this.overlay)) {
      this.container.appendChild(this.overlay)
    }
  }

  // ============================================================================
  // Resize Handles
  // ============================================================================

  getResizeHandlesContainer(): HTMLElement {
    this.ensureOverlay()
    return this.overlay.querySelector('.resize-handles')!
  }

  clearResizeHandles(): void {
    const container = this.getResizeHandlesContainer()
    container.innerHTML = ''
  }

  // ============================================================================
  // Size Indicator
  // ============================================================================

  showSizeIndicator(x: number, y: number, width: string, height: string): void {
    const el = this.overlay.querySelector('.size-indicator') as HTMLElement
    el.textContent = `${width} × ${height}`
    el.style.display = 'block'
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }

  hideSizeIndicator(): void {
    const el = this.overlay.querySelector('.size-indicator') as HTMLElement
    el.style.display = 'none'
  }

  // ============================================================================
  // Drop Zone Highlight
  // ============================================================================

  showDropZone(rect: { left: number; top: number; width: number; height: number }): void {
    // Big rectangle removed - we only use semantic dots now
    // Keep method for API compatibility
  }

  hideDropZone(): void {
    // Big rectangle removed - we only use semantic dots now
    // Keep method for API compatibility
  }

  // ============================================================================
  // Semantic Zone Dots (9 Punkte)
  // ============================================================================

  showSemanticDots(rect: { left: number; top: number; width: number; height: number }, activeZone: SemanticZone | null): void {
    const container = this.overlay.querySelector('.semantic-dots') as HTMLElement
    container.style.display = 'block'

    Object.assign(container.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })

    const zones: SemanticZone[] = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ]

    container.innerHTML = zones.map(zone =>
      `<div class="zone-dot ${zone} ${zone === activeZone ? 'active' : ''}"></div>`
    ).join('')
  }

  hideSemanticDots(): void {
    const el = this.overlay.querySelector('.semantic-dots') as HTMLElement
    el.style.display = 'none'
    el.innerHTML = ''
  }

  // ============================================================================
  // Sibling Insert Line
  // ============================================================================

  showSiblingLine(
    rect: { left: number; top: number; width: number; height: number },
    position: 'before' | 'after',
    direction: 'horizontal' | 'vertical'
  ): void {
    const el = this.overlay.querySelector('.sibling-line') as HTMLElement
    el.style.display = 'block'

    if (direction === 'horizontal') {
      // Vertikale Linie (links oder rechts vom Element)
      Object.assign(el.style, {
        left: position === 'before' ? `${rect.left - 2}px` : `${rect.left + rect.width - 2}px`,
        top: `${rect.top}px`,
        width: '4px',
        height: `${rect.height}px`,
      })
    } else {
      // Horizontale Linie (oben oder unten vom Element)
      Object.assign(el.style, {
        left: `${rect.left}px`,
        top: position === 'before' ? `${rect.top - 2}px` : `${rect.top + rect.height - 2}px`,
        width: `${rect.width}px`,
        height: '4px',
      })
    }
  }

  hideSiblingLine(): void {
    const el = this.overlay.querySelector('.sibling-line') as HTMLElement
    el.style.display = 'none'
  }

  // ============================================================================
  // Zone Indicator
  // ============================================================================

  showZoneIndicator(containerName: string, zoneName: string): void {
    const el = this.overlay.querySelector('.zone-indicator') as HTMLElement
    const nameEl = el.querySelector('.zone-name') as HTMLElement
    nameEl.textContent = `${containerName} | ${zoneName}`
    el.classList.add('visible')
  }

  hideZoneIndicator(): void {
    const el = this.overlay.querySelector('.zone-indicator') as HTMLElement
    el.classList.remove('visible')
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  hideAll(): void {
    this.clearResizeHandles()
    this.hideDropZone()
    this.hideSemanticDots()
    this.hideSiblingLine()
    this.hideZoneIndicator()
    this.hideSizeIndicator()
  }

  dispose(): void {
    this.overlay.remove()
  }
}

export function createOverlayManager(config: OverlayManagerConfig): OverlayManager {
  return new OverlayManager(config)
}
