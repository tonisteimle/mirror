/**
 * Visual Tools for Mirror Agent
 *
 * Tools for visual analysis of the preview.
 */

import type { Tool, ToolResult } from '../types'

// ============================================
// TYPES
// ============================================

export interface VisualToolContext {
  getCode: () => string
  getTokens: () => Record<string, string>
  getPreviewElement: () => HTMLElement | null
  getElementByNodeId: (nodeId: string) => HTMLElement | null
  highlightElement: (nodeId: string, color?: string) => void
  clearHighlights: () => void
}

export interface ElementBounds {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  overflow?: 'hidden' | 'visible' | 'scroll'
}

// ============================================
// SCREENSHOT TOOL
// ============================================

export const screenshotTool: Tool = {
  name: 'screenshot_preview',
  description: `Takes a screenshot of the preview for visual analysis.

Can screenshot the full preview or a specific element.
Returns base64 image data that can be analyzed.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector to screenshot, or omit for full preview',
      required: false
    }
  },
  execute: async ({ selector }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    try {
      let targetElement = preview

      if (selector) {
        const element = findElementInPreview(preview, selector)
        if (!element) {
          return { success: false, error: `Element not found in preview: ${selector}` }
        }
        targetElement = element
      }

      // Use html2canvas or similar if available, otherwise return bounds info
      const bounds = targetElement.getBoundingClientRect()
      const previewBounds = preview.getBoundingClientRect()

      // Calculate relative position
      const relativeBounds = {
        x: bounds.x - previewBounds.x,
        y: bounds.y - previewBounds.y,
        width: bounds.width,
        height: bounds.height
      }

      // For now, return element info instead of actual screenshot
      // Real implementation would use html2canvas or similar
      return {
        success: true,
        data: {
          type: 'bounds',
          selector: selector || 'preview',
          bounds: relativeBounds,
          computedStyles: getRelevantStyles(targetElement),
          childCount: targetElement.children.length,
          instruction: 'Use these bounds and styles to analyze the layout'
        }
      }
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// ============================================
// MEASURE ELEMENT TOOL
// ============================================

export const measureElementTool: Tool = {
  name: 'measure_element',
  description: `Measures an element's dimensions and position in the preview.

Returns width, height, position, and visibility information.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector to measure',
      required: true
    }
  },
  execute: async ({ selector }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const element = findElementInPreview(preview, selector)
    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const bounds = element.getBoundingClientRect()
    const previewBounds = preview.getBoundingClientRect()
    const styles = window.getComputedStyle(element)

    // Check if visible
    const visible = bounds.width > 0 &&
      bounds.height > 0 &&
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      parseFloat(styles.opacity) > 0

    // Check overflow
    const isInViewport = bounds.top < previewBounds.bottom &&
      bounds.bottom > previewBounds.top &&
      bounds.left < previewBounds.right &&
      bounds.right > previewBounds.left

    return {
      success: true,
      data: {
        selector,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        x: Math.round(bounds.x - previewBounds.x),
        y: Math.round(bounds.y - previewBounds.y),
        visible,
        inViewport: isInViewport,
        overflow: styles.overflow,
        display: styles.display,
        position: styles.position
      }
    }
  }
}

// ============================================
// CHECK SPACING TOOL
// ============================================

export const checkSpacingTool: Tool = {
  name: 'check_spacing',
  description: `Checks spacing consistency between child elements.

Analyzes gaps between children and reports inconsistencies.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Parent element selector (or omit for root)',
      required: false
    }
  },
  execute: async ({ selector }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const parent = selector
      ? findElementInPreview(preview, selector)
      : preview.firstElementChild

    if (!parent) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const children = Array.from(parent.children) as HTMLElement[]
    if (children.length < 2) {
      return {
        success: true,
        data: { message: 'Not enough children to check spacing', childCount: children.length }
      }
    }

    // Determine layout direction
    const parentStyles = window.getComputedStyle(parent)
    const isHorizontal = parentStyles.flexDirection === 'row' ||
      parentStyles.display === 'inline-flex' ||
      (parentStyles.display === 'grid' && parentStyles.gridAutoFlow !== 'row')

    const gaps: { between: [number, number]; gap: number }[] = []

    for (let i = 1; i < children.length; i++) {
      const prevBounds = children[i - 1].getBoundingClientRect()
      const currBounds = children[i].getBoundingClientRect()

      const gap = isHorizontal
        ? currBounds.left - prevBounds.right
        : currBounds.top - prevBounds.bottom

      gaps.push({
        between: [i - 1, i],
        gap: Math.round(gap)
      })
    }

    // Find inconsistencies
    const uniqueGaps = [...new Set(gaps.map(g => g.gap))]
    const inconsistent = uniqueGaps.length > 1

    // Find most common gap
    const gapCounts: Record<number, number> = {}
    for (const { gap } of gaps) {
      gapCounts[gap] = (gapCounts[gap] || 0) + 1
    }
    const suggestedGap = Object.entries(gapCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      success: true,
      data: {
        direction: isHorizontal ? 'horizontal' : 'vertical',
        childCount: children.length,
        gaps,
        uniqueGaps,
        inconsistent,
        suggestedGap: suggestedGap ? parseInt(suggestedGap) : null,
        suggestion: inconsistent
          ? `Spacing is inconsistent (${uniqueGaps.join(', ')}px). Consider using gap ${suggestedGap}px.`
          : `Spacing is consistent at ${uniqueGaps[0]}px.`
      }
    }
  }
}

// ============================================
// CHECK ALIGNMENT TOOL
// ============================================

export const checkAlignmentTool: Tool = {
  name: 'check_alignment',
  description: `Checks alignment of child elements.

Detects whether elements are aligned (left, center, right, top, bottom).`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Parent element selector',
      required: false
    }
  },
  execute: async ({ selector }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const parent = selector
      ? findElementInPreview(preview, selector)
      : preview.firstElementChild

    if (!parent) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const parentBounds = parent.getBoundingClientRect()
    const children = Array.from(parent.children) as HTMLElement[]

    if (children.length === 0) {
      return {
        success: true,
        data: { message: 'No children to check alignment' }
      }
    }

    const childBounds = children.map(c => c.getBoundingClientRect())

    // Check horizontal alignment
    const lefts = childBounds.map(b => Math.round(b.left - parentBounds.left))
    const rights = childBounds.map(b => Math.round(parentBounds.right - b.right))
    const centers = childBounds.map(b => {
      const childCenter = b.left + b.width / 2
      const parentCenter = parentBounds.left + parentBounds.width / 2
      return Math.round(childCenter - parentCenter)
    })

    // Check vertical alignment
    const tops = childBounds.map(b => Math.round(b.top - parentBounds.top))
    const bottoms = childBounds.map(b => Math.round(parentBounds.bottom - b.bottom))
    const vCenters = childBounds.map(b => {
      const childCenter = b.top + b.height / 2
      const parentCenter = parentBounds.top + parentBounds.height / 2
      return Math.round(childCenter - parentCenter)
    })

    // Determine alignment
    const isAllSame = (arr: number[], tolerance = 2) => {
      const first = arr[0]
      return arr.every(v => Math.abs(v - first) <= tolerance)
    }

    const horizontalAlignment = isAllSame(lefts) ? 'left' :
      isAllSame(rights) ? 'right' :
        isAllSame(centers) ? 'center' : 'mixed'

    const verticalAlignment = isAllSame(tops) ? 'top' :
      isAllSame(bottoms) ? 'bottom' :
        isAllSame(vCenters) ? 'center' : 'mixed'

    return {
      success: true,
      data: {
        childCount: children.length,
        horizontal: {
          alignment: horizontalAlignment,
          lefts,
          rights,
          centers
        },
        vertical: {
          alignment: verticalAlignment,
          tops,
          bottoms,
          centers: vCenters
        },
        suggestion: horizontalAlignment === 'mixed' || verticalAlignment === 'mixed'
          ? 'Elements are not consistently aligned. Consider using center or explicit alignment.'
          : `Elements are aligned: horizontal=${horizontalAlignment}, vertical=${verticalAlignment}`
      }
    }
  }
}

// ============================================
// GET COMPUTED STYLES TOOL
// ============================================

export const getComputedStylesTool: Tool = {
  name: 'get_computed_styles',
  description: `Gets the computed CSS styles of an element in the preview.

Useful for debugging visual issues.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector',
      required: true
    },
    properties: {
      type: 'array',
      description: 'Specific properties to get (or omit for common ones)',
      required: false
    }
  },
  execute: async ({ selector, properties }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const element = findElementInPreview(preview, selector)
    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const styles = window.getComputedStyle(element)

    const defaultProps = [
      'display', 'flexDirection', 'alignItems', 'justifyContent',
      'gap', 'padding', 'margin', 'width', 'height',
      'backgroundColor', 'color', 'border', 'borderRadius',
      'fontSize', 'fontWeight', 'lineHeight',
      'position', 'top', 'right', 'bottom', 'left',
      'overflow', 'opacity', 'visibility'
    ]

    const propsToGet = properties || defaultProps
    const result: Record<string, string> = {}

    for (const prop of propsToGet) {
      result[prop] = styles.getPropertyValue(prop) || styles[prop as any]
    }

    return {
      success: true,
      data: {
        selector,
        styles: result
      }
    }
  }
}

// ============================================
// FIND VISUAL ISSUES TOOL
// ============================================

export const findVisualIssuesTool: Tool = {
  name: 'find_visual_issues',
  description: `Scans the preview for common visual issues.

Checks for:
- Overlapping elements
- Text overflow
- Elements outside viewport
- Inconsistent sizing`,
  parameters: {},
  execute: async (_, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext
    const preview = visualCtx.getPreviewElement?.()

    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const issues: any[] = []
    const previewBounds = preview.getBoundingClientRect()

    // Get all elements
    const elements = preview.querySelectorAll('*')
    const elementBounds: { el: Element; bounds: DOMRect }[] = []

    elements.forEach(el => {
      const bounds = el.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0) {
        elementBounds.push({ el, bounds })
      }
    })

    // Check for elements outside viewport
    for (const { el, bounds } of elementBounds) {
      if (bounds.right < previewBounds.left ||
        bounds.left > previewBounds.right ||
        bounds.bottom < previewBounds.top ||
        bounds.top > previewBounds.bottom) {
        issues.push({
          type: 'outside_viewport',
          element: getElementIdentifier(el),
          message: 'Element is outside the visible area'
        })
      }
    }

    // Check for text overflow
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
          const styles = window.getComputedStyle(el)
          if (styles.overflow !== 'scroll' && styles.overflow !== 'auto') {
            issues.push({
              type: 'text_overflow',
              element: getElementIdentifier(el),
              message: 'Content overflows the element',
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth
            })
          }
        }
      }
    })

    // Check for overlapping siblings (simple check)
    for (let i = 0; i < elementBounds.length; i++) {
      for (let j = i + 1; j < elementBounds.length; j++) {
        const a = elementBounds[i]
        const b = elementBounds[j]

        // Skip if one is a child of the other
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue

        // Check for overlap
        if (!(a.bounds.right < b.bounds.left ||
          a.bounds.left > b.bounds.right ||
          a.bounds.bottom < b.bounds.top ||
          a.bounds.top > b.bounds.bottom)) {

          // Check if they're siblings
          if (a.el.parentElement === b.el.parentElement) {
            issues.push({
              type: 'overlap',
              elements: [getElementIdentifier(a.el), getElementIdentifier(b.el)],
              message: 'Sibling elements are overlapping'
            })
          }
        }
      }
    }

    return {
      success: true,
      data: {
        issueCount: issues.length,
        issues: issues.slice(0, 10),
        summary: issues.length === 0
          ? 'No visual issues detected'
          : `Found ${issues.length} potential issue(s)`
      }
    }
  }
}

// ============================================
// HIGHLIGHT ELEMENT TOOL
// ============================================

export const highlightElementTool: Tool = {
  name: 'highlight_element',
  description: `Highlights an element in the preview for visual reference.

Useful when discussing specific elements.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector to highlight',
      required: true
    },
    color: {
      type: 'string',
      description: 'Highlight color (default: blue)',
      required: false
    },
    duration: {
      type: 'number',
      description: 'Duration in ms (default: 2000, 0 for permanent)',
      required: false
    }
  },
  execute: async ({ selector, color = '#5BA8F5', duration = 2000 }, ctx: any): Promise<ToolResult> => {
    const visualCtx = ctx as VisualToolContext

    if (visualCtx.highlightElement) {
      visualCtx.highlightElement(selector, color)

      if (duration > 0) {
        setTimeout(() => {
          visualCtx.clearHighlights?.()
        }, duration)
      }

      return {
        success: true,
        data: {
          highlighted: selector,
          color,
          duration
        }
      }
    }

    // Fallback: try to highlight directly
    const preview = visualCtx.getPreviewElement?.()
    if (!preview) {
      return { success: false, error: 'Preview not available' }
    }

    const element = findElementInPreview(preview, selector)
    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Add highlight outline
    const originalOutline = element.style.outline
    const originalOutlineOffset = element.style.outlineOffset
    element.style.outline = `2px solid ${color}`
    element.style.outlineOffset = '2px'

    if (duration > 0) {
      setTimeout(() => {
        element.style.outline = originalOutline
        element.style.outlineOffset = originalOutlineOffset
      }, duration)
    }

    return {
      success: true,
      data: {
        highlighted: selector,
        color,
        duration
      }
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function findElementInPreview(preview: HTMLElement, selector: string): HTMLElement | null {
  // @N - Line number (via data-line attribute)
  if (selector.startsWith('@')) {
    const lineNum = selector.slice(1)
    return preview.querySelector(`[data-line="${lineNum}"]`)
  }

  // #id - Named element
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return preview.querySelector(`[data-name="${id}"]`) ||
      preview.querySelector(`#${id}`)
  }

  // Type selector (first matching)
  if (/^[A-Z]/.test(selector)) {
    const [type, indexStr] = selector.split(':')
    const index = indexStr ? parseInt(indexStr) - 1 : 0
    const elements = preview.querySelectorAll(`[data-component="${type}"]`)
    return elements[index] as HTMLElement || null
  }

  // CSS selector fallback
  return preview.querySelector(selector)
}

function getRelevantStyles(element: HTMLElement): Record<string, string> {
  const styles = window.getComputedStyle(element)
  return {
    display: styles.display,
    flexDirection: styles.flexDirection,
    alignItems: styles.alignItems,
    justifyContent: styles.justifyContent,
    gap: styles.gap,
    padding: styles.padding,
    backgroundColor: styles.backgroundColor,
    color: styles.color,
    borderRadius: styles.borderRadius,
    width: styles.width,
    height: styles.height
  }
}

function getElementIdentifier(el: Element): string {
  // Try data attributes first
  const dataComponent = el.getAttribute('data-component')
  const dataLine = el.getAttribute('data-line')
  const dataName = el.getAttribute('data-name')

  if (dataName) return `#${dataName}`
  if (dataComponent && dataLine) return `${dataComponent}@${dataLine}`
  if (dataComponent) return dataComponent

  // Fallback to tag and class
  const tag = el.tagName.toLowerCase()
  const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
  return `${tag}${classes}`.slice(0, 50)
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const visualTools: Tool[] = [
  screenshotTool,
  measureElementTool,
  checkSpacingTool,
  checkAlignmentTool,
  getComputedStylesTool,
  findVisualIssuesTool,
  highlightElementTool
]
