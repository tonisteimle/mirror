/**
 * Guide Calculator
 *
 * Calculates alignment guides when dragging elements.
 * Detects when edges or centers align with siblings or container.
 */

import type { AlignmentEdge, Guide, SnapResult, ElementRect } from './types'
import { smartGuidesSettings } from '../../core/settings'

const DEFAULT_THRESHOLD = 4 // px

export class GuideCalculator {
  private threshold: number

  constructor(threshold?: number) {
    this.threshold = threshold ?? DEFAULT_THRESHOLD
  }

  /**
   * Calculate snap positions and guides for a moving element
   * Accepts DOMRect or layoutInfo-compatible rect objects
   */
  calculate(
    movingRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        },
    siblings: Map<
      string,
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        }
    >,
    containerRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        }
  ): SnapResult {
    const settings = smartGuidesSettings.get()
    if (!settings.enabled) {
      return {
        x: movingRect.left - containerRect.left,
        y: movingRect.top - containerRect.top,
        guides: [],
        snappedX: false,
        snappedY: false,
      }
    }

    const threshold = settings.threshold || this.threshold
    const guides: Guide[] = []

    // Current position relative to container
    let snapX = movingRect.left - containerRect.left
    let snapY = movingRect.top - containerRect.top
    let snappedX = false
    let snappedY = false

    // Collect all edges from siblings and container
    const edges = this.collectEdges(siblings, containerRect)

    // Moving element edges (relative to container)
    const movingLeft = movingRect.left - containerRect.left
    const movingRight = movingRect.right - containerRect.left
    const movingCenterX = movingLeft + movingRect.width / 2
    const movingTop = movingRect.top - containerRect.top
    const movingBottom = movingRect.bottom - containerRect.top
    const movingCenterY = movingTop + movingRect.height / 2

    // Check vertical alignment (left, right, centerX)
    for (const edge of edges.vertical) {
      // Left edge of moving element aligns with edge
      if (!snappedX && Math.abs(movingLeft - edge.position) < threshold) {
        snapX = edge.position
        snappedX = true
        guides.push(this.createVerticalGuide(edge.position, movingRect, containerRect, edge))
      }
      // Right edge of moving element aligns with edge
      if (!snappedX && Math.abs(movingRight - edge.position) < threshold) {
        snapX = edge.position - movingRect.width
        snappedX = true
        guides.push(this.createVerticalGuide(edge.position, movingRect, containerRect, edge))
      }
      // Center of moving element aligns with edge
      if (!snappedX && Math.abs(movingCenterX - edge.position) < threshold) {
        snapX = edge.position - movingRect.width / 2
        snappedX = true
        guides.push(this.createVerticalGuide(edge.position, movingRect, containerRect, edge))
      }
    }

    // Check horizontal alignment (top, bottom, centerY)
    for (const edge of edges.horizontal) {
      // Top edge of moving element aligns with edge
      if (!snappedY && Math.abs(movingTop - edge.position) < threshold) {
        snapY = edge.position
        snappedY = true
        guides.push(this.createHorizontalGuide(edge.position, movingRect, containerRect, edge))
      }
      // Bottom edge of moving element aligns with edge
      if (!snappedY && Math.abs(movingBottom - edge.position) < threshold) {
        snapY = edge.position - movingRect.height
        snappedY = true
        guides.push(this.createHorizontalGuide(edge.position, movingRect, containerRect, edge))
      }
      // Center of moving element aligns with edge
      if (!snappedY && Math.abs(movingCenterY - edge.position) < threshold) {
        snapY = edge.position - movingRect.height / 2
        snappedY = true
        guides.push(this.createHorizontalGuide(edge.position, movingRect, containerRect, edge))
      }
    }

    return { x: snapX, y: snapY, guides, snappedX, snappedY }
  }

  /**
   * Collect all edges from siblings and container
   */
  private collectEdges(
    siblings: Map<
      string,
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        }
    >,
    container:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        }
  ): {
    vertical: AlignmentEdge[]
    horizontal: AlignmentEdge[]
  } {
    const vertical: AlignmentEdge[] = []
    const horizontal: AlignmentEdge[] = []

    // Container edges (relative positions)
    vertical.push(
      { type: 'left', position: 0, elementId: 'container' },
      { type: 'right', position: container.width, elementId: 'container' },
      { type: 'centerX', position: container.width / 2, elementId: 'container' }
    )
    horizontal.push(
      { type: 'top', position: 0, elementId: 'container' },
      { type: 'bottom', position: container.height, elementId: 'container' },
      { type: 'centerY', position: container.height / 2, elementId: 'container' }
    )

    // Sibling edges (relative to container)
    for (const [id, rect] of siblings) {
      const relLeft = rect.left - container.left
      const relTop = rect.top - container.top
      const relRight = relLeft + rect.width
      const relBottom = relTop + rect.height
      const relCenterX = relLeft + rect.width / 2
      const relCenterY = relTop + rect.height / 2

      vertical.push(
        { type: 'left', position: relLeft, elementId: id },
        { type: 'right', position: relRight, elementId: id },
        { type: 'centerX', position: relCenterX, elementId: id }
      )
      horizontal.push(
        { type: 'top', position: relTop, elementId: id },
        { type: 'bottom', position: relBottom, elementId: id },
        { type: 'centerY', position: relCenterY, elementId: id }
      )
    }

    return { vertical, horizontal }
  }

  /**
   * Create a vertical guide line
   */
  private createVerticalGuide(
    position: number,
    movingRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        },
    containerRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        },
    edge: AlignmentEdge
  ): Guide {
    const movingTop = movingRect.top - containerRect.top
    const movingBottom = movingRect.bottom - containerRect.top

    // Guide extends from top of moving element to edge element (or vice versa)
    return {
      axis: 'vertical',
      position,
      start: Math.min(movingTop, 0),
      end: Math.max(movingBottom, containerRect.height),
      alignedEdges: [edge],
    }
  }

  /**
   * Create a horizontal guide line
   */
  private createHorizontalGuide(
    position: number,
    movingRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        },
    containerRect:
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        },
    edge: AlignmentEdge
  ): Guide {
    const movingLeft = movingRect.left - containerRect.left,
      movingRight = movingRect.right - containerRect.left
    return {
      axis: 'horizontal',
      position,
      start: Math.min(movingLeft, 0),
      end: Math.max(movingRight, containerRect.width),
      alignedEdges: [edge],
    }
  }

  /**
   * Set snap threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold
  }
}

export function createGuideCalculator(threshold?: number): GuideCalculator {
  return new GuideCalculator(threshold)
}
