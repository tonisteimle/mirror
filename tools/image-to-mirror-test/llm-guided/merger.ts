/**
 * Merger: Combines LLM semantic analysis with Pixel precise measurements
 */

import type {
  SemanticAnalysis,
  SemanticElement,
  PixelElement,
  MergedElement,
  MergedAnalysis,
  GAP_SIZE_MAP,
} from './schema'

// =============================================================================
// Merger
// =============================================================================

export interface MergerOptions {
  verbose?: boolean
}

/**
 * Merge semantic analysis from LLM with pixel measurements
 */
export function merge(
  semantic: SemanticAnalysis,
  pixels: PixelElement,
  options: MergerOptions = {}
): MergedAnalysis {
  const { verbose = false } = options

  if (verbose) {
    console.log('[Merger] Combining semantic and pixel analysis')
    console.log(`  Semantic: ${semantic.children.length} children`)
    console.log(`  Pixels: bounds ${pixels.bounds.width}x${pixels.bounds.height}`)
  }

  // Merge root element
  const root = mergeElement(
    {
      type: 'Container',
      layout: semantic.layout,
      gap: semantic.gap,
      children: semantic.children,
    },
    pixels,
    options
  )

  return {
    description: semantic.description,
    root,
  }
}

/**
 * Merge a single element
 */
function mergeElement(
  semantic: SemanticElement,
  pixel: PixelElement,
  options: MergerOptions
): MergedElement {
  const { verbose = false } = options

  // Start with semantic info
  const merged: MergedElement = {
    type: semantic.type,
    role: semantic.role,
    text: semantic.text || pixel.text,
    placeholder: semantic.placeholder,
    iconName: semantic.iconName || pixel.iconName,
    inputType: semantic.inputType,
    state: semantic.state,

    // Pixel precise values
    bounds: pixel.bounds,
    backgroundColor: pixel.backgroundColor,
    color: pixel.color,
    borderColor: pixel.borderColor,
    borderWidth: pixel.borderWidth,
    borderRadius: pixel.borderRadius,
    padding: pixel.padding,
    fontSize: pixel.fontSize,
    fontWeight: pixel.fontWeight,

    // Layout from semantic
    layout: semantic.layout,
  }

  // Calculate gap from pixel children if available
  if (pixel.children && pixel.children.length >= 2) {
    merged.gap = calculateGap(pixel.children, semantic.layout || 'vertical')
  }

  // Merge children
  if (semantic.children && semantic.children.length > 0) {
    merged.children = mergeChildren(semantic.children, pixel.children || [], options)
  }

  if (verbose) {
    console.log(`  Merged: ${semantic.type} -> bounds ${pixel.bounds.width}x${pixel.bounds.height}`)
  }

  return merged
}

/**
 * Merge children by matching semantic elements to pixel elements
 */
function mergeChildren(
  semanticChildren: SemanticElement[],
  pixelChildren: PixelElement[],
  options: MergerOptions
): MergedElement[] {
  const merged: MergedElement[] = []

  // Simple case: same number of children - match by order
  if (semanticChildren.length === pixelChildren.length) {
    for (let i = 0; i < semanticChildren.length; i++) {
      merged.push(mergeElement(semanticChildren[i], pixelChildren[i], options))
    }
    return merged
  }

  // Complex case: try to match by position or text
  const usedPixels = new Set<number>()

  for (const semantic of semanticChildren) {
    // Try to find matching pixel element
    let bestMatch = -1
    let bestScore = -1

    for (let i = 0; i < pixelChildren.length; i++) {
      if (usedPixels.has(i)) continue

      const score = matchScore(semantic, pixelChildren[i])
      if (score > bestScore) {
        bestScore = score
        bestMatch = i
      }
    }

    if (bestMatch >= 0) {
      usedPixels.add(bestMatch)
      merged.push(mergeElement(semantic, pixelChildren[bestMatch], options))
    } else {
      // No pixel match - create element from semantic only
      merged.push({
        type: semantic.type,
        role: semantic.role,
        text: semantic.text,
        placeholder: semantic.placeholder,
        iconName: semantic.iconName,
        inputType: semantic.inputType,
        layout: semantic.layout,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        children: semantic.children?.map(c => ({
          type: c.type,
          role: c.role,
          text: c.text,
          placeholder: c.placeholder,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        })),
      })
    }
  }

  return merged
}

/**
 * Calculate match score between semantic and pixel element
 */
function matchScore(semantic: SemanticElement, pixel: PixelElement): number {
  let score = 0

  // Text match is strong signal
  if (semantic.text && pixel.text) {
    if (semantic.text === pixel.text) {
      score += 100
    } else if (pixel.text.includes(semantic.text) || semantic.text.includes(pixel.text)) {
      score += 50
    }
  }

  // Icon match
  if (semantic.iconName && pixel.iconName && semantic.iconName === pixel.iconName) {
    score += 80
  }

  // Type hints
  if (semantic.type === 'Button' && pixel.backgroundColor && pixel.borderRadius) {
    score += 20
  }
  if (semantic.type === 'Input' && pixel.borderWidth) {
    score += 20
  }
  if (semantic.type === 'Text' && pixel.text) {
    score += 20
  }

  return score
}

/**
 * Calculate gap between children
 */
function calculateGap(children: PixelElement[], direction: string): number {
  if (children.length < 2) return 0

  const gaps: number[] = []

  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1]
    const curr = children[i]

    if (direction === 'horizontal') {
      // Gap is space between right edge of prev and left edge of curr
      const gap = curr.bounds.x - (prev.bounds.x + prev.bounds.width)
      if (gap > 0) gaps.push(gap)
    } else {
      // Gap is space between bottom edge of prev and top edge of curr
      const gap = curr.bounds.y - (prev.bounds.y + prev.bounds.height)
      if (gap > 0) gaps.push(gap)
    }
  }

  if (gaps.length === 0) return 0

  // Return most common gap (mode) or average
  const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
  return avgGap
}

// =============================================================================
// Code Generator
// =============================================================================

/**
 * Generate Mirror code from merged analysis
 */
export function generateMirrorCode(merged: MergedAnalysis): string {
  const lines: string[] = []
  generateElementCode(merged.root, lines, 0)
  return lines.join('\n')
}

function generateElementCode(element: MergedElement, lines: string[], indent: number): void {
  const prefix = '  '.repeat(indent)
  const props: string[] = []

  // Determine primitive
  let primitive = 'Frame'
  switch (element.type) {
    case 'Button':
      primitive = 'Button'
      if (element.text) props.push(`"${element.text}"`)
      break
    case 'Text':
      primitive = 'Text'
      if (element.text) props.push(`"${element.text}"`)
      break
    case 'Input':
      primitive = 'Input'
      if (element.placeholder) props.push(`placeholder "${element.placeholder}"`)
      if (element.inputType && element.inputType !== 'text') props.push(`type ${element.inputType}`)
      break
    case 'Icon':
      primitive = 'Icon'
      if (element.iconName) props.push(`"${element.iconName}"`)
      break
    case 'Card':
    case 'FormField':
    case 'Container':
      primitive = 'Frame'
      break
    default:
      primitive = 'Frame'
  }

  // Layout - check both semantic and detected
  if (element.layout === 'horizontal') props.push('hor')

  // Gap - use detected gap or estimate from semantic
  if (element.gap && element.gap > 0) {
    props.push(`gap ${element.gap}`)
  } else if (element.children && element.children.length > 1) {
    // Default gap if we have children but no detected gap
    const defaultGap = element.layout === 'horizontal' ? 12 : 8
    props.push(`gap ${defaultGap}`)
  }

  // Size (only if meaningful)
  if (element.bounds.width > 0 && element.type !== 'Text' && element.type !== 'Button') {
    // Only add explicit size for containers
    if (!element.children || element.children.length === 0) {
      props.push(`w ${element.bounds.width}`)
      props.push(`h ${element.bounds.height}`)
    }
  }

  // Background
  if (
    element.backgroundColor &&
    element.backgroundColor !== '#ffffff' &&
    element.backgroundColor !== '#FFFFFF'
  ) {
    props.push(`bg ${element.backgroundColor}`)
  }

  // Text color
  if (element.color) {
    if (element.color === '#ffffff' || element.color === '#FFFFFF') {
      props.push('col white')
    } else if (element.color !== '#000000') {
      props.push(`col ${element.color}`)
    }
  }

  // Border
  if (element.borderWidth && element.borderWidth > 0) {
    props.push(`bor ${element.borderWidth}`)
    if (element.borderColor) props.push(`boc ${element.borderColor}`)
  }

  // Radius
  if (element.borderRadius && element.borderRadius > 0) {
    props.push(`rad ${element.borderRadius}`)
  }

  // Padding
  if (element.padding) {
    const { top, right, bottom, left } = element.padding
    if (top === right && right === bottom && bottom === left) {
      if (top > 0) props.push(`pad ${top}`)
    } else if (top === bottom && left === right) {
      props.push(`pad ${top} ${right}`)
    } else {
      props.push(`pad ${top} ${right} ${bottom} ${left}`)
    }
  }

  // Font
  if (element.fontSize && element.type === 'Text') {
    props.push(`fs ${element.fontSize}`)
  }
  if (element.fontWeight === 'bold' || element.fontWeight === 700) {
    props.push('weight bold')
  }

  // Build line
  const line =
    props.length > 0 ? `${prefix}${primitive} ${props.join(', ')}` : `${prefix}${primitive}`
  lines.push(line)

  // Children
  if (element.children) {
    for (const child of element.children) {
      generateElementCode(child, lines, indent + 1)
    }
  }
}
