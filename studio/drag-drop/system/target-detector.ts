/**
 * Target Detector
 *
 * Analyzes DOM elements to determine drop target properties.
 * Extracts layout type, direction, and child information.
 */

import type { DropTarget, Direction, LayoutType } from '../types'
import type { ChildRect } from '../strategies/types'

const DEFAULT_NODE_ID_ATTR = 'data-node-id'

/**
 * Detect drop target from a DOM element
 */
export function detectTarget(
  element: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR
): DropTarget | null {
  const nodeId = element.getAttribute(nodeIdAttr)
  if (!nodeId) return null

  const style = window.getComputedStyle(element)
  const layoutType = detectLayoutType(style)
  const direction = detectDirection(style)
  const hasChildren = hasValidChildren(element, nodeIdAttr)
  const isPositioned = layoutType === 'positioned'

  return {
    nodeId,
    element,
    layoutType,
    direction,
    hasChildren,
    isPositioned,
  }
}

/**
 * Find the closest drop target from an element
 */
export function findClosestTarget(
  element: HTMLElement | null,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR
): DropTarget | null {
  if (!element) return null

  // Walk up the tree to find an element with node ID
  let current: HTMLElement | null = element

  while (current) {
    const target = detectTarget(current, nodeIdAttr)
    if (target) return target
    current = current.parentElement
  }

  return null
}

/**
 * Get child rects for a container
 */
export function getChildRects(
  container: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR
): ChildRect[] {
  const children: ChildRect[] = []

  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue

    const nodeId = child.getAttribute(nodeIdAttr)
    if (!nodeId) continue

    const domRect = child.getBoundingClientRect()
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
 */
export function getSiblingRects(
  container: HTMLElement,
  excludeNodeId: string | null,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR
): { nodeId: string; rect: DOMRect }[] {
  const siblings: { nodeId: string; rect: DOMRect }[] = []

  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue

    const nodeId = child.getAttribute(nodeIdAttr)
    if (!nodeId || nodeId === excludeNodeId) continue

    siblings.push({
      nodeId,
      rect: child.getBoundingClientRect(),
    })
  }

  return siblings
}

/**
 * Detect layout type from computed style
 */
function detectLayoutType(style: CSSStyleDeclaration): LayoutType {
  // Check display property first - this determines if it's a container
  const display = style.display
  if (display === 'flex' || display === 'inline-flex') {
    return 'flex'
  }
  if (display === 'grid' || display === 'inline-grid') {
    return 'flex' // Treat grid as flex for insertion purposes
  }

  // Note: position:relative alone does NOT make something a flex container
  // It just establishes a positioning context for absolute children

  return 'none'
}

/**
 * Detect flex direction from computed style
 */
function detectDirection(style: CSSStyleDeclaration): Direction {
  const flexDirection = style.flexDirection

  if (flexDirection === 'column' || flexDirection === 'column-reverse') {
    return 'vertical'
  }

  return 'horizontal'
}

/**
 * Check if element has valid children (with node IDs)
 */
function hasValidChildren(
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
 * Check if an element is marked as positioned container
 */
export function isPositionedContainer(
  element: HTMLElement,
  posClass: string = 'pos'
): boolean {
  return (
    element.classList.contains(posClass) ||
    element.getAttribute('data-positioned') === 'true'
  )
}

/**
 * Get container rect
 */
export function getContainerRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect()
}
