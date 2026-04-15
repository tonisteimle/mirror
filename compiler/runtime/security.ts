/**
 * CSS Security Module
 *
 * Whitelist-based CSS property validation and value sanitization.
 * Prevents CSS injection attacks (XSS, external resource loading).
 */

// ============================================
// ALLOWED PROPERTIES WHITELIST
// ============================================

const ALLOWED_CSS_PROPERTIES = new Set([
  // Layout
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'float',
  'clear',
  'overflow',
  'overflow-x',
  'overflow-y',
  'clip',
  'visibility',
  'opacity',
  // Flexbox
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'order',
  'gap',
  'row-gap',
  'column-gap',
  // Grid
  'grid',
  'grid-template',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-column',
  'grid-row',
  'grid-area',
  'grid-auto-columns',
  'grid-auto-rows',
  'grid-auto-flow',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
  'place-content',
  'place-items',
  'place-self',
  // Box model
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'box-sizing',
  'aspect-ratio',
  // Typography
  'font',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'text-indent',
  'text-overflow',
  'white-space',
  'word-break',
  'word-wrap',
  'overflow-wrap',
  // Colors & backgrounds
  'color',
  'background',
  'background-color',
  'background-image',
  'background-position',
  'background-size',
  'background-repeat',
  'background-attachment',
  'background-clip',
  'background-origin',
  // Borders
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-collapse',
  'border-spacing',
  // Effects
  'box-shadow',
  'text-shadow',
  'filter',
  'backdrop-filter',
  'mix-blend-mode',
  'background-blend-mode',
  // Transforms
  'transform',
  'transform-origin',
  'transform-style',
  'perspective',
  'perspective-origin',
  // Transitions & animations
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'animation',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-play-state',
  // Others
  'cursor',
  'pointer-events',
  'user-select',
  'resize',
  'outline',
  'outline-width',
  'outline-style',
  'outline-color',
  'outline-offset',
  'list-style',
  'list-style-type',
  'list-style-position',
  'list-style-image',
  'table-layout',
  'vertical-align',
  'object-fit',
  'object-position',
  'scroll-behavior',
  'scroll-snap-type',
  'scroll-snap-align',
])

// ============================================
// PROPERTY VALIDATION
// ============================================

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(prop: string): string {
  return prop.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * Check if CSS custom property with safe prefix
 */
function isSafeCustomProperty(kebabProp: string): boolean {
  return kebabProp.startsWith('--mirror-') || kebabProp.startsWith('--m-')
}

/**
 * Check if a CSS property is allowed
 */
export function isAllowedCSSProperty(prop: string): boolean {
  if (!prop || typeof prop !== 'string') return false

  const kebabProp = toKebabCase(prop)

  if (isSafeCustomProperty(kebabProp)) return true

  return ALLOWED_CSS_PROPERTIES.has(kebabProp)
}

// ============================================
// VALUE SANITIZATION
// ============================================

/**
 * Check for JavaScript execution vectors
 */
function hasScriptVector(lower: string): boolean {
  return lower.includes('javascript:') || lower.includes('vbscript:')
}

/**
 * Check for IE expression hack
 */
function hasExpressionHack(lower: string): boolean {
  return lower.includes('expression(') || lower.includes('expression (')
}

/**
 * Check for IE behavior property
 */
function hasBehaviorHack(lower: string): boolean {
  return lower.includes('behavior:') || lower.includes('.htc')
}

/**
 * Check for external URL in url()
 */
function hasExternalUrl(lower: string): boolean {
  const urlMatch = lower.match(/url\s*\(\s*['"]?\s*([^)'"]+)/gi)
  if (!urlMatch) return false

  for (const match of urlMatch) {
    const urlContent = match.replace(/url\s*\(\s*['"]?\s*/i, '')
    if (urlContent.match(/^(https?:|\/\/|ftp:|file:|blob:)/i)) {
      return true
    }
  }
  return false
}

/**
 * Sanitize CSS value to prevent injection attacks
 */
export function sanitizeCSSValue(val: string): string | null {
  if (val === null || val === undefined) return null

  const strVal = typeof val !== 'string' ? String(val) : val
  const lower = strVal.toLowerCase()

  if (hasScriptVector(lower)) {
    console.warn('[Security] Script in CSS value blocked')
    return null
  }

  if (hasExpressionHack(lower)) {
    console.warn('[Security] CSS expression blocked')
    return null
  }

  if (hasBehaviorHack(lower)) {
    console.warn('[Security] CSS behavior blocked')
    return null
  }

  if (lower.includes('@import')) {
    console.warn('[Security] CSS @import blocked')
    return null
  }

  if (hasExternalUrl(lower)) {
    console.warn('[Security] External URL in CSS blocked')
    return null
  }

  if (lower.includes('-moz-binding')) {
    console.warn('[Security] CSS -moz-binding blocked')
    return null
  }

  return strVal
}
