/**
 * Absolute Drop Strategy
 *
 * Handles drop behavior for absolute/free-form containers.
 * Elements are positioned with x/y coordinates relative to container.
 *
 * Uses CoordinateTransformer for consistent coordinate handling:
 * - Scale factor (CSS transform)
 * - RTL support
 * - Grid snapping (delegated to DragDropManager to avoid double-snapping)
 * - Bounds clamping
 */

import type { DropZone } from '../drop-zone-calculator'
import type {
  LayoutDropStrategy,
  DropContext,
  AbsoluteDropResult,
  LayoutDropResult,
  IndicatorConfig,
} from './types'
import { isAbsoluteLayoutContainer } from '../utils/layout-detection'

/**
 * Configuration for absolute positioning behavior
 */
export interface AbsoluteStrategyOptions {
  /** Show position label during drag */
  showPositionLabel?: boolean
  /** Padding from container edges */
  edgePadding?: number
}

const DEFAULT_OPTIONS: Required<AbsoluteStrategyOptions> = {
  showPositionLabel: true,
  edgePadding: 0,
}

/**
 * Absolute layout drop strategy
 */
export class AbsoluteDropStrategy implements LayoutDropStrategy {
  readonly type = 'absolute' as const
  private options: Required<AbsoluteStrategyOptions>

  constructor(options: AbsoluteStrategyOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Check if element is an absolute container
   * Uses centralized layout detection for consistency.
   */
  matches(element: HTMLElement): boolean {
    return isAbsoluteLayoutContainer(element)
  }

  /**
   * Calculate drop zone with x/y position
   *
   * NOTE: Grid snapping is NOT applied here - it's handled centrally
   * by DragDropManager using CoordinateTransformer to avoid double-snapping.
   * This method returns raw (unsnapped) coordinates.
   */
  calculateDropZone(
    container: HTMLElement,
    context: DropContext
  ): AbsoluteDropResult | null {
    const { clientX, clientY, containerRect, isRTL = false, scale = 1 } = context
    const containerId = container.getAttribute('data-mirror-id') || 'root'

    // Calculate position relative to container, accounting for scale
    // When container is scaled, we need to divide by scale to get correct position
    let x = (clientX - containerRect.left) / scale
    let y = (clientY - containerRect.top) / scale

    // For RTL layouts, x is measured from right edge
    if (isRTL) {
      const containerWidth = containerRect.width / scale
      x = containerWidth - x
    }

    // Apply edge padding (ensures minimum distance from edges)
    if (this.options.edgePadding > 0) {
      x = Math.max(this.options.edgePadding, x)
      y = Math.max(this.options.edgePadding, y)
    }

    // Ensure non-negative
    x = Math.max(0, x)
    y = Math.max(0, y)

    // Round to integers for clean pixel values
    x = Math.round(x)
    y = Math.round(y)

    return {
      layoutType: 'absolute',
      placement: 'inside',
      targetId: containerId,
      parentId: containerId,
      x,
      y,
    }
  }

  /**
   * Get indicator configuration (crosshair)
   */
  getIndicatorConfig(
    result: LayoutDropResult,
    containerRect: DOMRect
  ): IndicatorConfig {
    const absResult = result as AbsoluteDropResult

    return {
      type: 'crosshair',
      x: containerRect.left + absResult.x,
      y: containerRect.top + absResult.y,
      label: this.options.showPositionLabel
        ? `x: ${absResult.x}, y: ${absResult.y}`
        : undefined,
    }
  }

  /**
   * Get x/y properties for insertion
   */
  getInsertionProperties(result: LayoutDropResult): Record<string, string> {
    const absResult = result as AbsoluteDropResult
    return {
      x: String(absResult.x),
      y: String(absResult.y),
    }
  }

  /**
   * Convert to standard DropZone
   */
  toDropZone(result: LayoutDropResult, element: HTMLElement): DropZone {
    const absResult = result as AbsoluteDropResult

    return {
      targetId: result.targetId,
      placement: 'inside',
      element,
      parentId: result.parentId,
      absolutePosition: {
        x: absResult.x,
        y: absResult.y,
      },
      isAbsoluteContainer: true,
    }
  }

  /**
   * Update options (e.g., change edge padding)
   */
  setOptions(options: Partial<AbsoluteStrategyOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current options
   */
  getOptions(): Readonly<Required<AbsoluteStrategyOptions>> {
    return this.options
  }
}

/**
 * Create absolute drop strategy instance
 */
export function createAbsoluteDropStrategy(
  options?: AbsoluteStrategyOptions
): AbsoluteDropStrategy {
  return new AbsoluteDropStrategy(options)
}
