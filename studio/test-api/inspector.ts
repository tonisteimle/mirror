/**
 * Mirror Test Framework - Preview Inspector
 *
 * Inspects DOM elements in the preview to extract
 * styles, attributes, and structure information.
 */

import type { ElementInfo, ComputedStyles, PreviewAPI } from './types'

// =============================================================================
// Style Properties to Extract
// =============================================================================

const STYLE_PROPERTIES: (keyof ComputedStyles)[] = [
  // Layout
  'display',
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'gap',
  // Positioning
  'position',
  'left',
  'top',
  'right',
  'bottom',
  'zIndex',
  // Size
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  // Spacing
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  // Colors
  'backgroundColor',
  'background',
  'backgroundImage',
  'color',
  'borderColor',
  // Border
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderStyle',
  // Typography
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'textAlign',
  'textDecoration',
  'textTransform',
  // Flex
  'flex',
  'flexGrow',
  'flexShrink',
  // Effects
  'opacity',
  'boxShadow',
  'transform',
  'filter',
  'backdropFilter',
  'transition',
  'animation',
  // Text overflow
  'textOverflow',
  'whiteSpace',
  'lineHeight',
  // Visibility
  'visibility',
  'overflow',
  'overflowX',
  'overflowY',
  'cursor',
  'pointerEvents',
]

// =============================================================================
// Inspector Implementation
// =============================================================================

export class PreviewInspector implements PreviewAPI {
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  /**
   * Get all node IDs in the preview
   */
  getNodeIds(): string[] {
    const preview = this.previewContainer
    if (!preview) return []
    const elements = preview.querySelectorAll('[data-mirror-id]')
    return Array.from(elements).map(el => el.getAttribute('data-mirror-id')!)
  }

  /**
   * Find element by node ID
   */
  private findElement(nodeId: string): HTMLElement | null {
    return this.previewContainer?.querySelector(
      `[data-mirror-id="${nodeId}"]`
    ) as HTMLElement | null
  }

  /**
   * Extract computed styles from element
   */
  private extractStyles(element: HTMLElement): ComputedStyles {
    const computed = window.getComputedStyle(element)
    const styles: Partial<ComputedStyles> = {}

    for (const prop of STYLE_PROPERTIES) {
      // Convert camelCase to kebab-case for getPropertyValue
      const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      styles[prop] = computed.getPropertyValue(kebabProp) || computed[prop as any] || ''
    }

    return styles as ComputedStyles
  }

  /**
   * Get direct text content (not from children)
   */
  private getDirectTextContent(element: HTMLElement): string {
    let text = ''
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ''
      }
    }
    return text.trim()
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    if (style.display === 'none') return false
    if (style.visibility === 'hidden') return false
    if (style.opacity === '0') return false
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    return true
  }

  /**
   * Check if element is interactive
   */
  private isInteractive(element: HTMLElement): boolean {
    const interactiveTags = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A']
    if (interactiveTags.includes(element.tagName)) return true
    if (element.getAttribute('role') === 'button') return true
    if (element.getAttribute('tabindex') !== null) return true
    if (element.onclick !== null) return true
    return false
  }

  /**
   * Get parent node ID
   */
  private getParentNodeId(element: HTMLElement): string | null {
    let parent = element.parentElement
    while (parent) {
      const nodeId = parent.getAttribute('data-mirror-id')
      if (nodeId) return nodeId
      parent = parent.parentElement
    }
    return null
  }

  /**
   * Get child node IDs
   */
  private getChildNodeIds(element: HTMLElement): string[] {
    const children: string[] = []
    const walk = (el: Element) => {
      for (const child of Array.from(el.children)) {
        const nodeId = child.getAttribute('data-mirror-id')
        if (nodeId) {
          children.push(nodeId)
        } else {
          // Recurse into non-mirror elements (like wrappers)
          walk(child)
        }
      }
    }
    walk(element)
    return children
  }

  /**
   * Inspect element by node ID
   */
  inspect(nodeId: string): ElementInfo | null {
    const element = this.findElement(nodeId)
    if (!element) return null

    const styles = this.extractStyles(element)
    const rect = element.getBoundingClientRect()

    // Extract attributes
    const attributes: Record<string, string> = {}
    const dataAttributes: Record<string, string> = {}
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name] = attr.value
      } else {
        attributes[attr.name] = attr.value
      }
    }

    return {
      nodeId,
      tagName: element.tagName.toLowerCase(),
      textContent: this.getDirectTextContent(element),
      fullText: element.textContent?.trim() || '',
      styles,
      attributes,
      dataAttributes,
      bounds: rect,
      children: this.getChildNodeIds(element),
      parent: this.getParentNodeId(element),
      visible: this.isElementVisible(element),
      interactive: this.isInteractive(element),
    }
  }

  /**
   * Find elements by CSS selector within preview
   */
  query(selector: string): ElementInfo[] {
    const preview = this.previewContainer
    if (!preview) return []

    const elements = preview.querySelectorAll(selector)
    const results: ElementInfo[] = []

    for (const el of Array.from(elements)) {
      const nodeId = el.getAttribute('data-mirror-id')
      if (nodeId) {
        const info = this.inspect(nodeId)
        if (info) results.push(info)
      }
    }

    return results
  }

  /**
   * Find element by text content
   */
  findByText(text: string, options?: { exact?: boolean }): ElementInfo | null {
    const nodeIds = this.getNodeIds()
    const exact = options?.exact ?? false

    for (const nodeId of nodeIds) {
      const info = this.inspect(nodeId)
      if (!info) continue

      if (exact) {
        if (info.textContent === text || info.fullText === text) {
          return info
        }
      } else {
        if (info.textContent.includes(text) || info.fullText.includes(text)) {
          return info
        }
      }
    }

    return null
  }

  /**
   * Get root element (first mirror element)
   */
  getRoot(): ElementInfo | null {
    const nodeIds = this.getNodeIds()
    if (nodeIds.length === 0) return null

    // Find element with no parent in mirror tree
    for (const nodeId of nodeIds) {
      const info = this.inspect(nodeId)
      if (info && !info.parent) {
        return info
      }
    }

    // Fallback to first element
    return this.inspect(nodeIds[0])
  }

  /**
   * Get children of element
   */
  getChildren(nodeId: string): ElementInfo[] {
    const info = this.inspect(nodeId)
    if (!info) return []

    return info.children
      .map(childId => this.inspect(childId))
      .filter((info): info is ElementInfo => info !== null)
  }

  /**
   * Check if element exists
   */
  exists(nodeId: string): boolean {
    return this.findElement(nodeId) !== null
  }

  /**
   * Wait for element to appear
   */
  async waitFor(nodeId: string, timeout = 2000): Promise<ElementInfo> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const info = this.inspect(nodeId)
      if (info) return info
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    throw new Error(`Element ${nodeId} not found within ${timeout}ms`)
  }

  /**
   * Take screenshot of preview (returns base64 PNG)
   */
  async screenshot(): Promise<string> {
    const preview = this.previewContainer
    if (!preview) throw new Error('Preview container not found')

    // Use html2canvas if available, otherwise return placeholder
    const html2canvas = (window as any).html2canvas
    if (html2canvas) {
      const canvas = await html2canvas(preview)
      return canvas.toDataURL('image/png')
    }

    // Fallback: return empty string (screenshot not available)
    console.warn('html2canvas not available, screenshot skipped')
    return ''
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse color string to normalized format for comparison
 */
export function normalizeColor(color: string): string {
  // Create temporary element to parse color
  const temp = document.createElement('div')
  temp.style.color = color
  document.body.appendChild(temp)
  const computed = window.getComputedStyle(temp).color
  document.body.removeChild(temp)
  return computed
}

/**
 * Parse size string to pixels
 */
export function parseSize(size: string): number {
  if (size.endsWith('px')) {
    return parseFloat(size)
  }
  // For other units, we'd need more complex conversion
  return parseFloat(size) || 0
}

/**
 * Compare two colors (handles different formats)
 */
export function colorsMatch(color1: string, color2: string): boolean {
  return normalizeColor(color1) === normalizeColor(color2)
}

/**
 * Parse rgb/rgba color string to components
 */
function parseRgbColor(color: string): { r: number; g: number; b: number; a: number } | null {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    }
  }
  return null
}

/**
 * Compare two colors with tolerance for minor rendering differences
 * Useful for hover states where browser rounding can cause slight variations
 */
export function colorsMatchWithTolerance(
  color1: string,
  color2: string,
  tolerance: number = 5
): boolean {
  // First try exact match
  const normalized1 = normalizeColor(color1)
  const normalized2 = normalizeColor(color2)
  if (normalized1 === normalized2) return true

  // Parse both colors
  const parsed1 = parseRgbColor(normalized1)
  const parsed2 = parseRgbColor(normalized2)

  if (!parsed1 || !parsed2) return false

  // Check if within tolerance
  return (
    Math.abs(parsed1.r - parsed2.r) <= tolerance &&
    Math.abs(parsed1.g - parsed2.g) <= tolerance &&
    Math.abs(parsed1.b - parsed2.b) <= tolerance &&
    Math.abs(parsed1.a - parsed2.a) <= 0.1
  )
}
