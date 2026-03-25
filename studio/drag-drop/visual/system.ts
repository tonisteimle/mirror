/**
 * Visual System
 *
 * Handles all visual feedback during drag operations:
 * - Ghost (drag preview)
 * - Drop indicator (insertion line)
 * - Snap guides
 * - Zone overlay (9-zone)
 */

import type { Point, Size, Rect, DragSource, VisualHint, SnapGuide, AlignmentZone } from '../types'
import type { VisualSystem as IVisualSystem } from './types'
import { VISUAL_IDS } from './types'
import { getZoneRect } from '../strategies/empty-flex'

export class VisualSystem implements IVisualSystem {
  private container: HTMLElement
  private ghostElement: HTMLElement | null = null
  private indicatorElement: HTMLElement | null = null
  private snapGuidesContainer: HTMLElement | null = null
  private zoneOverlayElement: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  // ==========================================================================
  // Ghost
  // ==========================================================================

  showGhost(source: DragSource, position: Point, size?: Size): void {
    this.hideGhost()

    const ghost = document.createElement('div')
    ghost.id = VISUAL_IDS.ghost
    ghost.className = 'drag-ghost'

    const finalSize = size ?? this.getDefaultSize(source)

    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${position.x - finalSize.width / 2}px`,
      top: `${position.y - finalSize.height / 2}px`,
      width: `${finalSize.width}px`,
      height: `${finalSize.height}px`,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '2px solid #3b82f6',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      color: '#3b82f6',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      opacity: '0.9',
    })

    ghost.textContent = source.componentName ?? 'Element'

    document.body.appendChild(ghost)
    this.ghostElement = ghost
  }

  updateGhost(position: Point): void {
    if (!this.ghostElement) return

    const width = this.ghostElement.offsetWidth
    const height = this.ghostElement.offsetHeight

    this.ghostElement.style.left = `${position.x - width / 2}px`
    this.ghostElement.style.top = `${position.y - height / 2}px`
  }

  hideGhost(): void {
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }
  }

  private getDefaultSize(source: DragSource): Size {
    if (source.element) {
      const rect = source.element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }

    // Default sizes for components
    const sizes: Record<string, Size> = {
      Button: { width: 80, height: 36 },
      Text: { width: 100, height: 24 },
      Input: { width: 200, height: 36 },
      Box: { width: 100, height: 100 },
    }

    return sizes[source.componentName ?? ''] ?? { width: 100, height: 40 }
  }

  // ==========================================================================
  // Indicator
  // ==========================================================================

  showIndicator(hint: VisualHint): void {
    this.hideIndicator()

    if (hint.type === 'zone') {
      this.showZoneIndicator(hint)
      return
    }

    const indicator = document.createElement('div')
    indicator.id = VISUAL_IDS.indicator
    indicator.className = 'drop-indicator'

    const isLine = hint.type === 'line'
    const isOutline = hint.type === 'outline'

    Object.assign(indicator.style, {
      position: 'fixed',
      left: `${hint.rect.x}px`,
      top: `${hint.rect.y}px`,
      width: `${hint.rect.width}px`,
      height: `${hint.rect.height}px`,
      backgroundColor: isLine ? '#3b82f6' : 'transparent',
      border: isOutline ? '2px dashed #3b82f6' : 'none',
      borderRadius: isOutline ? '4px' : '0',
      pointerEvents: 'none',
      zIndex: '9999',
      boxShadow: isLine ? '0 0 4px rgba(59, 130, 246, 0.5)' : 'none',
    })

    document.body.appendChild(indicator)
    this.indicatorElement = indicator

    // Show snap guides if present
    if (hint.guides && hint.guides.length > 0) {
      this.showSnapGuides(hint.guides)
    }
  }

  private showZoneIndicator(hint: VisualHint): void {
    if (!hint.zone) return

    const indicator = document.createElement('div')
    indicator.id = VISUAL_IDS.indicator
    indicator.className = 'drop-indicator zone-indicator'

    Object.assign(indicator.style, {
      position: 'fixed',
      left: `${hint.rect.x}px`,
      top: `${hint.rect.y}px`,
      width: `${hint.rect.width}px`,
      height: `${hint.rect.height}px`,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      border: '2px solid #3b82f6',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '9999',
    })

    document.body.appendChild(indicator)
    this.indicatorElement = indicator
  }

  hideIndicator(): void {
    if (this.indicatorElement) {
      this.indicatorElement.remove()
      this.indicatorElement = null
    }
    this.hideSnapGuides()
  }

  // ==========================================================================
  // Snap Guides
  // ==========================================================================

  showSnapGuides(guides: SnapGuide[]): void {
    this.hideSnapGuides()

    if (guides.length === 0) return

    const container = document.createElement('div')
    container.id = VISUAL_IDS.snapGuides
    container.className = 'snap-guides-container'

    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '9998',
    })

    for (const guide of guides) {
      const line = document.createElement('div')
      line.className = `snap-guide snap-guide-${guide.type}`

      const isVertical = guide.axis === 'x'

      Object.assign(line.style, {
        position: 'absolute',
        backgroundColor: guide.type === 'center' ? '#10b981' : '#f59e0b',
        opacity: '0.8',
        ...(isVertical
          ? {
              left: `${guide.position}px`,
              top: '0',
              width: '1px',
              height: '100%',
            }
          : {
              left: '0',
              top: `${guide.position}px`,
              width: '100%',
              height: '1px',
            }),
      })

      container.appendChild(line)
    }

    document.body.appendChild(container)
    this.snapGuidesContainer = container
  }

  hideSnapGuides(): void {
    if (this.snapGuidesContainer) {
      this.snapGuidesContainer.remove()
      this.snapGuidesContainer = null
    }
  }

  // ==========================================================================
  // Zone Overlay (9-zone grid)
  // ==========================================================================

  showZoneOverlay(containerRect: Rect, activeZone?: AlignmentZone): void {
    this.hideZoneOverlay()

    const overlay = document.createElement('div')
    overlay.id = VISUAL_IDS.zoneOverlay
    overlay.className = 'zone-overlay'

    Object.assign(overlay.style, {
      position: 'fixed',
      left: `${containerRect.x}px`,
      top: `${containerRect.y}px`,
      width: `${containerRect.width}px`,
      height: `${containerRect.height}px`,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      pointerEvents: 'none',
      zIndex: '9997',
    })

    const zones: AlignmentZone[] = [
      { row: 'top', col: 'left' },
      { row: 'top', col: 'center' },
      { row: 'top', col: 'right' },
      { row: 'middle', col: 'left' },
      { row: 'middle', col: 'center' },
      { row: 'middle', col: 'right' },
      { row: 'bottom', col: 'left' },
      { row: 'bottom', col: 'center' },
      { row: 'bottom', col: 'right' },
    ]

    for (const zone of zones) {
      const cell = document.createElement('div')
      cell.className = 'zone-cell'

      const isActive =
        activeZone &&
        zone.row === activeZone.row &&
        zone.col === activeZone.col

      Object.assign(cell.style, {
        border: '1px dashed rgba(59, 130, 246, 0.3)',
        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
        transition: 'background-color 0.1s',
      })

      overlay.appendChild(cell)
    }

    document.body.appendChild(overlay)
    this.zoneOverlayElement = overlay
  }

  hideZoneOverlay(): void {
    if (this.zoneOverlayElement) {
      this.zoneOverlayElement.remove()
      this.zoneOverlayElement = null
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  clear(): void {
    this.hideGhost()
    this.hideIndicator()
    this.hideSnapGuides()
    this.hideZoneOverlay()
  }

  dispose(): void {
    this.clear()
  }
}

/**
 * Create a VisualSystem instance
 */
export function createVisualSystem(container: HTMLElement): VisualSystem {
  return new VisualSystem(container)
}
