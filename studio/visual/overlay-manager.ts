/**
 * OverlayManager - Verwaltet alle visuellen Overlay-Elemente
 *
 * Der Overlay-Layer liegt über der Preview und enthält:
 * - Resize Handles
 * - Drop Zone Highlight
 * - Semantic Zone Dots (9 Punkte)
 * - Sibling Insert Line
 * - Zone Indicator
 *
 * Performance optimizations:
 * - Cached element references (avoid repeated querySelector)
 * - DOM pooling for semantic dots (avoid innerHTML recreation)
 */

export type SemanticZone =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

/** All 9 semantic zones in order */
const SEMANTIC_ZONES: readonly SemanticZone[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
] as const

export interface OverlayManagerConfig {
  container: HTMLElement
}

export class OverlayManager {
  private container: HTMLElement
  private overlay: HTMLElement

  // Cached element references (avoid repeated querySelector)
  private resizeHandlesEl: HTMLElement | null = null
  private sizeIndicatorEl: HTMLElement | null = null
  private semanticDotsEl: HTMLElement | null = null
  private siblingLineEl: HTMLElement | null = null
  private zoneIndicatorEl: HTMLElement | null = null
  private zoneNameEl: HTMLElement | null = null

  // Pooled dot elements (avoid innerHTML recreation)
  private dotElements: HTMLElement[] = []
  private dotsInitialized = false

  constructor(config: OverlayManagerConfig) {
    this.container = config.container
    this.overlay = this.createOverlay()

    // Container muss position: relative haben
    const style = window.getComputedStyle(this.container)
    if (style.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.container.appendChild(this.overlay)

    // Cache element references after appending
    this.cacheElements()
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

  /**
   * Cache element references to avoid repeated querySelector calls
   */
  private cacheElements(): void {
    this.resizeHandlesEl = this.overlay.querySelector('.resize-handles')
    this.sizeIndicatorEl = this.overlay.querySelector('.size-indicator')
    this.semanticDotsEl = this.overlay.querySelector('.semantic-dots')
    this.siblingLineEl = this.overlay.querySelector('.sibling-line')
    this.zoneIndicatorEl = this.overlay.querySelector('.zone-indicator')
    this.zoneNameEl = this.overlay.querySelector('.zone-name')
  }

  /**
   * Initialize pooled dot elements (created once, reused)
   */
  private initializeDots(): void {
    if (this.dotsInitialized || !this.semanticDotsEl) return

    for (const zone of SEMANTIC_ZONES) {
      const dot = document.createElement('div')
      dot.className = `zone-dot ${zone}`
      dot.dataset.zone = zone
      this.semanticDotsEl.appendChild(dot)
      this.dotElements.push(dot)
    }

    this.dotsInitialized = true
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
      // Re-cache elements after re-appending
      this.cacheElements()
      // Re-initialize dots if they were previously created
      if (this.dotsInitialized) {
        this.dotsInitialized = false
        this.dotElements = []
        this.initializeDots()
      }
    }
  }

  // ============================================================================
  // Resize Handles
  // ============================================================================

  getResizeHandlesContainer(): HTMLElement {
    this.ensureOverlay()
    return this.resizeHandlesEl!
  }

  clearResizeHandles(): void {
    if (this.resizeHandlesEl) {
      this.resizeHandlesEl.innerHTML = ''
    }
  }

  // ============================================================================
  // Size Indicator
  // ============================================================================

  showSizeIndicator(x: number, y: number, width: string, height: string): void {
    const el = this.sizeIndicatorEl
    if (!el) return
    el.textContent = `${width} × ${height}`
    el.style.display = 'block'
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }

  hideSizeIndicator(): void {
    if (this.sizeIndicatorEl) {
      this.sizeIndicatorEl.style.display = 'none'
    }
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
    const container = this.semanticDotsEl
    if (!container) return

    // Initialize dots on first use (DOM pooling - create once, reuse)
    this.initializeDots()

    container.style.display = 'block'
    Object.assign(container.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })

    // Update active state on pooled dots (no innerHTML recreation)
    for (const dot of this.dotElements) {
      const zone = dot.dataset.zone as SemanticZone
      if (zone === activeZone) {
        dot.classList.add('active')
      } else {
        dot.classList.remove('active')
      }
    }
  }

  hideSemanticDots(): void {
    if (this.semanticDotsEl) {
      this.semanticDotsEl.style.display = 'none'
    }
    // Don't clear innerHTML - keep pooled dots for reuse
  }

  // ============================================================================
  // Sibling Insert Line
  // ============================================================================

  showSiblingLine(
    rect: { left: number; top: number; width: number; height: number },
    position: 'before' | 'after',
    direction: 'horizontal' | 'vertical'
  ): void {
    const el = this.siblingLineEl
    if (!el) return

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
    if (this.siblingLineEl) {
      this.siblingLineEl.style.display = 'none'
    }
  }

  // ============================================================================
  // Zone Indicator
  // ============================================================================

  showZoneIndicator(containerName: string, zoneName: string): void {
    if (this.zoneIndicatorEl && this.zoneNameEl) {
      this.zoneNameEl.textContent = `${containerName} | ${zoneName}`
      this.zoneIndicatorEl.classList.add('visible')
    }
  }

  hideZoneIndicator(): void {
    if (this.zoneIndicatorEl) {
      this.zoneIndicatorEl.classList.remove('visible')
    }
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
    // Clear cached references
    this.resizeHandlesEl = null
    this.sizeIndicatorEl = null
    this.semanticDotsEl = null
    this.siblingLineEl = null
    this.zoneIndicatorEl = null
    this.zoneNameEl = null
    this.dotElements = []
    this.dotsInitialized = false
  }
}

export function createOverlayManager(config: OverlayManagerConfig): OverlayManager {
  return new OverlayManager(config)
}
