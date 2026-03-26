/**
 * Visual System - Webflow Style
 *
 * Simple visual feedback: just the insertion line.
 * No ghost, no snap guides, no zone overlay.
 */

import type { VisualHint } from '../types'
import type { VisualSystem as IVisualSystem } from './types'
import { VISUAL_IDS } from './types'

export class VisualSystem implements IVisualSystem {
  private container: HTMLElement
  private indicatorElement: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  // ==========================================================================
  // Indicator (insertion line)
  // ==========================================================================

  showIndicator(hint: VisualHint): void {
    this.hideIndicator()

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
  }

  hideIndicator(): void {
    if (this.indicatorElement) {
      this.indicatorElement.remove()
      this.indicatorElement = null
    }
  }

  // ==========================================================================
  // Legacy methods (no-op for compatibility)
  // ==========================================================================

  showGhost(): void {}
  updateGhost(): void {}
  hideGhost(): void {}
  showSnapGuides(): void {}
  hideSnapGuides(): void {}
  showZoneOverlay(): void {}
  hideZoneOverlay(): void {}

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  clear(): void {
    this.hideIndicator()
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
