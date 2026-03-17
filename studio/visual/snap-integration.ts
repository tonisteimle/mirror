/**
 * Snap Integration - Grid and Smart Guide Snapping
 *
 * Combines grid snapping and smart guide alignment for click-to-draw.
 */

import type { Rect } from './draw-manager'
import type { Guide } from './smart-guides/types'
import { GuideCalculator } from './smart-guides/guide-calculator'

export interface SnapConfig {
  gridSize: number
  enableSmartGuides: boolean
  snapTolerance: number
  disableSnapping: boolean
}

export interface SnapResult {
  rect: Rect
  guides: Guide[]
}

export class SnapIntegration {
  private guideCalculator: GuideCalculator

  constructor(private config: SnapConfig) {
    this.guideCalculator = new GuideCalculator(config.snapTolerance)
  }

  /**
   * Apply snapping to a rectangle
   */
  snap(
    rect: Rect,
    siblings: Map<string, DOMRect>,
    containerRect: DOMRect,
    disableSnapping: boolean = false
  ): SnapResult {
    // If snapping disabled (e.g., Cmd/Ctrl held), return as-is
    if (disableSnapping || this.config.disableSnapping) {
      return { rect, guides: [] }
    }

    // 1. Apply grid snapping first
    let snapped = this.applyGridSnap(rect)

    // 2. Apply smart guide snapping (if enabled)
    let guides: Guide[] = []
    if (this.config.enableSmartGuides) {
      const result = this.applySmartGuideSnap(snapped, siblings, containerRect)
      snapped = result.rect
      guides = result.guides
    }

    return { rect: snapped, guides }
  }

  /**
   * Apply grid snapping
   */
  private applyGridSnap(rect: Rect): Rect {
    const { gridSize } = this.config
    if (gridSize === 0) return rect

    return {
      x: Math.round(rect.x / gridSize) * gridSize,
      y: Math.round(rect.y / gridSize) * gridSize,
      width: Math.round(rect.width / gridSize) * gridSize,
      height: Math.round(rect.height / gridSize) * gridSize,
    }
  }

  /**
   * Apply smart guide snapping
   */
  private applySmartGuideSnap(
    rect: Rect,
    siblings: Map<string, DOMRect>,
    containerRect: DOMRect
  ): SnapResult {
    // Convert our Rect to DOMRect for GuideCalculator
    const movingRect = new DOMRect(
      rect.x + containerRect.left,
      rect.y + containerRect.top,
      rect.width,
      rect.height
    )

    // Calculate snap positions and guides
    const snapResult = this.guideCalculator.calculate(movingRect, siblings, containerRect)

    // Convert back to container-relative coordinates
    const snappedRect: Rect = {
      x: snapResult.snappedX ? snapResult.x : rect.x,
      y: snapResult.snappedY ? snapResult.y : rect.y,
      width: rect.width,
      height: rect.height,
    }

    return {
      rect: snappedRect,
      guides: snapResult.guides,
    }
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<SnapConfig>): void {
    Object.assign(this.config, config)
  }
}

/**
 * Create a SnapIntegration instance
 */
export function createSnapIntegration(config: SnapConfig): SnapIntegration {
  return new SnapIntegration(config)
}
