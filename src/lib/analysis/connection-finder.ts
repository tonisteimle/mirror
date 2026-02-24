/**
 * Connection Finder
 *
 * Finds suitable insertion points for new components in existing layouts.
 * Part of the Analysis Foundation (Increment 5).
 */

import { analyzeLayout } from './layout-analyzer'
import type { LayoutNode } from './layout-analyzer'

/**
 * Represents a potential insertion point for new components
 */
export interface ConnectionPoint {
  parent: string                    // Parent component name
  position: 'first' | 'last' | 'after' | 'before'
  reference?: string                // Reference component (for after/before)
  depth: number                     // Nesting depth
  layout: 'horizontal' | 'vertical' | 'grid' | 'stacked' | 'unknown'
  suggestedProps: {
    sizing?: string                 // e.g., "w-max", "width: 280"
    layout?: string                 // e.g., "vertical"
  }
  suitability: number               // 0-1 score for this insertion point
  path: string[]                    // Path from root to this point
}

// Component type hints for scoring
const HORIZONTAL_COMPONENTS = ['Panel', 'Sidebar', 'Column', 'Col', 'Nav', 'Menu']
const VERTICAL_COMPONENTS = ['List', 'Stack', 'Form', 'Content', 'Section']
const CONTAINER_COMPONENTS = ['Card', 'Box', 'Container', 'Wrapper', 'Group']

/**
 * Finds all potential insertion points for a new component
 */
export function findConnectionPoints(code: string, componentType: string): ConnectionPoint[] {
  const analysis = analyzeLayout(code)
  if (!analysis.root) return []

  const points: ConnectionPoint[] = []

  // Recursively find insertion points
  collectConnectionPoints(analysis.root, componentType, [], points)

  // Sort by suitability
  points.sort((a, b) => b.suitability - a.suitability)

  return points
}

/**
 * Recursively collects connection points from a layout node
 */
function collectConnectionPoints(
  node: LayoutNode,
  componentType: string,
  path: string[],
  points: ConnectionPoint[]
): void {
  const currentPath = [...path, node.name]

  // Add insertion point at the end of this container
  const lastChildPoint: ConnectionPoint = {
    parent: node.name,
    position: 'last',
    depth: node.depth,
    layout: node.layout,
    suggestedProps: suggestPropsForInsertion(node, componentType),
    suitability: scoreConnectionPoint(
      { parent: node.name, layout: node.layout, depth: node.depth } as ConnectionPoint,
      componentType
    ),
    path: currentPath
  }
  points.push(lastChildPoint)

  // Add insertion point at the beginning
  if (node.children.length > 0) {
    const firstChildPoint: ConnectionPoint = {
      parent: node.name,
      position: 'first',
      depth: node.depth,
      layout: node.layout,
      suggestedProps: suggestPropsForInsertion(node, componentType),
      suitability: scoreConnectionPoint(
        { parent: node.name, layout: node.layout, depth: node.depth } as ConnectionPoint,
        componentType
      ) * 0.9, // Slightly lower score for first position
      path: currentPath
    }
    points.push(firstChildPoint)
  }

  // Add insertion points after each child
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]

    // After this child
    const afterPoint: ConnectionPoint = {
      parent: node.name,
      position: 'after',
      reference: child.name,
      depth: node.depth,
      layout: node.layout,
      suggestedProps: suggestPropsForInsertion(node, componentType),
      suitability: scoreConnectionPoint(
        { parent: node.name, layout: node.layout, depth: node.depth } as ConnectionPoint,
        componentType
      ) * 0.85,
      path: currentPath
    }
    points.push(afterPoint)

    // Always recurse into children - even empty containers can be insertion points
    collectConnectionPoints(child, componentType, currentPath, points)
  }
}

/**
 * Suggests properties for a component inserted at this point
 */
function suggestPropsForInsertion(
  parentNode: LayoutNode,
  componentType: string
): ConnectionPoint['suggestedProps'] {
  const props: ConnectionPoint['suggestedProps'] = {}

  // Sizing suggestions based on parent layout
  if (parentNode.layout === 'horizontal') {
    // In horizontal layout, suggest width
    if (isPanelLike(componentType)) {
      props.sizing = 'width: 280'
    } else if (isContentLike(componentType)) {
      props.sizing = 'w-max'
    } else {
      props.sizing = 'width: 200'
    }
  } else if (parentNode.layout === 'vertical') {
    // In vertical layout, suggest height or h-max
    if (isContentLike(componentType)) {
      props.sizing = 'h-max'
    }
  }

  // Layout suggestion for the new component
  if (isContainerLike(componentType)) {
    props.layout = 'vertical'
  }

  return props
}

/**
 * Scores how suitable a connection point is for a component type
 */
export function scoreConnectionPoint(
  point: Pick<ConnectionPoint, 'parent' | 'layout' | 'depth'>,
  componentType: string
): number {
  let score = 0.5 // Base score

  // Layout compatibility
  if (point.layout === 'horizontal') {
    if (isPanelLike(componentType)) {
      score += 0.3 // Panels fit well in horizontal layouts
    } else if (isVerticalComponent(componentType)) {
      score += 0.1
    }
  } else if (point.layout === 'vertical') {
    if (isVerticalComponent(componentType)) {
      score += 0.3
    } else if (isPanelLike(componentType)) {
      score += 0.1
    }
  } else if (point.layout === 'grid') {
    if (isCardLike(componentType)) {
      score += 0.4 // Cards fit great in grids
    }
  }

  // Parent name compatibility
  const parentLower = point.parent.toLowerCase()
  const typeLower = componentType.toLowerCase()

  // Check if parent name suggests this is a good container
  if (parentLower.includes('content') || parentLower.includes('main')) {
    score += 0.15
  }
  if (parentLower.includes('list') && typeLower.includes('item')) {
    score += 0.3
  }
  if (parentLower.includes('card') && isContentLike(componentType)) {
    score += 0.2
  }

  // Depth penalty (prefer shallower insertions)
  if (point.depth > 3) {
    score -= 0.1 * (point.depth - 3)
  }

  // Clamp to 0-1
  return Math.max(0, Math.min(1, score))
}

/**
 * Helper: Check if component type is panel-like
 */
function isPanelLike(type: string): boolean {
  const lower = type.toLowerCase()
  return HORIZONTAL_COMPONENTS.some(c => lower.includes(c.toLowerCase()))
}

/**
 * Helper: Check if component type is vertical/list-like
 */
function isVerticalComponent(type: string): boolean {
  const lower = type.toLowerCase()
  return VERTICAL_COMPONENTS.some(c => lower.includes(c.toLowerCase()))
}

/**
 * Helper: Check if component type is container-like
 */
function isContainerLike(type: string): boolean {
  const lower = type.toLowerCase()
  return CONTAINER_COMPONENTS.some(c => lower.includes(c.toLowerCase()))
}

/**
 * Helper: Check if component type is card-like
 */
function isCardLike(type: string): boolean {
  const lower = type.toLowerCase()
  return lower.includes('card') || lower.includes('tile') || lower.includes('item')
}

/**
 * Helper: Check if component type is content-like
 */
function isContentLike(type: string): boolean {
  const lower = type.toLowerCase()
  return lower.includes('content') || lower.includes('body') || lower.includes('main')
}

/**
 * Finds the best insertion point for a component
 */
export function findBestConnectionPoint(
  code: string,
  componentType: string
): ConnectionPoint | null {
  const points = findConnectionPoints(code, componentType)
  return points.length > 0 ? points[0] : null
}

/**
 * Gets insertion points for a specific parent
 */
export function getConnectionPointsForParent(
  code: string,
  parentName: string,
  componentType: string
): ConnectionPoint[] {
  const points = findConnectionPoints(code, componentType)
  return points.filter(p => p.parent === parentName)
}

/**
 * Formats a connection point as an insertion hint for LLM
 */
export function formatConnectionPointForLLM(point: ConnectionPoint): string {
  const parts: string[] = []

  parts.push(`Einfügen in: ${point.parent}`)
  parts.push(`Position: ${formatPosition(point)}`)
  parts.push(`Layout: ${point.layout}`)

  if (point.suggestedProps.sizing) {
    parts.push(`Empfohlene Größe: ${point.suggestedProps.sizing}`)
  }
  if (point.suggestedProps.layout) {
    parts.push(`Empfohlenes Layout: ${point.suggestedProps.layout}`)
  }

  parts.push(`Pfad: ${point.path.join(' > ')}`)

  return parts.join('\n')
}

/**
 * Helper: Format position for display
 */
function formatPosition(point: ConnectionPoint): string {
  switch (point.position) {
    case 'first':
      return 'Am Anfang'
    case 'last':
      return 'Am Ende'
    case 'after':
      return `Nach ${point.reference}`
    case 'before':
      return `Vor ${point.reference}`
    default:
      return point.position
  }
}
