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
 * Component names that are "leaf" elements and should not accept children.
 * These are text elements, form inputs, media elements, etc.
 */
const LEAF_COMPONENTS = new Set([
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
function isLeafComponent(element: HTMLElement): boolean {
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
 */
export function detectTarget(
  element: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR
): DropTarget | null {
  const nodeId = element.getAttribute(nodeIdAttr)
  if (!nodeId) return null

  // Check if this is a leaf component - force non-container layout
  if (isLeafComponent(element)) {
    return {
      nodeId,
      element,
      layoutType: 'none',
      direction: 'vertical',
      hasChildren: false,
      isPositioned: false,
    }
  }

  const style = window.getComputedStyle(element)
  const layoutType = detectLayoutType(element, style)
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
 *
 * For leaf elements (text, button, etc.), we return the parent container
 * so that drop positions are calculated between siblings, not before/after
 * the individual leaf element.
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
    if (target) {
      // If this is a leaf element, find the parent container instead
      // This ensures drop positions are calculated between siblings
      if (target.layoutType === 'none' && current.parentElement) {
        const parentTarget = findClosestTarget(current.parentElement, nodeIdAttr)
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
 * Detect layout type from element (checks both CSS and data attributes)
 */
function detectLayoutType(element: HTMLElement, style: CSSStyleDeclaration): LayoutType {
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
 */
export function getContainerRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect()
}
