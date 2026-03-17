/**
 * Guide Renderer
 *
 * Renders alignment guide lines during drag operations.
 */

import type { Guide } from './types'
import { smartGuidesSettings } from '../../core/settings'

export class GuideRenderer {
  private container: HTMLElement
  private guides: HTMLElement[] = []

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Render guides
   */
  render(guides: Guide[]): void {
    this.clear()

    const settings = smartGuidesSettings.get()
    const color = settings.color || '#FF6B6B'

    for (const guide of guides) {
      const line = this.createGuideLine(guide, color)
      this.container.appendChild(line)
      this.guides.push(line)
    }
  }

  /**
   * Create a guide line element
   */
  private createGuideLine(guide: Guide, color: string): HTMLElement {
    const line = document.createElement('div')
    line.className = 'smart-guide'

    if (guide.axis === 'vertical') {
      Object.assign(line.style, {
        position: 'absolute',
        left: `${guide.position}px`,
        top: `${guide.start}px`,
        width: '1px',
        height: `${guide.end - guide.start}px`,
        background: color,
        opacity: '0.8',
        pointerEvents: 'none',
        zIndex: '9999',
      })
    } else {
      Object.assign(line.style, {
        position: 'absolute',
        left: `${guide.start}px`,
        top: `${guide.position}px`,
        width: `${guide.end - guide.start}px`,
        height: '1px',
        background: color,
        opacity: '0.8',
        pointerEvents: 'none',
        zIndex: '9999',
      })
    }

    return line
  }

  /**
   * Clear all guides
   */
  clear(): void {
    for (const guide of this.guides) {
      guide.remove()
    }
    this.guides = []
  }

  /**
   * Check if any guides are currently shown
   */
  hasGuides(): boolean {
    return this.guides.length > 0
  }

  /**
   * Dispose the renderer
   */
  dispose(): void {
    this.clear()
  }
}

export function createGuideRenderer(container: HTMLElement): GuideRenderer {
  return new GuideRenderer(container)
}
