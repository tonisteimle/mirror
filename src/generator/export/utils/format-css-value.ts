/**
 * Format a value for CSS output
 *
 * @example
 * formatCssValue(16) // '16px'
 * formatCssValue('50%') // '50%'
 * formatCssValue('#FFF') // '#FFF'
 * formatCssValue(1.5) // '1.5' (for line-height etc.)
 */
export function formatCssValue(value: unknown, unit: 'px' | 'none' = 'px'): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    if (unit === 'none') {
      return String(value)
    }
    return `${value}px`
  }

  return String(value)
}

/**
 * Check if a value already has a unit (%, px, em, etc.)
 */
export function hasUnit(value: string): boolean {
  return /(%|px|em|rem|vh|vw|vmin|vmax)$/.test(value)
}
