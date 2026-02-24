/**
 * Convert Tutorial Code Examples to Vertical Format
 *
 * Transforms:
 *   Row hor, g 12
 *     Button bg #2271c1, pad 12, "Click"
 *
 * To:
 *   Row
 *       horizontal
 *       gap 12
 *       Button
 *           background #2271c1
 *           padding 12
 *           "Click"
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Property name mappings (short -> long)
const PROPERTY_EXPANSIONS: Record<string, string> = {
  'bg': 'background',
  'col': 'color',
  'pad': 'padding',
  'mar': 'margin',
  'rad': 'radius',
  'bor': 'border',
  'boc': 'border-color',
  'g': 'gap',
  'w': 'width',
  'h': 'height',
  'minw': 'min-width',
  'maxw': 'max-width',
  'minh': 'min-height',
  'maxh': 'max-height',
  'hor': 'horizontal',
  'ver': 'vertical',
  'cen': 'center',
  'o': 'opacity',
  'fs': 'font-size',
  'text-size': 'font-size',
}

// State keywords
const STATE_KEYWORDS = new Set([
  'hover', 'focus', 'active', 'disabled', 'selected',
  'expanded', 'collapsed', 'on', 'off', 'valid', 'invalid'
])

interface Tutorial {
  sections: Section[]
  [key: string]: unknown
}

interface Section {
  content?: ContentItem[]
  subsections?: Section[]
  [key: string]: unknown
}

interface ContentItem {
  type: string
  code?: string
  [key: string]: unknown
}

/**
 * Split a string by commas, respecting quoted strings
 */
function splitByComma(str: string): string[] {
  const parts: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''
  let depth = 0

  for (const char of str) {
    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
      current += char
    } else if (inString && char === stringChar) {
      inString = false
      current += char
    } else if (!inString && char === '(') {
      depth++
      current += char
    } else if (!inString && char === ')') {
      depth--
      current += char
    } else if (!inString && depth === 0 && char === ',') {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Expand short property names to long form
 */
function expandProperty(prop: string): string {
  const trimmed = prop.trim()

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed
  }

  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) {
    return PROPERTY_EXPANSIONS[trimmed] || trimmed
  }

  const name = trimmed.slice(0, spaceIdx)
  const value = trimmed.slice(spaceIdx + 1)
  const expanded = PROPERTY_EXPANSIONS[name] || name

  return `${expanded} ${value}`
}

/**
 * Get indentation level (number of spaces)
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Create indent string with 4-space increments
 */
function makeIndent(level: number): string {
  return '    '.repeat(level)
}

/**
 * Check if line is a state block
 */
function isStateBlock(str: string): boolean {
  const trimmed = str.trim()
  if (STATE_KEYWORDS.has(trimmed)) return true
  if (trimmed.startsWith('state ')) return true
  return false
}

/**
 * Check if line is a component (starts with uppercase)
 */
function isComponent(str: string): boolean {
  const trimmed = str.trim()
  return /^[A-Z]/.test(trimmed) && !trimmed.startsWith('"')
}

/**
 * Parse a component line
 */
function parseComponentLine(line: string): {
  component: string
  isDefinition: boolean
  props: string[]
  textContent: string | null
} {
  const trimmed = line.trim()

  // Check for definition
  const colonMatch = trimmed.match(/^([A-Z][a-zA-Z0-9-]*):?\s*(.*)$/)
  if (!colonMatch) {
    return { component: '', isDefinition: false, props: [], textContent: null }
  }

  const isDefinition = trimmed.includes(':') &&
    trimmed.indexOf(':') === colonMatch[1].length

  const component = colonMatch[1]
  const propsStr = isDefinition
    ? trimmed.slice(component.length + 1).trim()
    : trimmed.slice(component.length).trim()

  if (!propsStr) {
    return { component, isDefinition, props: [], textContent: null }
  }

  // Split properties
  const parts = splitByComma(propsStr)
  const props: string[] = []
  let textContent: string | null = null

  for (const part of parts) {
    const expanded = expandProperty(part)
    if (expanded.startsWith('"') || expanded.startsWith("'")) {
      textContent = expanded
    } else {
      props.push(expanded)
    }
  }

  return { component, isDefinition, props, textContent }
}

/**
 * Convert a code block to vertical format
 */
function convertToVertical(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      result.push('')
      continue
    }

    // Comment
    if (trimmed.startsWith('//')) {
      result.push(line)
      continue
    }

    // Calculate indent level (convert any indent to 4-space increments)
    const originalIndent = getIndentLevel(line)
    // Convert 2-space to 4-space: divide by 2 to get logical level
    const indentLevel = Math.floor(originalIndent / 2)
    const baseIndent = makeIndent(indentLevel)

    // State block - keep simple
    if (isStateBlock(trimmed)) {
      result.push(baseIndent + trimmed)
      continue
    }

    // Property line (inside state block, starts with lowercase)
    if (!isComponent(trimmed) && !trimmed.includes(',')) {
      result.push(baseIndent + expandProperty(trimmed))
      continue
    }

    // Component line
    if (isComponent(trimmed)) {
      const { component, isDefinition, props, textContent } = parseComponentLine(trimmed)

      if (!component) {
        result.push(line)
        continue
      }

      // No properties - simple component
      if (props.length === 0 && !textContent) {
        result.push(baseIndent + component + (isDefinition ? ':' : ''))
        continue
      }

      // Has properties - convert to vertical
      result.push(baseIndent + component + (isDefinition ? ':' : ''))

      const propIndent = makeIndent(indentLevel + 1)
      for (const prop of props) {
        result.push(propIndent + prop)
      }

      if (textContent) {
        result.push(propIndent + textContent)
      }

      continue
    }

    // Fallback - property line with comma (unusual)
    if (trimmed.includes(',')) {
      const parts = splitByComma(trimmed)
      const propIndent = baseIndent
      for (const part of parts) {
        result.push(propIndent + expandProperty(part))
      }
      continue
    }

    // Default - keep as is
    result.push(baseIndent + expandProperty(trimmed))
  }

  return result.join('\n')
}

/**
 * Process tutorial JSON
 */
function processTutorial(tutorial: Tutorial): { tutorial: Tutorial; count: number } {
  let convertedCount = 0

  function processSection(section: Section): void {
    if (section.content && Array.isArray(section.content)) {
      for (const item of section.content) {
        if (item.type === 'code' && typeof item.code === 'string') {
          const original = item.code
          const converted = convertToVertical(original)
          if (converted !== original) {
            item.code = converted
            convertedCount++
          }
        }
      }
    }

    if (section.subsections && Array.isArray(section.subsections)) {
      for (const sub of section.subsections) {
        processSection(sub)
      }
    }
  }

  for (const section of tutorial.sections) {
    processSection(section)
  }

  return { tutorial, count: convertedCount }
}

// Main
const tutorialPath = resolve(__dirname, '../docs/tutorial.json')
console.log('Reading tutorial from:', tutorialPath)

const tutorialContent = readFileSync(tutorialPath, 'utf-8')
const tutorial = JSON.parse(tutorialContent) as Tutorial

const { tutorial: converted, count } = processTutorial(tutorial)

writeFileSync(tutorialPath, JSON.stringify(converted, null, 2))
console.log(`Converted ${count} code blocks`)
console.log('Tutorial updated successfully!')
