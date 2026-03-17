/**
 * Grid Overlay - Visual grid display for absolute positioning
 *
 * Shows a dotted grid pattern in the preview container when enabled.
 * Listens to grid settings changes and updates automatically.
 */

import { gridSettings, type GridSettings } from '../core/settings'
import { events } from '../core'

export interface GridOverlayConfig {
  container: HTMLElement
}

export class GridOverlay {
  private container: HTMLElement
  private svg: SVGSVGElement | null = null
  private unsubscribe: (() => void) | null = null

  constructor(config: GridOverlayConfig) {
    this.container = config.container
    this.setupEventListeners()

    // Show grid if initially enabled
    const settings = gridSettings.get()
    if (settings.showVisual) {
      this.show()
    }
  }

  private setupEventListeners(): void {
    this.unsubscribe = events.on('grid:changed', (settings: GridSettings) => {
      if (settings.showVisual) {
        this.show()
      } else {
        this.hide()
      }
    })
  }

  /**
   * Show the grid overlay
   */
  show(): void {
    // Remove existing grid
    this.hide()

    const { size, color } = gridSettings.get()

    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('class', 'grid-overlay')
    this.svg.innerHTML = `
      <defs>
        <pattern id="mirror-grid-dots" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
          <circle cx="${size / 2}" cy="${size / 2}" r="0.5" fill="${color}" opacity="0.3"/>
        </pattern>
        <pattern id="mirror-grid-lines" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
          <path d="M ${size} 0 L 0 0 0 ${size}"
                fill="none" stroke="${color}" stroke-width="0.5" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mirror-grid-dots)"/>
    `

    Object.assign(this.svg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
    })

    // Insert at the beginning of the container
    if (this.container.firstChild) {
      this.container.insertBefore(this.svg, this.container.firstChild)
    } else {
      this.container.appendChild(this.svg)
    }
  }

  /**
   * Hide the grid overlay
   */
  hide(): void {
    if (this.svg) {
      this.svg.remove()
      this.svg = null
    }
  }

  /**
   * Toggle grid visibility
   */
  toggle(): void {
    if (this.svg) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Check if grid is visible
   */
  isVisible(): boolean {
    return this.svg !== null
  }

  /**
   * Update grid appearance (called when settings change)
   */
  update(): void {
    if (this.svg) {
      this.show() // Re-render with new settings
    }
  }

  /**
   * Dispose the overlay
   */
  dispose(): void {
    this.hide()
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }
}

export function createGridOverlay(config: GridOverlayConfig): GridOverlay {
  return new GridOverlay(config)
}
