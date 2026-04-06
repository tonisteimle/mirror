/**
 * HTML Utilities
 *
 * Helper functions for HTML generation and manipulation.
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  if (!str) return ''

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
}

/**
 * Create a data-attributes string from an object
 */
export function dataAttrs(attrs: Record<string, string | number | boolean>): string {
  return Object.entries(attrs)
    .filter(([_, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => {
      if (v === true) return `data-${k}`
      return `data-${k}="${escapeHtml(String(v))}"`
    })
    .join(' ')
}

/**
 * Conditionally apply CSS classes
 */
export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Simple template literal tag for HTML
 * Escapes interpolated values by default
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    const value = values[i]
    if (value === undefined || value === null) {
      return result + str
    }
    // If value is already marked as raw HTML, don't escape
    if (typeof value === 'object' && value !== null && 'rawHtml' in value) {
      return result + str + (value as { rawHtml: string }).rawHtml
    }
    return result + str + escapeHtml(String(value))
  }, '')
}

/**
 * Mark a string as raw HTML (won't be escaped by html``)
 */
export function raw(htmlString: string): { rawHtml: string } {
  return { rawHtml: htmlString }
}

/**
 * Create an SVG icon element
 */
export function svgIcon(
  path: string,
  options: {
    width?: number
    height?: number
    className?: string
    strokeWidth?: number
    fill?: string
  } = {}
): string {
  const {
    width = 14,
    height = 14,
    className = 'icon',
    strokeWidth = 2,
    fill = 'none'
  } = options

  return `
    <svg
      class="${className}"
      viewBox="0 0 24 24"
      fill="${fill}"
      stroke="currentColor"
      stroke-width="${strokeWidth}"
      width="${width}"
      height="${height}"
    >
      ${path}
    </svg>
  `
}

/**
 * Common SVG icon paths
 */
export const ICON_PATHS = {
  chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
  chevronUp: '<polyline points="18 15 12 9 6 15"></polyline>',
  chevronRight: '<polyline points="9 18 15 12 9 6"></polyline>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"></polyline>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  check: '<polyline points="20 6 9 17 4 12"></polyline>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
  trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  unlink: '<path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"></path><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"></path><line x1="8" y1="2" x2="8" y2="5"></line><line x1="2" y1="8" x2="5" y2="8"></line><line x1="16" y1="19" x2="16" y2="22"></line><line x1="19" y1="16" x2="22" y2="16"></line>'
}

/**
 * Generate a unique ID for DOM elements
 */
let idCounter = 0
export function uniqueId(prefix: string = 'pp'): string {
  return `${prefix}-${++idCounter}`
}
