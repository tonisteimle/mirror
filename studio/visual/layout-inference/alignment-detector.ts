/**
 * AlignmentDetector - Detects aligned absolutely positioned elements
 *
 * Heuristics:
 * - Horizontal alignment: Elements share similar Y center and don't overlap horizontally
 * - Gap inference: Average gap between adjacent elements, rounded to 4px grid
 */

import type {
  AlignmentDetectorConfig,
  AlignmentDetectionResult,
  AlignmentGroup,
  AlignmentType,
  ElementBounds,
} from './types'

const DEFAULT_TOLERANCE = 10 // px
const DEFAULT_MIN_GROUP_SIZE = 2
const DEFAULT_NODE_ID_ATTR = 'data-mirror-id'

export class AlignmentDetector {
  private container: HTMLElement
  private tolerance: number
  private minGroupSize: number
  private nodeIdAttribute: string

  constructor(config: AlignmentDetectorConfig) {
    this.container = config.container
    this.tolerance = config.tolerance ?? DEFAULT_TOLERANCE
    this.minGroupSize = config.minGroupSize ?? DEFAULT_MIN_GROUP_SIZE
    this.nodeIdAttribute = config.nodeIdAttribute ?? DEFAULT_NODE_ID_ATTR
  }

  /**
   * Detect aligned elements and return groups
   */
  detect(): AlignmentDetectionResult {
    const elements = this.getAbsolutelyPositionedElements()
    const groups: AlignmentGroup[] = []

    // Find horizontal alignments
    const horizontalGroups = this.findHorizontalAlignments(elements)
    groups.push(...horizontalGroups)

    return {
      groups,
      timestamp: Date.now(),
    }
  }

  /**
   * Get all absolutely positioned elements with Mirror node IDs
   */
  private getAbsolutelyPositionedElements(): ElementBounds[] {
    const elements: ElementBounds[] = []
    const nodeElements = this.container.querySelectorAll(`[${this.nodeIdAttribute}]`)

    for (const el of nodeElements) {
      const element = el as HTMLElement
      const style = window.getComputedStyle(element)

      // Check if element is absolutely positioned
      if (style.position !== 'absolute') continue

      const nodeId = element.getAttribute(this.nodeIdAttribute)
      if (!nodeId) continue

      const rect = element.getBoundingClientRect()

      elements.push({
        nodeId,
        element,
        rect,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      })
    }

    return elements
  }

  /**
   * Find groups of horizontally aligned elements
   */
  private findHorizontalAlignments(elements: ElementBounds[]): AlignmentGroup[] {
    const groups: AlignmentGroup[] = []
    const used = new Set<string>()

    // Sort by Y position for easier grouping
    const sorted = [...elements].sort((a, b) => a.centerY - b.centerY)

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].nodeId)) continue

      const group: ElementBounds[] = [sorted[i]]
      used.add(sorted[i].nodeId)

      // Find other elements aligned with this one
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].nodeId)) continue

        // Check if aligned with any element in the group
        const isAligned = group.some(member =>
          this.areHorizontallyAligned(member, sorted[j])
        )

        if (isAligned) {
          group.push(sorted[j])
          used.add(sorted[j].nodeId)
        }
      }

      // Only create group if we have enough elements
      if (group.length >= this.minGroupSize) {
        // Sort group by X position
        group.sort((a, b) => a.rect.left - b.rect.left)

        const gap = this.inferGap(group)
        const id = `align-${Date.now()}-${groups.length}`

        groups.push({
          id,
          type: 'horizontal',
          elements: group,
          inferredGap: gap,
          suggestedDSL: `hor, gap ${gap}`,
        })
      }
    }

    return groups
  }

  /**
   * Check if two elements are horizontally aligned
   */
  private areHorizontallyAligned(a: ElementBounds, b: ElementBounds): boolean {
    // Check Y center alignment within tolerance
    const yDiff = Math.abs(a.centerY - b.centerY)
    if (yDiff > this.tolerance) return false

    // Check that they don't overlap horizontally
    const noOverlap = a.rect.right < b.rect.left || b.rect.right < a.rect.left
    return noOverlap
  }

  /**
   * Infer the gap between elements (rounded to 4px grid)
   */
  private inferGap(elements: ElementBounds[]): number {
    if (elements.length < 2) return 0

    // Elements should already be sorted by X position
    const gaps: number[] = []

    for (let i = 0; i < elements.length - 1; i++) {
      const gap = elements[i + 1].rect.left - elements[i].rect.right
      gaps.push(gap)
    }

    // Calculate average gap
    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length

    // Round to 4px grid
    return Math.round(avgGap / 4) * 4
  }

  /**
   * Update configuration
   */
  setTolerance(tolerance: number): void {
    this.tolerance = tolerance
  }

  /**
   * Dispose
   */
  dispose(): void {
    // Nothing to clean up
  }
}

/**
 * Create an AlignmentDetector instance
 */
export function createAlignmentDetector(config: AlignmentDetectorConfig): AlignmentDetector {
  return new AlignmentDetector(config)
}
