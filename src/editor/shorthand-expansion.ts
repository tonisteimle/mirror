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
  'p': 'padding',
  'pad': 'padding',
  'm': 'margin',
  'mar': 'margin',
  'g': 'gap',

  // Colors
  'c': 'color',
  'col': 'color',
  'bg': 'background',
  'boc': 'border-color',

  // Border
  'rad': 'radius',
  'bor': 'border',

  // Visuals
  'o': 'opacity',
  'opa': 'opacity',
  'op': 'opacity',

  // Transform
  'rot': 'rotate',

  // Hover states
  'hover-col': 'hover-color',
  'hover-bg': 'hover-background',
  'hover-boc': 'hover-border-color',
  'hover-bor': 'hover-border',
  'hover-rad': 'hover-radius',
  'hover-opa': 'hover-opacity',

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
 * Long form → preferred shorthand mappings (reverse of above)
 * Use 3-character forms except for w/h (standard Mirror convention)
 */
export const LONG_TO_SHORT: Record<string, string> = {
  // Layout
  'horizontal': 'hor',
  'vertical': 'ver',
  'center': 'cen',

  // Sizing (w/h are exceptions - single char)
  'width': 'w',
  'height': 'h',
  'min-width': 'minw',
  'max-width': 'maxw',
  'min-height': 'minh',
  'max-height': 'maxh',

  // Spacing (3-char forms)
  'padding': 'pad',
  'margin': 'mar',
  // gap stays as 'gap' (already 3 chars)

  // Colors (3-char forms)
  'color': 'col',
  'background': 'bg',
  'border-color': 'boc',

  // Border
  'radius': 'rad',
  'border': 'bor',

  // Visuals (3-char form)
  'opacity': 'opa',

  // Transform
  'rotate': 'rot',

  // Hover states
  'hover-color': 'hover-col',
  'hover-background': 'hover-bg',
  'hover-border-color': 'hover-boc',
  'hover-border': 'hover-bor',
  'hover-radius': 'hover-rad',
  'hover-opacity': 'hover-opa',

  // Scroll
  'scroll-vertical': 'scroll-ver',
  'scroll-horizontal': 'scroll-hor',

  // Alignment
  'horizontal-left': 'hor-l',
  'horizontal-center': 'hor-cen',
  'horizontal-right': 'hor-r',
  'vertical-top': 'ver-t',
  'vertical-center': 'ver-cen',
  'vertical-bottom': 'ver-b',

  // Directions (single char for directions after properties)
  'left': 'l',
  'right': 'r',
  'top': 't',
  'bottom': 'b',
  'left-right': 'l-r',
  'top-bottom': 't-b',
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

    // Space, tab, or brace-syntax delimiters
    if (char === ' ' || char === '\t' || char === ':' || char === ',' || char === '{' || char === '}') {
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
 * Expand a word to the appropriate form based on mode
 * @param word The word to expand
 * @param toLongForm If true, expand to long form; if false, expand to short (3-char) form
 */
export function expandWordForMode(word: string, toLongForm: boolean): string {
  // First check if it's a known shorthand
  const longForm = PROPERTY_EXPANSIONS[word] || DIRECTION_EXPANSIONS[word]
  if (!longForm) {
    return word // Not a shorthand, return as-is
  }

  if (toLongForm) {
    return longForm // Return the long form
  } else {
    // Return the short (3-char) form
    return LONG_TO_SHORT[longForm] || longForm
  }
}

/**
 * Get the expansion for a word at cursor position
 * Returns null if no expansion available
 * @param toLongForm If true, expand to long form; if false, expand to short form
 */
export function getExpansionAtCursor(
  text: string,
  cursorPos: number,
  toLongForm: boolean = true
): { word: string; expanded: string; start: number; end: number } | null {
  // Safety checks
  if (!text || cursorPos < 0 || cursorPos > text.length) {
    return null
  }

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

  // Don't expand empty words
  if (!word || word.length === 0) {
    return null
  }

  if (shouldExpand(word)) {
    const expanded = expandWordForMode(word, toLongForm)
    // Only return if actually expanded to something different
    if (expanded !== word) {
      return {
        word,
        expanded,
        start,
        end
      }
    }
  }

  return null
}

/**
 * Contract a single word from long form to short form
 */
export function contractWord(word: string): string {
  return LONG_TO_SHORT[word] || word
}

/**
 * Check if a word can be contracted (is a long form)
 */
export function shouldContract(word: string): boolean {
  return word in LONG_TO_SHORT
}

/**
 * Contract all long forms in a line to short forms
 * Preserves strings (quoted content) and only contracts property keywords
 */
export function contractLine(line: string): string {
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

    // Inside string - don't contract
    if (inString) {
      current += char
      continue
    }

    // Space, tab, or brace-syntax delimiters
    if (char === ' ' || char === '\t' || char === ':' || char === ',' || char === '{' || char === '}') {
      if (current) {
        parts.push(contractWord(current))
        current = ''
      }
      parts.push(char)
      continue
    }

    current += char
  }

  // Don't forget last word
  if (current) {
    parts.push(contractWord(current))
  }

  return parts.join('')
}

/**
 * Transform code between short and long form
 * @param code The code to transform
 * @param toLongForm If true, expand to long form; if false, contract to short form
 * @returns Transformed code
 */
export function transformCode(code: string, toLongForm: boolean): string {
  const lines = code.split('\n')
  const transformedLines = lines.map(line => {
    // Skip empty lines and comment-only lines
    if (!line.trim() || line.trim().startsWith('//')) {
      return line
    }
    return toLongForm ? expandLine(line) : contractLine(line)
  })
  return transformedLines.join('\n')
}
