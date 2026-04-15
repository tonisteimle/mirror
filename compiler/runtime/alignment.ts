/**
 * Alignment Helpers Module
 *
 * CSS flexbox alignment utilities for Mirror elements.
 */

// ============================================
// ALIGNMENT MAPS
// ============================================

const ALIGN_MAP: Record<string, string> = {
  left: 'flex-start',
  right: 'flex-end',
  center: 'center',
  top: 'flex-start',
  bottom: 'flex-end',
}

const REVERSE_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'left',
  'flex-end': 'right',
  center: 'center',
}

const VERT_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'top',
  'flex-end': 'bottom',
  center: 'center',
}

// ============================================
// HELPERS
// ============================================

/**
 * Check if element is in row direction
 */
function isRowDirection(el: HTMLElement): boolean {
  return el.style.flexDirection === 'row'
}

/**
 * Convert alignment value to CSS
 */
function toCssValue(value: string): string {
  return ALIGN_MAP[value] || value
}

// ============================================
// HORIZONTAL ALIGNMENT
// ============================================

/**
 * Apply horizontal alignment
 */
function applyHorizontalAlign(el: HTMLElement, cssVal: string): void {
  if (isRowDirection(el)) {
    el.style.justifyContent = cssVal
  } else {
    el.style.alignItems = cssVal
  }
}

/**
 * Get horizontal alignment value
 */
function getHorizontalAlign(el: HTMLElement): string {
  const val = isRowDirection(el) ? el.style.justifyContent : el.style.alignItems
  return REVERSE_ALIGN_MAP[val] || val
}

// ============================================
// VERTICAL ALIGNMENT
// ============================================

/**
 * Apply vertical alignment
 */
function applyVerticalAlign(el: HTMLElement, cssVal: string): void {
  if (isRowDirection(el)) {
    el.style.alignItems = cssVal
  } else {
    el.style.justifyContent = cssVal
  }
}

/**
 * Get vertical alignment value
 */
function getVerticalAlign(el: HTMLElement): string {
  const val = isRowDirection(el) ? el.style.alignItems : el.style.justifyContent
  return VERT_ALIGN_MAP[val] || val
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Convert alignment value to CSS and apply to element
 */
export function alignToCSS(el: HTMLElement, prop: string, value: string): void {
  const cssVal = toCssValue(value)

  if (prop === 'align' || prop === 'hor-align') {
    applyHorizontalAlign(el, cssVal)
  } else if (prop === 'ver-align') {
    applyVerticalAlign(el, cssVal)
  }
}

/**
 * Get alignment value from element
 */
export function getAlign(el: HTMLElement, prop: string): string {
  if (prop === 'align' || prop === 'hor-align') {
    return getHorizontalAlign(el)
  } else if (prop === 'ver-align') {
    return getVerticalAlign(el)
  }
  return ''
}
