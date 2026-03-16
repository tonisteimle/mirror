/**
 * Layout detection utilities
 *
 * Shared utilities for detecting layout direction of elements.
 * Used by DropZoneCalculator, SmartSizingService, and other studio components.
 */

/**
 * Check if an element has horizontal layout (flex-direction: row)
 *
 * Detects horizontal layout based on:
 * - Flexbox with row/row-reverse direction
 * - Grid with multiple columns
 * - Mirror-specific data-layout attribute
 */
export function isHorizontalLayout(element: HTMLElement | Element | null): boolean {
  if (!element) return false

  const htmlElement = element as HTMLElement
  const computedStyle = window.getComputedStyle(htmlElement)
  const display = computedStyle.display
  const flexDirection = computedStyle.flexDirection

  // Check for flex row layout
  if (display === 'flex' || display === 'inline-flex') {
    return flexDirection === 'row' || flexDirection === 'row-reverse'
  }

  // Check for grid with multiple columns
  if (display === 'grid' || display === 'inline-grid') {
    const gridTemplateColumns = computedStyle.gridTemplateColumns
    // Multiple columns = horizontal-ish layout
    return gridTemplateColumns !== 'none' && gridTemplateColumns.split(' ').length > 1
  }

  // Check for Mirror-specific data-layout attribute
  const layout = htmlElement.dataset?.layout
  if (layout === 'horizontal' || layout === 'hor') {
    return true
  }

  return false
}

/**
 * Get the layout direction of an element
 */
export function getLayoutDirection(element: HTMLElement | Element | null): 'horizontal' | 'vertical' {
  return isHorizontalLayout(element) ? 'horizontal' : 'vertical'
}
