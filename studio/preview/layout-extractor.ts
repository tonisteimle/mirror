/**
 * LayoutExtractor - Extract layout information from rendered DOM
 *
 * Phase 1 of Preview Architecture Refactoring
 *
 * This module extracts layout information (positions, sizes, padding, etc.)
 * from the rendered preview DOM and stores it in the state. This eliminates
 * the need for scattered getBoundingClientRect() calls throughout the codebase.
 *
 * Flow:
 * 1. Compile → 2. Render → 3. Extract (this module) → 4. Overlays read from state
 */

import { actions, type LayoutRect } from '../core/state'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('LayoutExtractor')

/**
 * Extract layout information from all elements in the preview container
 *
 * @param container - The preview container element
 * @returns Map from nodeId to LayoutRect
 */
export function extractLayoutInfo(container: HTMLElement): Map<string, LayoutRect> {
  const layoutInfo = new Map<string, LayoutRect>()
  const containerRect = container.getBoundingClientRect()

  // Find all elements with data-mirror-id
  const elements = container.querySelectorAll('[data-mirror-id]')

  for (const element of elements) {
    const nodeId = element.getAttribute('data-mirror-id')
    if (!nodeId) continue

    const rect = extractElementLayout(element as HTMLElement, containerRect)
    if (rect) {
      layoutInfo.set(nodeId, rect)
    }
  }

  return layoutInfo
}

/**
 * Extract layout information for a single element
 *
 * @param element - The DOM element
 * @param containerRect - The container's bounding rect (for relative positioning)
 * @returns LayoutRect or null if extraction fails
 */
export function extractElementLayout(
  element: HTMLElement,
  containerRect: DOMRect
): LayoutRect | null {
  try {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    // Get parent nodeId
    const parentElement = element.parentElement?.closest('[data-mirror-id]')
    const parentId = parentElement?.getAttribute('data-mirror-id') ?? null

    // Parse padding values
    const padding = {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    }

    // Parse margin values
    const margin = {
      top: parseFloat(style.marginTop) || 0,
      right: parseFloat(style.marginRight) || 0,
      bottom: parseFloat(style.marginBottom) || 0,
      left: parseFloat(style.marginLeft) || 0,
    }

    // Parse gap
    const gap = parseFloat(style.gap) || 0

    // Parse border radius (use first value if shorthand)
    const radiusStr = style.borderRadius || '0'
    const radius = parseFloat(radiusStr.split(' ')[0]) || 0

    // Check if absolute positioned
    const isAbsolute = style.position === 'absolute'

    // Determine flex direction
    let flexDirection: 'row' | 'column' | null = null
    if (style.display === 'flex' || style.display === 'inline-flex') {
      flexDirection =
        style.flexDirection === 'column' || style.flexDirection === 'column-reverse'
          ? 'column'
          : 'row'
    }

    // Check if container (has children with data-mirror-id or is flex/grid)
    const isContainer =
      style.display === 'flex' ||
      style.display === 'inline-flex' ||
      style.display === 'grid' ||
      style.display === 'inline-grid' ||
      element.querySelector('[data-mirror-id]') !== null

    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      padding,
      margin,
      gap,
      radius,
      isAbsolute,
      parentId,
      flexDirection,
      isContainer,
    }
  } catch (error) {
    log.warn('Failed to extract layout for element:', error)
    return null
  }
}

/**
 * Extract and store layout info in state
 * Call this after render completes
 *
 * @param container - The preview container element
 */
export function extractAndStoreLayout(container: HTMLElement): void {
  const layoutInfo = extractLayoutInfo(container)
  actions.setLayoutInfo(layoutInfo)
}

/**
 * Get layout rect for a specific node from state
 * Convenience wrapper around actions.getLayoutRect
 *
 * @param nodeId - The node ID to get layout for
 * @returns LayoutRect or null if not found
 */
export function getLayoutRect(nodeId: string): LayoutRect | null {
  return actions.getLayoutRect(nodeId)
}

/**
 * Get multiple layout rects at once
 *
 * @param nodeIds - Array of node IDs
 * @returns Map from nodeId to LayoutRect (only includes found nodes)
 */
export function getLayoutRects(nodeIds: string[]): Map<string, LayoutRect> {
  const result = new Map<string, LayoutRect>()
  for (const nodeId of nodeIds) {
    const rect = actions.getLayoutRect(nodeId)
    if (rect) {
      result.set(nodeId, rect)
    }
  }
  return result
}

/**
 * Check if layout info is available for a node
 *
 * @param nodeId - The node ID to check
 * @returns true if layout info exists
 */
export function hasLayoutInfo(nodeId: string): boolean {
  return actions.getLayoutRect(nodeId) !== null
}
