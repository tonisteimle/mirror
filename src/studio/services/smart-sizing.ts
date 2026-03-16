/**
 * SmartSizingService - Calculates intelligent initial sizes for new elements
 *
 * When a new element is dropped into a container, this service determines
 * appropriate initial dimensions based on:
 * - Available (residual) space in the parent
 * - Parent layout direction (horizontal vs vertical)
 * - Existing siblings
 */

import type { SourceMap } from '../source-map'
import { isHorizontalLayout } from '../utils/layout-detection'

export interface SizingResult {
  /** Width value: 'full', 'hug', or pixel number as string */
  width: string
  /** Height value: 'full', 'hug', or pixel number as string */
  height: string
}

export interface ResidualSpace {
  width: number
  height: number
}

export interface SmartSizingService {
  /**
   * Calculate initial size for a new element being added to a parent
   */
  calculateInitialSize(
    parentId: string,
    sourceMap: SourceMap,
    container: HTMLElement
  ): SizingResult

  /**
   * Calculate remaining space in a parent container
   * @param excludeChildId - Optional child to exclude (for move operations)
   */
  calculateResidualSpace(
    parentId: string,
    excludeChildId: string | undefined,
    sourceMap: SourceMap,
    container: HTMLElement
  ): ResidualSpace
}

/**
 * Create a SmartSizingService instance
 */
export function createSmartSizingService(): SmartSizingService {

  function calculateResidualSpace(
    parentId: string,
    excludeChildId: string | undefined,
    sourceMap: SourceMap,
    container: HTMLElement
  ): ResidualSpace {
    const parent = container.querySelector(`[data-mirror-id="${parentId}"]`) as HTMLElement | null
    if (!parent) return { width: 0, height: 0 }

    const parentRect = parent.getBoundingClientRect()
    const style = window.getComputedStyle(parent)
    const gap = parseInt(style.gap || '0', 10)

    // Account for padding
    const paddingLeft = parseInt(style.paddingLeft || '0', 10)
    const paddingRight = parseInt(style.paddingRight || '0', 10)
    const paddingTop = parseInt(style.paddingTop || '0', 10)
    const paddingBottom = parseInt(style.paddingBottom || '0', 10)

    const availableWidth = parentRect.width - paddingLeft - paddingRight
    const availableHeight = parentRect.height - paddingTop - paddingBottom

    let usedWidth = 0
    let usedHeight = 0
    const isHorizontal = isHorizontalLayout(parent)

    // Get children from SourceMap
    const children = sourceMap.getChildren(parentId)
    let childCount = 0

    for (const child of children) {
      if (child.nodeId === excludeChildId) continue

      const childEl = container.querySelector(`[data-mirror-id="${child.nodeId}"]`) as HTMLElement | null
      if (childEl) {
        const childRect = childEl.getBoundingClientRect()
        if (isHorizontal) {
          usedWidth += childRect.width
        } else {
          usedHeight += childRect.height
        }
        childCount++
      }
    }

    // Add gaps between children (n children = n-1 gaps, plus 1 gap for new element = n gaps total)
    if (childCount > 0) {
      // childCount gaps: n-1 existing gaps + 1 gap before new element
      if (isHorizontal) {
        usedWidth += gap * childCount
      } else {
        usedHeight += gap * childCount
      }
    }

    return {
      width: Math.max(0, availableWidth - usedWidth),
      height: Math.max(0, availableHeight - usedHeight),
    }
  }

  function calculateInitialSize(
    parentId: string,
    sourceMap: SourceMap,
    container: HTMLElement
  ): SizingResult {
    const parent = container.querySelector(`[data-mirror-id="${parentId}"]`) as HTMLElement | null
    if (!parent) {
      // Fallback: full width, hug height
      return { width: 'full', height: 'hug' }
    }

    const isHorizontal = isHorizontalLayout(parent)
    const residual = calculateResidualSpace(parentId, undefined, sourceMap, container)

    // Minimum size
    const MIN_SIZE = 40

    if (isHorizontal) {
      // Horizontal layout: take half of available width, full height
      const width = Math.max(MIN_SIZE, Math.round(residual.width / 2))
      return {
        width: String(width),
        height: 'full',
      }
    } else {
      // Vertical layout: full width, take half of available height
      const height = Math.max(MIN_SIZE, Math.round(residual.height / 2))
      return {
        width: 'full',
        height: String(height),
      }
    }
  }

  return {
    calculateInitialSize,
    calculateResidualSpace,
  }
}
