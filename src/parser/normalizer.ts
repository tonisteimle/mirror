/**
 * Input Normalization Layer
 *
 * Prepares raw DSL source for parsing by automatically correcting
 * common mistakes and normalizing syntax variations.
 *
 * This runs BEFORE the lexer and makes the parser more forgiving.
 */

// CSS color names → hex values
const CSS_COLORS: Record<string, string> = {
  // Basic colors
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  // Extended colors
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  gold: '#FFD700',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  fuchsia: '#FF00FF',
  // Grays
  darkgray: '#A9A9A9',
  darkgrey: '#A9A9A9',
  lightgray: '#D3D3D3',
  lightgrey: '#D3D3D3',
  dimgray: '#696969',
  dimgrey: '#696969',
  // Blues
  lightblue: '#ADD8E6',
  darkblue: '#00008B',
  skyblue: '#87CEEB',
  steelblue: '#4682B4',
  royalblue: '#4169E1',
  dodgerblue: '#1E90FF',
  cornflowerblue: '#6495ED',
  // Greens
  lightgreen: '#90EE90',
  darkgreen: '#006400',
  forestgreen: '#228B22',
  seagreen: '#2E8B57',
  limegreen: '#32CD32',
  springgreen: '#00FF7F',
  // Reds
  lightcoral: '#F08080',
  darkred: '#8B0000',
  crimson: '#DC143C',
  firebrick: '#B22222',
  indianred: '#CD5C5C',
  salmon: '#FA8072',
  tomato: '#FF6347',
  coral: '#FF7F50',
  // Others
  violet: '#EE82EE',
  indigo: '#4B0082',
  turquoise: '#40E0D0',
  tan: '#D2B48C',
  wheat: '#F5DEB3',
  beige: '#F5F5DC',
  ivory: '#FFFFF0',
  snow: '#FFFAFA',
  // Transparent
  transparent: 'transparent'
}

// Property aliases (CSS-like → Mirror shorthand)
// NOTE: hover-* aliases must come before single-word aliases to match first
const PROPERTY_ALIASES: Record<string, string> = {
  // Hover state property aliases (must be first!)
  'hover-background': 'hover-bg',
  'hover-color': 'hover-col',
  'hover-border-color': 'hover-boc',
  'hover-opacity': 'hover-opa',
  'hover-radius': 'hover-rad',
  // Standard property aliases
  'background': 'bg',
  'background-color': 'bg',
  'color': 'col',
  'padding': 'pad',
  'margin': 'mar',
  'border-radius': 'rad',
  'radius': 'rad',
  // NOTE: 'border' is NOT aliased to 'bor' because they are handled differently
  'border-color': 'boc',
  'border-col': 'boc',  // Handle partial conversion
  'width': 'w',
  'height': 'h',
  'min-width': 'minw',
  'min-w': 'minw',  // Also handle partial conversion
  'max-width': 'maxw',
  'max-w': 'maxw',
  'min-height': 'minh',
  'min-h': 'minh',
  'max-height': 'maxh',
  'max-h': 'maxh',
  'font-size': 'size',
  'font-weight': 'weight',
  'line-height': 'line',
  'font-family': 'font',
  'text-align': 'align',
  'opacity': 'opa',
  'z-index': 'z',
  'flex-direction': 'dir',
  'justify-content': 'justify',
  'align-items': 'items',
  'flex-grow': 'grow',
  'flex-shrink': 'shrink',
  'overflow': 'clip',
  'overflow-x': 'scroll-hor',
  'overflow-y': 'scroll',
  // Gap direction aliases
  'gap-x': 'gap-col',
  'gap-y': 'gap-row',
  'column-gap': 'gap-col',
  'row-gap': 'gap-row',
  'horizontal': 'hor',
  'vertical': 'ver',
  'center': 'cen',
  // Alignment long forms (must include both forms since center→cen happens first)
  'horizontal-left': 'hor-l',
  'horizontal-center': 'hor-cen',
  'horizontal-cen': 'hor-cen',
  'horizontal-right': 'hor-r',
  'vertical-top': 'ver-t',
  'vertical-center': 'ver-cen',
  'vertical-cen': 'ver-cen',
  'vertical-bottom': 'ver-b',
  // Also handle hor/ver prefixes with full suffixes
  'hor-center': 'hor-cen',
  'hor-left': 'hor-l',
  'hor-right': 'hor-r',
  'ver-center': 'ver-cen',
  'ver-top': 'ver-t',
  'ver-bottom': 'ver-b'
}

// Known component names for case normalization
const KNOWN_COMPONENTS = new Set([
  // Primitives
  'Box', 'Text', 'Image', 'Input', 'Button', 'Link', 'Icon', 'Textarea',
  // Layout
  'Container', 'Row', 'Column', 'Grid', 'Stack', 'Spacer', 'Divider',
  // Library components
  'Dropdown', 'Dialog', 'Tooltip', 'Tabs', 'Accordion', 'Select', 'Popover',
  'AlertDialog', 'ContextMenu', 'HoverCard', 'Switch', 'Checkbox', 'RadioGroup',
  'Slider', 'Toast', 'Progress', 'Avatar', 'Collapsible', 'Card', 'Badge',
  'Alert', 'Label', 'Skeleton', 'Spinner', 'Separator', 'AspectRatio',
  'Toggle', 'ToggleGroup', 'ScrollArea', 'Toolbar', 'Menubar', 'NavigationMenu',
  // Common custom components
  'Header', 'Footer', 'Sidebar', 'Nav', 'Menu', 'Item', 'List', 'Panel',
  'Form', 'Field', 'Modal', 'Overlay', 'Drawer', 'Sheet', 'Content',
  'Title', 'Description', 'Actions', 'Body', 'Section', 'Group'
])

// Doc-mode components stay lowercase (special keywords)
const DOC_MODE_COMPONENTS = new Set(['doc', 'text', 'playground'])

// Build lowercase lookup map
const COMPONENT_LOOKUP = new Map<string, string>()
for (const name of KNOWN_COMPONENTS) {
  COMPONENT_LOOKUP.set(name.toLowerCase(), name)
}
// Doc-mode components map to themselves (lowercase)
for (const name of DOC_MODE_COMPONENTS) {
  COMPONENT_LOOKUP.set(name, name)
}

/**
 * Normalize a component name to PascalCase
 */
function normalizeComponentName(name: string): string {
  if (name.length === 0) return name

  // If already starts with uppercase, keep as-is (it's already PascalCase)
  if (name[0] === name[0].toUpperCase()) {
    return name
  }

  // Check if it's a doc-mode component (should stay lowercase)
  if (DOC_MODE_COMPONENTS.has(name)) {
    return name
  }

  // Check known components (case-insensitive lookup)
  const known = COMPONENT_LOOKUP.get(name.toLowerCase())
  if (known) {
    return known
  }

  // For unknown components, convert to PascalCase
  // e.g., "myComponent" → "MyComponent", "my_component" → "MyComponent"
  return name[0].toUpperCase() + name.slice(1)
}

/**
 * Normalize hex color (expand shorthand, uppercase)
 */
function normalizeHexColor(hex: string): string {
  // Remove # prefix for processing
  const color = hex.startsWith('#') ? hex.slice(1) : hex

  // Expand 3-char shorthand to 6-char
  if (color.length === 3) {
    const expanded = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
    return '#' + expanded.toUpperCase()
  }

  // Expand 4-char shorthand (with alpha) to 8-char
  if (color.length === 4) {
    const expanded = color[0] + color[0] + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
    return '#' + expanded.toUpperCase()
  }

  // Uppercase 6 or 8 char colors
  return '#' + color.toUpperCase()
}

/**
 * Normalize a single line of code
 */
function normalizeLine(line: string): string {
  // Preserve empty lines
  if (line.trim() === '') {
    return ''
  }

  // Preserve comment-only lines
  const trimmed = line.trimStart()
  if (trimmed.startsWith('//')) {
    // Preserve indentation for comments
    const indent = line.match(/^(\s*)/)?.[1] || ''
    return indent + trimmed
  }

  // Extract and preserve indentation
  const indentMatch = line.match(/^(\s*)/)
  let indent = indentMatch ? indentMatch[1] : ''
  let content = line.slice(indent.length)

  // Normalize tabs to 2 spaces in indent
  indent = indent.replace(/\t/g, '  ')

  // Normalize odd indentation to even (round down to nearest 2)
  const spaces = indent.length
  if (spaces % 2 !== 0) {
    indent = '  '.repeat(Math.floor(spaces / 2))
  }

  // Remove trailing whitespace from content
  content = content.trimEnd()

  // === Quote Normalization ===
  // Replace typographic quotes with ASCII quotes
  // Using explicit unicode codepoints for reliability
  content = content
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')  // " " „ « »
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'") // ' ' ‚ ‹ ›

  // === Syntax Artifact Removal ===
  // Remove trailing semicolons (not inside strings)
  content = removeTrailingSemicolon(content)

  // Remove CSS-style colons from properties (e.g., "pad: 16" → "pad 16")
  // But preserve colons in definitions (e.g., "Button:")
  content = normalizeCssColons(content)

  // Remove parentheses from values (e.g., "pad(16)" → "pad 16")
  content = normalizeParentheses(content)

  // NOTE: We do NOT normalize commas because they are used for action chaining
  // e.g., "onclick activate self, deactivate-siblings"
  // Users who accidentally use commas in property values will get parser errors

  // === Color Normalization ===
  // NOTE: We do NOT uppercase hex colors - keep them as the user wrote them
  // This preserves user intent and avoids breaking existing tests

  // Replace CSS color names with hex values
  content = replaceCssColors(content)

  // === Unit Removal ===
  // Remove px suffix (px is default)
  content = content.replace(/\b(\d+(?:\.\d+)?)px\b/g, '$1')

  // Convert rem to px (assuming 16px base)
  content = content.replace(/\b(\d+(?:\.\d+)?)rem\b/g, (_, num) => {
    return String(Math.round(parseFloat(num) * 16))
  })

  // Convert em to px (assuming 16px base)
  content = content.replace(/\b(\d+(?:\.\d+)?)em\b/g, (_, num) => {
    return String(Math.round(parseFloat(num) * 16))
  })

  // === Property Alias Normalization ===
  content = normalizePropertyAliases(content)

  // === Direction Keyword Normalization ===
  // Convert long-form directions to short-form after spacing/border properties
  // e.g., "pad left 16" → "pad l 16"
  content = normalizeDirectionKeywords(content)

  // === Component Name Normalization ===
  content = normalizeComponentNames(content)

  // === Multiple Space Normalization ===
  // Replace multiple spaces with single space (except at start)
  content = content.replace(/  +/g, ' ')

  return indent + content
}

/**
 * Remove trailing semicolon, but not inside strings
 */
function removeTrailingSemicolon(content: string): string {
  // Simple check: if ends with ; and not inside a string
  if (!content.endsWith(';')) return content

  // Count quotes to check if we're inside a string
  let inString = false
  for (let i = 0; i < content.length - 1; i++) {
    if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
      inString = !inString
    }
  }

  if (!inString) {
    return content.slice(0, -1).trimEnd()
  }

  return content
}

/**
 * Normalize CSS-style colons (e.g., "pad: 16" → "pad 16")
 * Preserves colons in:
 * - Component definitions (Button:)
 * - Token definitions ($primary:)
 * - Inline conditionals (if ... then ... : ...)
 */
function normalizeCssColons(content: string): string {
  // Don't touch lines that are definitions
  if (content.match(/^\s*[A-Z][a-zA-Z0-9]*\s*:/)) return content
  if (content.match(/^\s*\$[a-zA-Z][a-zA-Z0-9-]*\s*:/)) return content

  // Replace property: value patterns
  // Match: word followed by colon and space, then value
  return content.replace(/\b([a-z][a-z-]*)\s*:\s+/gi, (match, prop) => {
    // Check if this is a known property or alias
    const lower = prop.toLowerCase()
    if (PROPERTY_ALIASES[lower] || isKnownProperty(lower)) {
      return prop + ' '
    }
    return match
  })
}

/**
 * Check if a property name is known
 */
function isKnownProperty(name: string): boolean {
  const knownProps = new Set([
    'bg', 'col', 'pad', 'mar', 'rad', 'bor', 'boc', 'w', 'h',
    'minw', 'maxw', 'minh', 'maxh', 'size', 'weight', 'line',
    'font', 'align', 'opa', 'opacity', 'z', 'gap', 'grow', 'shrink',
    'hor', 'ver', 'cen', 'left', 'right', 'top', 'bottom',
    'hidden', 'visible', 'disabled', 'cursor', 'shadow'
  ])
  return knownProps.has(name)
}

/**
 * Normalize parentheses around values (e.g., "pad(16)" → "pad 16")
 */
function normalizeParentheses(content: string): string {
  // Match property(value) patterns
  return content.replace(/\b([a-z][a-z-]*)\(([^)]+)\)/gi, (match, prop, value) => {
    const lower = prop.toLowerCase()
    if (PROPERTY_ALIASES[lower] || isKnownProperty(lower)) {
      return prop + ' ' + value
    }
    return match
  })
}

/**
 * Replace commas with spaces (except inside strings)
 */
function normalizeCommas(content: string): string {
  let result = ''
  let inString = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
      inString = !inString
    }

    if (char === ',' && !inString) {
      // Replace comma with space, but avoid double spaces
      if (result.length > 0 && result[result.length - 1] !== ' ') {
        result += ' '
      }
      // Skip any following space
      if (i + 1 < content.length && content[i + 1] === ' ') {
        i++
      }
    } else {
      result += char
    }
  }

  return result
}

/**
 * Replace CSS color names with hex values
 */
function replaceCssColors(content: string): string {
  // Match word boundaries to avoid partial matches
  let result = content

  for (const [name, hex] of Object.entries(CSS_COLORS)) {
    // Case-insensitive replacement, but only for whole words
    // and not inside strings or as part of component names
    const regex = new RegExp(`\\b${name}\\b`, 'gi')
    result = result.replace(regex, (match, offset) => {
      // Check if we're inside a string
      let inString = false
      for (let i = 0; i < offset; i++) {
        if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
          inString = !inString
        }
      }
      if (inString) return match

      // Check if preceded by a letter (part of identifier)
      if (offset > 0 && /[a-zA-Z]/.test(content[offset - 1])) {
        return match
      }

      return hex
    })
  }

  return result
}

/**
 * Normalize property aliases (CSS → Mirror shorthand)
 * Only replaces outside of strings and token references
 */
function normalizePropertyAliases(content: string): string {
  // Find string boundaries
  const stringRanges: Array<[number, number]> = []
  let inString = false
  let stringStart = 0

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
      if (inString) {
        stringRanges.push([stringStart, i])
        inString = false
      } else {
        stringStart = i
        inString = true
      }
    }
  }

  // Helper to check if position is inside a string
  const isInString = (pos: number): boolean => {
    return stringRanges.some(([start, end]) => pos >= start && pos <= end)
  }

  // Helper to check if position is inside a token reference ($name or $name-suffix)
  const isInTokenRef = (pos: number): boolean => {
    // Look backwards for a $ that would indicate this is part of a token
    for (let i = pos - 1; i >= 0; i--) {
      const char = content[i]
      if (char === '$') return true
      if (char === ' ' || char === '\n' || char === '\t') return false
      // Token names can contain letters, numbers, and hyphens
      if (!/[a-zA-Z0-9-]/.test(char)) return false
    }
    return false
  }

  let result = content

  for (const [alias, normalized] of Object.entries(PROPERTY_ALIASES)) {
    // Match word boundary, alias, then space or end
    const regex = new RegExp(`\\b${alias.replace(/-/g, '-')}(?=\\s|$)`, 'gi')
    result = result.replace(regex, (match, offset) => {
      if (isInString(offset)) {
        return match // Don't replace inside strings
      }
      if (isInTokenRef(offset)) {
        return match // Don't replace inside token references
      }
      return normalized
    })
  }

  return result
}

/**
 * Normalize direction keywords after spacing/border properties.
 * Converts: left→l, right→r, top→t, bottom→b
 * Also handles combos: left-right→l-r, top-bottom→t-b
 */
function normalizeDirectionKeywords(content: string): string {
  // Note: top→u (up), bottom→d (down) to match parser internals
  const directionMap: Record<string, string> = {
    'left': 'l',
    'right': 'r',
    'top': 'u',
    'bottom': 'd'
  }

  // Match spacing/border property followed by direction keyword(s)
  return content.replace(
    /\b(pad|mar|border|bor)\s+(left|right|top|bottom)(-(?:left|right|top|bottom))?\b/gi,
    (match, prop, dir1, dir2) => {
      const shortDir1 = directionMap[dir1.toLowerCase()]
      if (dir2) {
        const dir2Clean = dir2.slice(1) // Remove leading hyphen
        const shortDir2 = directionMap[dir2Clean.toLowerCase()]
        return `${prop} ${shortDir1}-${shortDir2}`
      }
      return `${prop} ${shortDir1}`
    }
  )
}

/**
 * Normalize component names to PascalCase
 */
function normalizeComponentNames(content: string): string {
  // Match component names at start of line (after optional -)
  // Component names start with a letter and contain letters/numbers

  // Pattern: start of content, optional "- ", then component name
  const match = content.match(/^(-\s*)?([a-zA-Z][a-zA-Z0-9]*)(\s|$|:)/)
  if (match) {
    const prefix = match[1] || ''
    const name = match[2]
    const suffix = match[3]

    // Don't normalize keywords and properties
    const keywords = new Set([
      // Control flow
      'if', 'else', 'each', 'in', 'then', 'state', 'events', 'data',
      // Actions
      'show', 'hide', 'toggle', 'open', 'close', 'page', 'assign',
      'highlight', 'select', 'deselect', 'activate', 'deactivate',
      'filter', 'focus', 'validate', 'reset',
      // Events
      'onclick', 'onhover', 'onchange', 'oninput', 'onfocus', 'onblur',
      'onkeydown', 'onkeyup', 'onload', 'oncomplete', 'onfill', 'onempty',
      'onsubmit', 'onscroll', 'onresize', 'ondrag', 'ondrop',
      // Modifiers
      'from', 'named', 'as', 'to', 'debounce', 'delay',
      // Animations
      'animate', 'fade', 'scale', 'spin', 'pulse', 'bounce',
      'slide', 'none',
      // Properties (should not be PascalCased)
      'bg', 'col', 'pad', 'mar', 'rad', 'bor', 'boc', 'w', 'h',
      'minw', 'maxw', 'minh', 'maxh', 'size', 'weight', 'line',
      'font', 'align', 'opa', 'opacity', 'z', 'gap', 'grow', 'shrink',
      'hor', 'ver', 'cen', 'left', 'right', 'top', 'bottom',
      'hidden', 'visible', 'disabled', 'cursor', 'shadow', 'clip',
      'scroll', 'wrap', 'fill', 'full', 'grid', 'stacked', 'between',
      'icon', 'type', 'rows', 'fit', 'snap', 'truncate', 'italic',
      'underline', 'uppercase', 'lowercase',
      // Transform properties
      'rotate', 'translate',
      // System states (should not be PascalCased)
      'hover', 'active', 'default', 'pressed', 'selected',
      'expanded', 'collapsed', 'valid', 'invalid', 'loading',
      'highlighted', 'inactive', 'checked', 'unchecked',
      // Special targets
      'self', 'next', 'prev', 'first', 'last', 'all'
    ])

    if (!keywords.has(name.toLowerCase())) {
      const normalized = normalizeComponentName(name)
      if (normalized !== name) {
        return prefix + normalized + suffix + content.slice(match[0].length)
      }
    }
  }

  return content
}

/**
 * Normalize the input source code.
 * This is the main entry point for normalization.
 */
export function normalizeInput(input: string): string {
  // Normalize line endings (CRLF → LF)
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split into lines
  const lines = normalized.split('\n')

  // Track if we're in a multiline string (single quotes)
  let inMultilineString = false

  // Normalize each line
  const normalizedLines: string[] = []
  let consecutiveEmptyLines = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for multiline string start/end
    const singleQuotes = (line.match(/'/g) || []).length
    if (singleQuotes % 2 !== 0) {
      inMultilineString = !inMultilineString
    }

    // Don't normalize inside multiline strings
    if (inMultilineString || singleQuotes > 0) {
      normalizedLines.push(line)
      consecutiveEmptyLines = 0
      continue
    }

    // Normalize the line
    const normalizedLine = normalizeLine(line)

    // Collapse multiple empty lines into one
    if (normalizedLine === '') {
      consecutiveEmptyLines++
      if (consecutiveEmptyLines <= 1) {
        normalizedLines.push(normalizedLine)
      }
    } else {
      consecutiveEmptyLines = 0
      normalizedLines.push(normalizedLine)
    }
  }

  // Remove trailing empty lines
  while (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] === '') {
    normalizedLines.pop()
  }

  return normalizedLines.join('\n')
}

/**
 * Check if normalization changed the input (for debugging/testing)
 */
export function getNormalizationChanges(input: string): { original: string; normalized: string; changed: boolean } {
  const normalized = normalizeInput(input)
  return {
    original: input,
    normalized,
    changed: input !== normalized
  }
}
