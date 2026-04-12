/**
 * Target Detector
 *
 * Analyzes DOM elements to determine drop target properties.
 * Extracts layout type, direction, and child information.
 *
 * Performance optimizations:
 * - Element → DropTarget cache (cleared per drag operation)
 * - Avoids repeated DOM tree walks for the same element
 */

import type { DropTarget, Direction, LayoutType } from '../types'
import type { ChildRect } from '../strategies/types'
import type { LayoutRect } from '../../core/state'
import type { DOMAdapter } from './dom-adapter'
import { getDefaultDOMAdapter } from './dom-adapter'

const DEFAULT_NODE_ID_ATTR = 'data-mirror-id'

// ============================================
// Drag-scoped target cache
// ============================================

/**
 * Cache for element → DropTarget mapping.
 * Uses WeakMap so elements can be GC'd when removed from DOM.
 * Call clearTargetCache() on drag end to ensure fresh state.
 */
let targetCache = new WeakMap<HTMLElement, DropTarget | null>()

/**
 * Clear the target cache.
 * Should be called when drag ends to ensure fresh data for next drag.
 */
export function clearTargetCache(): void {
  targetCache = new WeakMap()
}

/**
 * Component names that are "leaf" elements and should not accept children.
 * These are text elements, form inputs, media elements, etc.
 */
export const LEAF_COMPONENTS = new Set([
  // Text elements
  'text', 'muted', 'title', 'label',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Interactive elements
  'button', 'link',
  // Form elements
  'input', 'textarea',
  // Media elements
  'image', 'img', 'icon',
  // Layout helpers
  'divider', 'spacer',
])

/**
 * Check if an element is a leaf component that shouldn't accept children
 */
export function isLeafComponent(element: HTMLElement): boolean {
  // Check data-mirror-name attribute (set by Mirror's DOM backend)
  const mirrorName = element.dataset.mirrorName?.toLowerCase()
  if (mirrorName && LEAF_COMPONENTS.has(mirrorName)) {
    return true
  }

  // Check tag name for semantic HTML elements
  const tagName = element.tagName.toLowerCase()
  if (['span', 'button', 'input', 'textarea', 'img', 'hr', 'a'].includes(tagName)) {
    return true
  }

  // Check for heading elements
  if (/^h[1-6]$/.test(tagName)) {
    return true
  }

  return false
}

/**
 * Detect drop target from a DOM element
 * @param element - The HTML element to analyze
 * @param nodeIdAttr - Attribute name for node ID (default: 'data-mirror-id')
 * @param domAdapter - Optional DOM adapter for testability (defaults to real DOM)
 */
export function detectTarget(
  element: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  domAdapter: DOMAdapter = getDefaultDOMAdapter()
): DropTarget | null {
  // Check cache first
  if (targetCache.has(element)) {
    return targetCache.get(element) ?? null
  }

  const nodeId = element.getAttribute(nodeIdAttr)
  if (!nodeId) {
    targetCache.set(element, null)
    return null
  }

  // Check if this is a leaf component - force non-container layout
  if (isLeafComponent(element)) {
    const target: DropTarget = {
      nodeId,
      element,
      layoutType: 'none',
      direction: 'vertical',
      hasChildren: false,
      isPositioned: false,
    }
    targetCache.set(element, target)
    return target
  }

  const style = domAdapter.getComputedStyle(element)
  const layoutType = detectLayoutType(element, style)
  const direction = detectDirection(style)
  const hasChildren = hasValidChildren(element, nodeIdAttr)
  const isPositioned = layoutType === 'positioned'

  const target: DropTarget = {
    nodeId,
    element,
    layoutType,
    direction,
    hasChildren,
    isPositioned,
  }
  targetCache.set(element, target)
  return target
}

/**
 * Find the closest drop target from an element
 *
 * For leaf elements (text, button, etc.), we return the parent container
 * so that drop positions are calculated between siblings, not before/after
 * the individual leaf element.
 *
 * @param element - The starting element
 * @param nodeIdAttr - Attribute name for node ID (default: 'data-mirror-id')
 * @param domAdapter - Optional DOM adapter for testability (defaults to real DOM)
 */
export function findClosestTarget(
  element: HTMLElement | null,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  domAdapter: DOMAdapter = getDefaultDOMAdapter()
): DropTarget | null {
  if (!element) return null

  // Walk up the tree to find an element with node ID
  let current: HTMLElement | null = element

  while (current) {
    const target = detectTarget(current, nodeIdAttr, domAdapter)
    if (target) {
      // If this is a leaf element, find the parent container instead
      // This ensures drop positions are calculated between siblings
      if (target.layoutType === 'none' && current.parentElement) {
        const parentTarget = findClosestTarget(current.parentElement, nodeIdAttr, domAdapter)
        if (parentTarget && parentTarget.layoutType !== 'none') {
          return parentTarget
        }
      }
      return target
    }
    current = current.parentElement
  }

  return null
}

/**
 * Get child rects for a container
 * @param container - The container element
 * @param nodeIdAttr - Attribute name for node ID (default: 'data-mirror-id')
 * @param layoutInfo - Optional cached layout info (Phase 5 optimization)
 * @param domAdapter - Optional DOM adapter for testability (defaults to real DOM)
 */
export function getChildRects(
  container: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  layoutInfo?: Map<string, LayoutRect> | null,
  domAdapter: DOMAdapter = getDefaultDOMAdapter()
): ChildRect[] {
  const children: ChildRect[] = []
  const containerNodeId = container.getAttribute(nodeIdAttr)

  // Try to use layoutInfo if available (Phase 5 optimization)
  if (layoutInfo && containerNodeId) {
    for (const [nodeId, layout] of layoutInfo) {
      if (layout.parentId === containerNodeId) {
        children.push({
          nodeId,
          rect: {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
          },
        })
      }
    }
    if (children.length > 0) {
      return children
    }
  }

  // Fallback to DOM reads
  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue

    const nodeId = child.getAttribute(nodeIdAttr)
    if (!nodeId) continue

    const domRect = domAdapter.getBoundingClientRect(child)
    children.push({
      nodeId,
      rect: {
        x: domRect.x,
        y: domRect.y,
        width: domRect.width,
        height: domRect.height,
      },
    })
  }

  return children
}

/**
 * Get sibling rects for positioned containers (for snap calculations)
 * @param container - The container element
 * @param excludeNodeId - Node ID to exclude from results
 * @param nodeIdAttr - Attribute name for node ID (default: 'data-mirror-id')
 * @param layoutInfo - Optional cached layout info (Phase 5 optimization)
 * @param domAdapter - Optional DOM adapter for testability (defaults to real DOM)
 */
export function getSiblingRects(
  container: HTMLElement,
  excludeNodeId: string | null,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  layoutInfo?: Map<string, LayoutRect> | null,
  domAdapter: DOMAdapter = getDefaultDOMAdapter()
): { nodeId: string; rect: DOMRect | { x: number; y: number; width: number; height: number } }[] {
  const siblings: { nodeId: string; rect: DOMRect | { x: number; y: number; width: number; height: number } }[] = []
  const containerNodeId = container.getAttribute(nodeIdAttr)

  // Try to use layoutInfo if available (Phase 5 optimization)
  if (layoutInfo && containerNodeId) {
    for (const [nodeId, layout] of layoutInfo) {
      if (layout.parentId === containerNodeId && nodeId !== excludeNodeId) {
        siblings.push({
          nodeId,
          rect: {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
          },
        })
      }
    }
    if (siblings.length > 0) {
      return siblings
    }
  }

  // Fallback to DOM reads
  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue

    const nodeId = child.getAttribute(nodeIdAttr)
    if (!nodeId || nodeId === excludeNodeId) continue

    siblings.push({
      nodeId,
      rect: domAdapter.getBoundingClientRect(child),
    })
  }

  return siblings
}

/**
 * Detect layout type from element (checks both CSS and data attributes)
 */
export function detectLayoutType(element: HTMLElement, style: CSSStyleDeclaration): LayoutType {
  // Check for explicit data-layout attribute first (highest priority)
  // This is set by Mirror's IR transformation for stacked containers
  const layout = element.dataset?.layout
  if (layout === 'absolute' || layout === 'stacked') {
    return 'positioned'
  }

  // Check for position:relative with layout hints (Mirror-specific)
  const position = style.position
  if (position === 'relative') {
    // Legacy data-layout values that indicate absolute positioning context
    if (layout === 'abs' || layout === 'relative') {
      return 'positioned'
    }
    // Legacy data-mirror-abs attribute
    if (element.dataset?.mirrorAbsolute === 'true' || element.dataset?.mirrorAbs === 'true') {
      return 'positioned'
    }
    // Check for ZStack-like components
    const name = element.dataset?.mirrorName
    if (name === 'ZStack' || name === 'Canvas' || name === 'Artboard') {
      return 'positioned'
    }
  }

  // Check display property for flex/grid containers
  const display = style.display
  if (display === 'flex' || display === 'inline-flex') {
    return 'flex'
  }
  if (display === 'grid' || display === 'inline-grid') {
    return 'flex' // Treat grid as flex for insertion purposes
  }

  return 'none'
}

/**
 * Detect flex direction from computed style
 */
export function detectDirection(style: CSSStyleDeclaration): Direction {
  const flexDirection = style.flexDirection

  if (flexDirection === 'column' || flexDirection === 'column-reverse') {
    return 'vertical'
  }

  return 'horizontal'
}

/**
 * Check if element has valid children (with node IDs)
 */
export function hasValidChildren(
  element: HTMLElement,
  nodeIdAttr: string
): boolean {
  for (const child of element.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.getAttribute(nodeIdAttr)) return true
  }
  return false
}

/**
 * Check if an element is marked as stacked container
 */
export function isPositionedContainer(
  element: HTMLElement,
  stackedClass: string = 'stacked'
): boolean {
  return (
    element.classList.contains(stackedClass) ||
    element.getAttribute('data-stacked') === 'true'
  )
}

/**
 * Get container rect
 * @param element - The element to get the rect for
 * @param layoutInfo - Optional cached layout info (Phase 5 optimization)
 * @param nodeIdAttr - Attribute name for node ID
 * @param domAdapter - Optional DOM adapter for testability (defaults to real DOM)
 */
export function getContainerRect(
  element: HTMLElement,
  layoutInfo?: Map<string, LayoutRect> | null,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  domAdapter: DOMAdapter = getDefaultDOMAdapter()
): DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number } {
  // Try to use layoutInfo if available (Phase 5 optimization)
  if (layoutInfo) {
    const nodeId = element.getAttribute(nodeIdAttr)
    if (nodeId) {
      const layout = layoutInfo.get(nodeId)
      if (layout) {
        return {
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height,
          top: layout.y,
          left: layout.x,
          right: layout.x + layout.width,
          bottom: layout.y + layout.height,
        }
      }
    }
  }

  // Fallback to DOM read
  return domAdapter.getBoundingClientRect(element)
}
