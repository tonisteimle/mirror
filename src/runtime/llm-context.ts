/**
 * LLM Context Builder
 *
 * Builds context for LLM code generation including:
 * - Existing component definitions
 * - Available tokens
 * - Current cursor position / selection
 * - Nearby code context
 */

import { MirrorNode, MirrorProps } from './mirror-runtime'

// =============================================================================
// TYPES
// =============================================================================

export interface LLMContext {
  /** Defined components with their props and slots */
  components: ComponentContext[]

  /** Defined tokens (design variables) */
  tokens: TokenContext[]

  /** Current cursor/selection context */
  cursor?: CursorContext

  /** Raw Mirror DSL source (for reference) */
  source?: string
}

export interface ComponentContext {
  name: string
  props: string[]          // e.g., ["bg #1a1a23", "pad 16", "rad 8"]
  slots: string[]          // e.g., ["Title", "Content"]
  extends?: string         // Parent component
  description?: string     // Optional description
}

export interface TokenContext {
  name: string             // e.g., "$primary.bg"
  value: string            // e.g., "#3B82F6"
  category: 'color' | 'spacing' | 'radius' | 'typography' | 'other'
}

export interface CursorContext {
  /** Line number (1-based) */
  line: number

  /** Column number (1-based) */
  column: number

  /** Component the cursor is inside */
  insideComponent?: string

  /** Slot the cursor is inside */
  insideSlot?: string

  /** Selected text */
  selection?: string

  /** Lines around cursor for context */
  surroundingCode?: string

  /** Indentation level at cursor (number of spaces) */
  indentLevel: number

  /** Indentation string (spaces or tabs) */
  indentString: string
}

// =============================================================================
// CONTEXT EXTRACTION FROM MIRROR DSL
// =============================================================================

/**
 * Extract components from Mirror DSL source
 */
export function extractComponents(source: string): ComponentContext[] {
  const components: ComponentContext[] = []
  const lines = source.split('\n')

  let currentComponent: ComponentContext | null = null
  let currentIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    const indent = line.length - line.trimStart().length

    // If inside a component, check if we're still indented
    if (currentComponent && indent <= currentIndent) {
      // Back to top level - save component
      components.push(currentComponent)
      currentComponent = null
      currentIndent = 0
    }

    // Check for slot definition inside component (indented Name:)
    if (currentComponent && indent > currentIndent) {
      const slotMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*:/)
      if (slotMatch) {
        currentComponent.slots.push(slotMatch[1])
        continue // Slot detected, don't treat as new component
      }
    }

    // Check for component definition (Name: or Name as Parent:)
    const defMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*(?:as\s+([A-Z][a-zA-Z0-9]*))?\s*:(.*)$/)
    if (defMatch) {
      // Save previous component if any
      if (currentComponent) {
        components.push(currentComponent)
      }

      const [, name, parent, propsStr] = defMatch
      currentComponent = {
        name,
        props: propsStr.trim() ? parsePropsString(propsStr.trim()) : [],
        slots: [],
        extends: parent
      }
      currentIndent = indent
    }
  }

  // Don't forget last component
  if (currentComponent) {
    components.push(currentComponent)
  }

  return components
}

/**
 * Extract tokens from Mirror DSL source
 */
export function extractTokens(source: string): TokenContext[] {
  const tokens: TokenContext[] = []
  const lines = source.split('\n')

  let inTokenBlock = false
  let tokenBlockPrefix = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Token definition: $name: value or $name.prop: value
    // Also handle token block start: $name: (with empty value)
    const tokenMatch = trimmed.match(/^\$([a-zA-Z0-9._-]+)\s*:\s*(.*)$/)
    if (tokenMatch) {
      const [, name, value] = tokenMatch

      // Check if this is a token block start (value is empty)
      if (!value || !value.trim()) {
        inTokenBlock = true
        tokenBlockPrefix = name
        continue
      }

      tokens.push({
        name: `$${name}`,
        value: value.trim(),
        category: categorizeToken(name, value.trim())
      })
      continue
    }

    // Token block content
    if (inTokenBlock) {
      const indent = line.length - line.trimStart().length
      if (indent > 0 && trimmed) {
        // Parse block content: prop value or prop: value
        const blockMatch = trimmed.match(/^([a-zA-Z0-9._-]+)\s*:?\s+(.+)$/)
        if (blockMatch) {
          const [, prop, value] = blockMatch
          tokens.push({
            name: `$${tokenBlockPrefix}.${prop}`,
            value: value.trim(),
            category: categorizeToken(prop, value.trim())
          })
        }
      } else if (indent === 0 && trimmed) {
        // End of token block
        inTokenBlock = false
        tokenBlockPrefix = ''
      }
    }
  }

  return tokens
}

/**
 * Categorize a token based on its name and value
 */
function categorizeToken(name: string, value: string): TokenContext['category'] {
  // Check name hints
  if (name.includes('bg') || name.includes('col') || name.includes('color')) {
    return 'color'
  }
  if (name.includes('pad') || name.includes('gap') || name.includes('margin')) {
    return 'spacing'
  }
  if (name.includes('rad') || name.includes('radius')) {
    return 'radius'
  }
  if (name.includes('font') || name.includes('size') || name.includes('weight')) {
    return 'typography'
  }

  // Check value hints
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return 'color'
  }
  if (/^\d+$/.test(value)) {
    return 'spacing' // Most numeric values are spacing
  }

  return 'other'
}

/**
 * Parse a props string like "bg #333, pad 16, rad 8"
 */
function parsePropsString(propsStr: string): string[] {
  // Simple split by comma, preserving property-value pairs
  return propsStr.split(',').map(p => p.trim()).filter(Boolean)
}

// =============================================================================
// CURSOR CONTEXT
// =============================================================================

/**
 * Build cursor context from position
 */
export function buildCursorContext(
  source: string,
  line: number,
  column: number,
  selection?: string
): CursorContext {
  const lines = source.split('\n')

  // Detect indentation at cursor line
  const cursorLine = lines[line - 1] || ''
  const indentMatch = cursorLine.match(/^(\s*)/)
  const indentString = indentMatch ? indentMatch[1] : ''
  const indentLevel = indentString.length

  const context: CursorContext = {
    line,
    column,
    selection,
    indentLevel,
    indentString
  }

  // Find surrounding code (3 lines before and after)
  const startLine = Math.max(0, line - 4)
  const endLine = Math.min(lines.length - 1, line + 2)
  context.surroundingCode = lines.slice(startLine, endLine + 1).join('\n')

  // Find what component/slot we're inside
  let currentComponent: string | undefined
  let currentSlot: string | undefined
  let componentIndent = -1
  let slotIndent = -1

  for (let i = 0; i < line && i < lines.length; i++) {
    const lineContent = lines[i]
    const trimmed = lineContent.trim()
    const indent = lineContent.length - lineContent.trimStart().length

    // Check for component definition
    const compMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*(?:as\s+[A-Z][a-zA-Z0-9]*)?\s*:/)
    if (compMatch && indent <= componentIndent) {
      currentComponent = compMatch[1]
      componentIndent = indent
      currentSlot = undefined
      slotIndent = -1
    } else if (compMatch && componentIndent === -1) {
      currentComponent = compMatch[1]
      componentIndent = indent
    }

    // Check for slot (indented component definition)
    const slotMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*:/)
    if (slotMatch && indent > componentIndent) {
      currentSlot = slotMatch[1]
      slotIndent = indent
    }
  }

  context.insideComponent = currentComponent
  context.insideSlot = currentSlot

  return context
}

// =============================================================================
// CONTEXT TO PROMPT
// =============================================================================

/**
 * Build a complete LLM context from Mirror source
 */
export function buildContext(
  source: string,
  cursorLine?: number,
  cursorColumn?: number,
  selection?: string
): LLMContext {
  const context: LLMContext = {
    components: extractComponents(source),
    tokens: extractTokens(source),
    source
  }

  if (cursorLine !== undefined) {
    context.cursor = buildCursorContext(
      source,
      cursorLine,
      cursorColumn || 1,
      selection
    )
  }

  return context
}

/**
 * Format context for LLM system prompt
 */
export function formatContextForPrompt(context: LLMContext): string {
  const sections: string[] = []

  // Components section
  if (context.components.length > 0) {
    sections.push('## Available Components\nReuse these components instead of creating new ones:\n')
    for (const comp of context.components) {
      let line = comp.name
      if (comp.extends) line += ` as ${comp.extends}`
      line += ':'
      if (comp.props.length > 0) line += ` ${comp.props.join(', ')}`
      sections.push(line)

      // Add slots
      for (const slot of comp.slots) {
        sections.push(`  ${slot}:`)
      }
      sections.push('')
    }
  }

  // Tokens section - group by category
  if (context.tokens.length > 0) {
    sections.push('## Design Tokens\nUse these tokens for consistent styling:\n')

    const byCategory: Record<string, TokenContext[]> = {}
    for (const token of context.tokens) {
      if (!byCategory[token.category]) byCategory[token.category] = []
      byCategory[token.category].push(token)
    }

    const categoryOrder: TokenContext['category'][] = ['color', 'spacing', 'radius', 'typography', 'other']
    for (const category of categoryOrder) {
      const tokens = byCategory[category]
      if (tokens && tokens.length > 0) {
        sections.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        for (const token of tokens.slice(0, 15)) { // Limit to avoid huge prompts
          sections.push(`${token.name}: ${token.value}`)
        }
        if (tokens.length > 15) {
          sections.push(`... and ${tokens.length - 15} more`)
        }
        sections.push('')
      }
    }
  }

  // Cursor context
  if (context.cursor) {
    sections.push('## Current Context')
    if (context.cursor.insideComponent) {
      sections.push(`Cursor is inside: ${context.cursor.insideComponent}`)
    }
    if (context.cursor.insideSlot) {
      sections.push(`Inside slot: ${context.cursor.insideSlot}`)
    }
    if (context.cursor.selection) {
      sections.push(`Selected: "${context.cursor.selection}"`)
    }
    if (context.cursor.surroundingCode) {
      sections.push('\nNearby code:')
      sections.push('```')
      sections.push(context.cursor.surroundingCode)
      sections.push('```')
    }
    sections.push('')
  }

  return sections.join('\n')
}

// =============================================================================
// ENHANCED SYSTEM PROMPT BUILDER
// =============================================================================

const BASE_SYSTEM_PROMPT = `You write UI code using Mirror's M() framework. Output ONLY valid JavaScript M() code, no explanations or markdown.

## Syntax
M('Component', { props })                    // element
M('Text', 'content', { props })              // with text
M('Button', 'label', { props })              // button with label
M('Icon', 'name', { props })                 // icon with name
M('Box', { props }, [children])              // with children

## Components
Box (flex container), Text, Button, Input, Icon (Lucide)

## Layout Properties
hor: true                    // horizontal (row)
ver: true                    // vertical (column) - default
center: true                 // center both axes
spread: true                 // space-between
gap: 16                      // gap between children
wrap: true                   // flex-wrap
stacked: true                // position: relative (for overlays)

## Sizing
w: 'full' | 300 | 'hug'      // width
h: 'full' | 200 | 'hug'      // height
pad: 16                      // padding all sides
pad: [12, 20]                // padding [vertical, horizontal]
margin: 16                   // margin

## Colors
bg: '#1a1a23'                // background (hex value)
bg: '$surface.bg'            // background (token - MUST be a string!)
col: '#888'                  // text color
col: '$muted.col'            // text color (token)

## Border & Radius
bor: [1, '#333']             // border [width, color]
rad: 8                       // border-radius

## Typography
'font-size': 16              // font size
weight: 'bold'               // font weight

## Visual
shadow: 'lg'                 // box-shadow (sm, md, lg)
cursor: 'pointer'
hidden: true                 // display: none
opacity: 0.5
z: 100                       // z-index
clip: true                   // overflow: hidden
scroll: true                 // overflow-y: auto

## Icon
is: 20                       // icon-size (NOT size!)

## States
states: { hover: { bg: '#444' } }

## Events
onclick: 'actionName'

## IMPORTANT RULES
- Use 'center: true' instead of justify-content/align-items
- Use 'is: 20' for icon size, NOT 'size'
- Use 'pad' and 'margin' only, NOT pad-top or margin-left
- Use 'col' for text color, NOT 'color'
- Use 'stacked: true' for position: relative
- Reuse existing components when available
- Use design tokens AS STRINGS: bg: '$primary.bg' (NOT bg: $primary.bg)
- Tokens are strings like '$surface.bg' or '$lg.pad', not JS variables

## Dark Mode Palette (use if no tokens provided)
#0a0a0f (app bg), #12121a (surface), #1a1a23 (card), #2a2a33 (hover), #333 (border)
#f0f0f5 (heading), #e0e0e5 (text), #a0a0aa (muted), #888 (hint), #666 (disabled)
#3B82F6 (primary), #2563EB (primary hover), #22C55E (success), #EF4444 (danger)

## Icons (Lucide)
home, settings, user, search, x, check, plus, edit, trash, bell, mail, chevron-down, chevron-up, moon, sun`

/**
 * Build enhanced system prompt with context
 */
export function buildSystemPrompt(context?: LLMContext): string {
  if (!context || (context.components.length === 0 && context.tokens.length === 0 && !context.cursor)) {
    return BASE_SYSTEM_PROMPT
  }

  const contextSection = formatContextForPrompt(context)

  return `${BASE_SYSTEM_PROMPT}

---

# Project Context

${contextSection}`
}

// =============================================================================
// CODE INTEGRATION HELPERS
// =============================================================================

/**
 * Re-indent generated code to match cursor position
 *
 * @param code - The generated code (typically starts at column 0)
 * @param baseIndent - The base indentation string (spaces/tabs) to add
 * @param additionalIndent - Additional indent for nested content (default: 2 spaces)
 */
export function reindentCode(
  code: string,
  baseIndent: string,
  additionalIndent: string = '  '
): string {
  const lines = code.split('\n')

  // Find the minimum existing indentation in the code (excluding empty lines)
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim()) {
      const match = line.match(/^(\s*)/)
      if (match) {
        minIndent = Math.min(minIndent, match[1].length)
      }
    }
  }
  if (minIndent === Infinity) minIndent = 0

  // Re-indent each line
  return lines.map((line, index) => {
    if (!line.trim()) return '' // Keep empty lines empty

    // Remove the minimum indent, then add the base indent
    const stripped = line.slice(minIndent)
    return baseIndent + stripped
  }).join('\n')
}

/**
 * Integrate generated code at a specific cursor position
 *
 * @param source - The original source code
 * @param generatedCode - The code generated by LLM
 * @param cursor - Cursor context with position and indentation
 * @param mode - 'insert' (add at cursor) or 'replace' (replace selection/line)
 */
export function integrateCode(
  source: string,
  generatedCode: string,
  cursor: CursorContext,
  mode: 'insert' | 'replace' = 'insert'
): string {
  const lines = source.split('\n')

  // Re-indent the generated code to match cursor indentation
  const reindented = reindentCode(generatedCode, cursor.indentString)

  if (mode === 'replace' && cursor.selection) {
    // Replace the selection
    const beforeSelection = source.slice(0, source.indexOf(cursor.selection))
    const afterSelection = source.slice(source.indexOf(cursor.selection) + cursor.selection.length)
    return beforeSelection + reindented + afterSelection
  } else {
    // Insert at cursor line
    const lineIndex = cursor.line - 1
    const before = lines.slice(0, lineIndex)
    const after = lines.slice(lineIndex)

    return [...before, reindented, ...after].join('\n')
  }
}

/**
 * Format code for M() JavaScript output with proper indentation
 */
export function formatMCode(code: string, indentSize: number = 2): string {
  // Basic formatter - adds newlines and indentation for readability
  let result = ''
  let indent = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    const nextChar = code[i + 1]

    // Track string state
    if ((char === '"' || char === "'") && code[i - 1] !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (inString) {
      result += char
      continue
    }

    // Handle brackets
    if (char === '[' || char === '{') {
      result += char
      if (nextChar !== ']' && nextChar !== '}') {
        indent++
        result += '\n' + ' '.repeat(indent * indentSize)
      }
    } else if (char === ']' || char === '}') {
      if (code[i - 1] !== '[' && code[i - 1] !== '{') {
        indent--
        result += '\n' + ' '.repeat(indent * indentSize)
      }
      result += char
    } else if (char === ',') {
      result += char
      // Add newline after comma if not in array literal like [1, 2]
      if (nextChar && nextChar !== ' ' && nextChar !== '\n') {
        result += '\n' + ' '.repeat(indent * indentSize)
      } else if (nextChar === ' ' && code[i + 2] && /[A-Z\[]/.test(code[i + 2])) {
        // Newline before M() calls
        result += '\n' + ' '.repeat(indent * indentSize)
      }
    } else {
      result += char
    }
  }

  return result
}

// =============================================================================
// EXPORT
// =============================================================================

export const LLMContextBuilder = {
  extractComponents,
  extractTokens,
  buildCursorContext,
  buildContext,
  formatContextForPrompt,
  buildSystemPrompt,
  reindentCode,
  integrateCode,
  formatMCode,
  BASE_SYSTEM_PROMPT
}

export default LLMContextBuilder
