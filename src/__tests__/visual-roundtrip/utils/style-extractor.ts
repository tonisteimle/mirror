/**
 * Style Extractor Utilities
 *
 * Extracts computed styles from DOM elements for comparison.
 */

/**
 * CSS properties to extract for comparison
 */
export const COMPARISON_PROPERTIES = [
  // Display & Layout
  'display',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'gap',
  'row-gap',
  'column-gap',

  // Sizing
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',

  // Spacing
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',

  // Colors
  'background-color',
  'color',
  'border-color',

  // Border
  'border-width',
  'border-style',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',

  // Typography
  'font-size',
  'font-weight',
  'font-family',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',

  // Visuals
  'opacity',
  'box-shadow',
  'cursor',
  'overflow',
  'overflow-x',
  'overflow-y',
  'visibility',

  // Transform
  'transform',

  // Position
  'position',
  'z-index'
] as const

export type ComparisonProperty = (typeof COMPARISON_PROPERTIES)[number]

export interface ExtractedStyles {
  element: string
  styles: Record<ComparisonProperty, string>
  children: ExtractedStyles[]
}

/**
 * Extract computed styles from an element
 */
export function extractComputedStyles(element: Element): Record<ComparisonProperty, string> {
  const computed = window.getComputedStyle(element)
  const styles: Record<string, string> = {}

  for (const prop of COMPARISON_PROPERTIES) {
    const value = computed.getPropertyValue(prop)
    if (value && value !== 'initial' && value !== 'auto' && value !== 'normal' && value !== 'none') {
      styles[prop] = value
    }
  }

  return styles as Record<ComparisonProperty, string>
}

/**
 * Recursively extract styles from element tree
 */
export function extractStyleTree(element: Element, maxDepth = 10): ExtractedStyles {
  const tagName = element.tagName.toLowerCase()
  const className = element.className ? `.${element.className.split(' ').join('.')}` : ''
  const elementDesc = `${tagName}${className}`

  const result: ExtractedStyles = {
    element: elementDesc,
    styles: extractComputedStyles(element),
    children: []
  }

  if (maxDepth > 0) {
    for (const child of Array.from(element.children)) {
      result.children.push(extractStyleTree(child, maxDepth - 1))
    }
  }

  return result
}

/**
 * Extract only critical styles (those most likely to affect visual appearance)
 */
export function extractCriticalStyles(element: Element): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const critical: Record<string, string> = {}

  // Critical layout properties
  const criticalProps = [
    'display',
    'flex-direction',
    'justify-content',
    'align-items',
    'gap',
    'padding',
    'background-color',
    'color',
    'border-radius',
    'font-size',
    'font-weight',
    'opacity'
  ]

  for (const prop of criticalProps) {
    const value = computed.getPropertyValue(prop)
    if (value && value !== 'initial' && value !== 'auto' && value !== 'normal' && value !== 'none') {
      critical[prop] = value
    }
  }

  return critical
}

/**
 * Flatten style tree into array of element styles
 */
export function flattenStyleTree(tree: ExtractedStyles): Array<{ element: string; styles: Record<string, string> }> {
  const result: Array<{ element: string; styles: Record<string, string> }> = []

  function traverse(node: ExtractedStyles, path: string = '') {
    const fullPath = path ? `${path} > ${node.element}` : node.element
    result.push({ element: fullPath, styles: node.styles })

    for (const child of node.children) {
      traverse(child, fullPath)
    }
  }

  traverse(tree)
  return result
}

/**
 * Get bounding rect for element
 */
export function getBoundingInfo(element: Element): {
  width: number
  height: number
  x: number
  y: number
} {
  const rect = element.getBoundingClientRect()
  return {
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y
  }
}

/**
 * Check if element is visible
 */
export function isVisible(element: Element): boolean {
  const computed = window.getComputedStyle(element)

  if (computed.display === 'none') return false
  if (computed.visibility === 'hidden') return false
  if (computed.opacity === '0') return false

  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false

  return true
}
