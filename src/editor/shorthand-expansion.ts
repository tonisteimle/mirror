/**
 * Shorthand Expansion for Mirror DSL Editor
 *
 * Expands shorthand property names to their full readable forms.
 * This allows fast typing while maintaining readable code.
 *
 * Usage: The editor calls expandShorthand() on input to auto-expand.
 */

/**
 * Property shorthand → long form mappings
 */
export const PROPERTY_EXPANSIONS: Record<string, string> = {
  // Layout
  'hor': 'horizontal',
  'ver': 'vertical',
  'cen': 'center',

  // Sizing
  'w': 'width',
  'h': 'height',
  'minw': 'min-width',
  'maxw': 'max-width',
  'minh': 'min-height',
  'maxh': 'max-height',

  // Spacing
  'pad': 'padding',
  'mar': 'margin',

  // Colors
  'col': 'color',
  'bg': 'background',
  'boc': 'border-color',

  // Border
  'rad': 'radius',
  'bor': 'border',

  // Visuals
  'opa': 'opacity',
  'op': 'opacity',

  // Hover states
  'hover-col': 'hover-color',
  'hover-bg': 'hover-background',
  'hover-boc': 'hover-border-color',
  'hover-bor': 'hover-border',
  'hover-rad': 'hover-radius',

  // Scroll
  'scroll-ver': 'scroll-vertical',
  'scroll-hor': 'scroll-horizontal',

  // Alignment shortcuts
  'hor-l': 'horizontal-left',
  'hor-cen': 'horizontal-center',
  'hor-r': 'horizontal-right',
  'ver-t': 'vertical-top',
  'ver-cen': 'vertical-center',
  'ver-b': 'vertical-bottom',
}

/**
 * Direction shorthand → long form mappings
 */
export const DIRECTION_EXPANSIONS: Record<string, string> = {
  'l': 'left',
  'r': 'right',
  'u': 'top',
  'd': 'bottom',
  't': 'top',
  'b': 'bottom',
  // Combos
  'l-r': 'left-right',
  'u-d': 'top-bottom',
  't-b': 'top-bottom',
}

/**
 * Check if a word should be expanded
 */
export function shouldExpand(word: string): boolean {
  return word in PROPERTY_EXPANSIONS || word in DIRECTION_EXPANSIONS
}

/**
 * Expand a single word if it's a shorthand
 */
export function expandWord(word: string): string {
  return PROPERTY_EXPANSIONS[word] || DIRECTION_EXPANSIONS[word] || word
}

/**
 * Expand all shorthands in a line of text
 * Preserves strings (quoted content) and only expands property keywords
 */
export function expandLine(line: string): string {
  // Split by spaces but preserve structure
  const parts: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    // Handle string boundaries
    if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
      current += char
      continue
    }

    // Inside string - don't expand
    if (inString) {
      current += char
      continue
    }

    // Space or other delimiter
    if (char === ' ' || char === '\t') {
      if (current) {
        parts.push(expandWord(current))
        current = ''
      }
      parts.push(char)
      continue
    }

    current += char
  }

  // Don't forget last word
  if (current) {
    parts.push(expandWord(current))
  }

  return parts.join('')
}

/**
 * Get the expansion for a word at cursor position
 * Returns null if no expansion available
 */
export function getExpansionAtCursor(
  text: string,
  cursorPos: number
): { word: string; expanded: string; start: number; end: number } | null {
  // Find word boundaries
  let start = cursorPos
  let end = cursorPos

  // Move start back to word beginning
  while (start > 0 && /[a-zA-Z0-9_-]/.test(text[start - 1])) {
    start--
  }

  // Move end forward to word end
  while (end < text.length && /[a-zA-Z0-9_-]/.test(text[end])) {
    end++
  }

  const word = text.slice(start, end)

  if (shouldExpand(word)) {
    return {
      word,
      expanded: expandWord(word),
      start,
      end
    }
  }

  return null
}
