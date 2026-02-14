/**
 * Doc-Mode Tokens
 *
 * Predefined tokens for documentation formatting.
 * These provide default styles for headings, paragraphs, and inline formatting.
 *
 * Users can override these by defining their own tokens with the same names.
 */

/**
 * Token definition with style properties
 */
export interface DocTokenDef {
  // Typography
  size?: number
  weight?: number | string
  line?: number
  font?: string
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  lowercase?: boolean
  align?: 'left' | 'center' | 'right'
  letterSpacing?: number | string

  // Colors
  col?: string
  bg?: string

  // Spacing
  mar?: number | string
  pad?: number | string
  maxw?: number

  // Border
  bor?: number | string
  rad?: number

  // Other
  cursor?: string
  display?: string
}

/**
 * Default doc-mode tokens
 *
 * Based on the styling from mirror-docu.html
 */
export const DOC_TOKENS: Record<string, DocTokenDef> = {
  // ============================================
  // Headings
  // ============================================
  h1: {
    size: 48,
    weight: 400,
    col: '#eee',
    mar: '0 0 8',
    letterSpacing: -1,
  },
  h2: {
    size: 28,
    weight: 500,
    col: '#fff',
    mar: '48 0 16',
    letterSpacing: -0.5,
  },
  h3: {
    size: 18,
    weight: 500,
    col: '#fff',
    mar: '32 0 12',
  },
  h4: {
    size: 15,
    weight: 500,
    col: '#aaa',
    mar: '24 0 8',
  },

  // ============================================
  // Text blocks
  // ============================================
  p: {
    size: 14,
    col: '#777',
    line: 1.7,
    mar: '0 0 12',
    maxw: 480,
  },
  lead: {
    size: 14,
    col: '#777',
    line: 1.7,
    mar: '0 0 20',
    maxw: 480,
  },
  subtitle: {
    size: 14,
    col: '#777',
    mar: '0 0 48',
  },

  // ============================================
  // Inline styles
  // ============================================
  b: {
    weight: 600,
  },
  bold: {
    weight: 600,
  },
  i: {
    italic: true,
  },
  italic: {
    italic: true,
  },
  u: {
    underline: true,
  },
  underline: {
    underline: true,
  },
  code: {
    font: '"SF Mono", "Consolas", monospace',
    size: 12,
    bg: '#252525',
    pad: '2 6',
    rad: 3,
  },
  link: {
    col: '#5ba8f5',
    underline: true,
    cursor: 'pointer',
  },

  // ============================================
  // Lists
  // ============================================
  ul: {
    mar: '0 0 16',
    pad: '0 0 0 20',
  },
  ol: {
    mar: '0 0 16',
    pad: '0 0 0 20',
  },
  li: {
    size: 14,
    col: '#777',
    line: 1.7,
    mar: '0 0 6',
  },

  // ============================================
  // Special elements
  // ============================================
  label: {
    size: 12,
    uppercase: true,
    col: '#666',
    mar: '20 0 6',
    letterSpacing: 0.5,
  },
  divider: {
    bor: '1 0 0 0',
    col: '#222',
    mar: '24 0',
  },
  comment: {
    col: '#555',
    italic: true,
  },

  // ============================================
  // Syntax highlighting (for playground)
  // ============================================
  'syntax-component': {
    col: '#5ba8f5',
  },
  'syntax-property': {
    col: '#888',
  },
  'syntax-value': {
    col: '#b96',
  },
  'syntax-string': {
    col: '#a88',
  },
  'syntax-keyword': {
    col: '#2271c1',
  },
  'syntax-token': {
    col: '#5ba8f5',
  },
  'syntax-comment': {
    col: '#555',
  },
}

/**
 * Get a doc token by name
 */
export function getDocToken(name: string): DocTokenDef | undefined {
  return DOC_TOKENS[name]
}

/**
 * Check if a token name is a predefined doc token
 */
export function isDocToken(name: string): boolean {
  return name in DOC_TOKENS
}

/**
 * Convert doc token to CSS style object
 */
export function docTokenToStyles(token: DocTokenDef): Record<string, string> {
  const styles: Record<string, string> = {}

  if (token.size) styles.fontSize = `${token.size}px`
  if (token.weight) styles.fontWeight = String(token.weight)
  if (token.line) styles.lineHeight = String(token.line)
  if (token.font) styles.fontFamily = token.font
  if (token.italic) styles.fontStyle = 'italic'
  if (token.underline) styles.textDecoration = 'underline'
  if (token.uppercase) styles.textTransform = 'uppercase'
  if (token.lowercase) styles.textTransform = 'lowercase'
  if (token.align) styles.textAlign = token.align
  if (token.letterSpacing !== undefined) styles.letterSpacing = `${token.letterSpacing}px`

  if (token.col) styles.color = token.col
  if (token.bg) styles.backgroundColor = token.bg

  if (token.mar) {
    const margins = String(token.mar).split(' ').map(v => `${v}px`).join(' ')
    styles.margin = margins
  }
  if (token.pad) {
    const paddings = String(token.pad).split(' ').map(v => `${v}px`).join(' ')
    styles.padding = paddings
  }
  if (token.maxw) styles.maxWidth = `${token.maxw}px`

  if (token.rad) styles.borderRadius = `${token.rad}px`
  if (token.cursor) styles.cursor = token.cursor
  if (token.display) styles.display = token.display

  return styles
}

/**
 * Check if a token is a block-level token (creates a new block element)
 */
export function isBlockToken(name: string): boolean {
  const blockTokens = ['h1', 'h2', 'h3', 'h4', 'p', 'lead', 'subtitle', 'label', 'divider', 'ul', 'ol', 'li']
  return blockTokens.includes(name)
}

/**
 * Check if a token is an inline token (formats text within a block)
 */
export function isInlineToken(name: string): boolean {
  const inlineTokens = ['b', 'bold', 'i', 'italic', 'u', 'underline', 'code', 'link']
  return inlineTokens.includes(name)
}
