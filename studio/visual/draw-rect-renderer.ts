/**
 * DrawRectRenderer - Visual feedback for click-to-draw
 *
 * Renders live rectangle preview with dimension and position labels
 */

import type { Rect } from './draw-manager'

export class DrawRectRenderer {
  private container: HTMLElement
  private overlayElement: HTMLElement | null = null
  private rectElement: HTMLElement | null = null
  private dimensionLabel: HTMLElement | null = null
  private positionLabel: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.createOverlay()
  }

  /**
   * Render rectangle with labels.
   *
   * `cellInfo` switches the labels into grid-cell mode: instead of
   * showing px size and px position, they show the user-meaningful
   * `x N, y M` / `w P, h Q` that will end up in the source. The
   * positioning math is unchanged — `rect` is still in container-local
   * coordinates and gets scaled+offset onto the screen.
   */
  render(
    rect: Rect,
    containerRect: DOMRect,
    scale: number,
    cellInfo?: { x: number; y: number; w: number; h: number }
  ): void {
    this.ensureElements()

    // Convert to screen coordinates for positioning
    const screenX = containerRect.left + rect.x * scale
    const screenY = containerRect.top + rect.y * scale
    const screenWidth = rect.width * scale
    const screenHeight = rect.height * scale

    // Update rectangle
    this.rectElement!.style.left = screenX + 'px'
    this.rectElement!.style.top = screenY + 'px'
    this.rectElement!.style.width = screenWidth + 'px'
    this.rectElement!.style.height = screenHeight + 'px'

    if (cellInfo) {
      this.dimensionLabel!.textContent = `w ${cellInfo.w}, h ${cellInfo.h}`
      this.positionLabel!.textContent = `x ${cellInfo.x}, y ${cellInfo.y}`
    } else {
      this.dimensionLabel!.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
      this.positionLabel!.textContent = `x: ${Math.round(rect.x)}, y: ${Math.round(rect.y)}`
    }

    // Show overlay
    this.overlayElement!.style.display = 'block'
  }

  /**
   * Hide all elements
   */
  hide(): void {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none'
    }
  }

  /**
   * Dispose renderer
   */
  dispose(): void {
    if (this.overlayElement && this.overlayElement.parentElement) {
      this.overlayElement.parentElement.removeChild(this.overlayElement)
    }
    this.overlayElement = null
    this.rectElement = null
    this.dimensionLabel = null
    this.positionLabel = null
  }

  /**
   * Create overlay structure
   */
  private createOverlay(): void {
    this.overlayElement = document.createElement('div')
    this.overlayElement.className = 'draw-overlay'
    this.overlayElement.style.display = 'none'

    document.body.appendChild(this.overlayElement)
  }

  /**
   * Ensure DOM elements exist
   */
  private ensureElements(): void {
    if (!this.rectElement) {
      this.rectElement = document.createElement('div')
      this.rectElement.className = 'draw-rect'
      this.overlayElement!.appendChild(this.rectElement)
    }

    if (!this.dimensionLabel) {
      this.dimensionLabel = document.createElement('div')
      this.dimensionLabel.className = 'draw-rect-label draw-rect-label-dimensions'
      this.rectElement!.appendChild(this.dimensionLabel)
    }

    if (!this.positionLabel) {
      this.positionLabel = document.createElement('div')
      this.positionLabel.className = 'draw-rect-label draw-rect-label-position'
      this.rectElement!.appendChild(this.positionLabel)
    }
  }
}
