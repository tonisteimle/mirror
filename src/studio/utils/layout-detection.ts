/**
 * Layout detection utilities
 *
 * Shared utilities for detecting layout direction of elements.
 * Used by DropZoneCalculator, SmartSizingService, drop strategies, and other studio components.
 *
 * Features:
 * - Layout type detection (flex, absolute, grid, block)
 * - Layout direction (horizontal/vertical)
 * - RTL support
 * - CSS transform scale detection
 */

/**
 * Layout types supported by the system
 */
export type LayoutType = 'flex' | 'absolute' | 'grid' | 'block'

/**
 * Comprehensive layout information for an element
 */
export interface LayoutInfo {
  /** The type of layout */
  type: LayoutType
  /** Primary layout direction */
  direction: 'horizontal' | 'vertical'
  /** Whether RTL (right-to-left) direction is active */
  isRTL: boolean
  /** CSS transform scale factor (1 = no scaling) */
  scale: number
}

/**
 * Detect comprehensive layout information for an element
 *
 * @param element - The element to analyze
 * @returns LayoutInfo with type, direction, RTL status, and scale
 */
export function detectLayout(element: HTMLElement | Element | null): LayoutInfo {
  if (!element) {
    return { type: 'block', direction: 'vertical', isRTL: false, scale: 1 }
  }

  const htmlElement = element as HTMLElement
  const style = window.getComputedStyle(htmlElement)

  // RTL Detection
  const isRTL = style.direction === 'rtl'

  // Scale Detection (CSS transform: scale() or matrix())
  let scale = 1
  const transform = style.transform
  if (transform && transform !== 'none') {
    // Try to extract scale from matrix(a, b, c, d, tx, ty)
    // scale is the 'a' value (first number)
    const matrixMatch = transform.match(/matrix\(([^,]+)/)
    if (matrixMatch) {
      const scaleValue = parseFloat(matrixMatch[1])
      if (!isNaN(scaleValue) && scaleValue > 0) {
        scale = scaleValue
      }
    } else {
      // Try to extract from scale() shorthand: scale(2) or scale(2, 2)
      const scaleMatch = transform.match(/scale\(([^,)]+)/)
      if (scaleMatch) {
        const scaleValue = parseFloat(scaleMatch[1])
        if (!isNaN(scaleValue) && scaleValue > 0) {
          scale = scaleValue
        }
      }
    }
  }

  // Layout Type Detection

  // Check for explicit data-layout attribute first (highest priority)
  // This is set by the IR transformation based on explicit layout properties
  const layout = htmlElement.dataset?.layout
  if (layout === 'absolute') {
    return { type: 'absolute', direction: 'vertical', isRTL, scale }
  }
  if (layout === 'grid') {
    // For grid, still need to check actual CSS for direction
    const gridTemplateColumns = style.gridTemplateColumns
    const isHorizontal = gridTemplateColumns !== 'none' && gridTemplateColumns.split(' ').length > 1
    return { type: 'grid', direction: isHorizontal ? 'horizontal' : 'vertical', isRTL, scale }
  }
  if (layout === 'flex') {
    const flexDirection = style.flexDirection
    const isHorizontal = flexDirection === 'row' || flexDirection === 'row-reverse'
    return { type: 'flex', direction: isHorizontal ? 'horizontal' : 'vertical', isRTL, scale }
  }

  // Check for absolute layout (Mirror-specific legacy detection)
  const position = style.position
  if (position === 'relative') {
    // Legacy data-layout values
    if (layout === 'abs' || layout === 'stacked' || layout === 'pos' || layout === 'positioned' || layout === 'relative') {
      return { type: 'absolute', direction: 'vertical', isRTL, scale }
    }
    // Legacy data-mirror-abs attribute
    if (htmlElement.dataset?.mirrorAbsolute === 'true' || htmlElement.dataset?.mirrorAbs === 'true') {
      return { type: 'absolute', direction: 'vertical', isRTL, scale }
    }
    // Check for ZStack-like components
    const name = htmlElement.dataset?.mirrorName
    if (name === 'ZStack' || name === 'Canvas' || name === 'Artboard') {
      return { type: 'absolute', direction: 'vertical', isRTL, scale }
    }
  }

  const display = style.display

  // Grid detection
  if (display === 'grid' || display === 'inline-grid') {
    const gridTemplateColumns = style.gridTemplateColumns
    const isHorizontal = gridTemplateColumns !== 'none' && gridTemplateColumns.split(' ').length > 1
    return { type: 'grid', direction: isHorizontal ? 'horizontal' : 'vertical', isRTL, scale }
  }

  // Flex detection
  if (display === 'flex' || display === 'inline-flex') {
    const flexDirection = style.flexDirection
    const isHorizontal = flexDirection === 'row' || flexDirection === 'row-reverse'
    return { type: 'flex', direction: isHorizontal ? 'horizontal' : 'vertical', isRTL, scale }
  }

  // Mirror-specific layout hints
  if (layout === 'hor' || layout === 'horizontal') {
    return { type: 'flex', direction: 'horizontal', isRTL, scale }
  }
  if (layout === 'ver' || layout === 'vertical') {
    return { type: 'flex', direction: 'vertical', isRTL, scale }
  }

  // Default: block layout
  return { type: 'block', direction: 'vertical', isRTL, scale }
}

/**
 * Check if an element has horizontal layout (flex-direction: row)
 *
 * Detects horizontal layout based on:
 * - Flexbox with row/row-reverse direction
 * - Grid with multiple columns
 * - Mirror-specific data-layout attribute
 */
export function isHorizontalLayout(element: HTMLElement | Element | null): boolean {
  return detectLayout(element).direction === 'horizontal'
}

/**
 * Get the layout direction of an element
 */
export function getLayoutDirection(element: HTMLElement | Element | null): 'horizontal' | 'vertical' {
  return detectLayout(element).direction
}

/**
 * Check if an element is an absolute layout container
 */
export function isAbsoluteLayoutContainer(element: HTMLElement | Element | null): boolean {
  return detectLayout(element).type === 'absolute'
}

/**
 * Transform client coordinates to container-relative coordinates
 * accounting for CSS transform scale
 *
 * @param clientX - Client X coordinate
 * @param clientY - Client Y coordinate
 * @param container - The container element
 * @returns Transformed coordinates relative to container
 */
export function clientToContainer(
  clientX: number,
  clientY: number,
  container: HTMLElement
): { x: number; y: number } {
  const { scale } = detectLayout(container)
  const rect = container.getBoundingClientRect()
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  }
}
