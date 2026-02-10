/**
 * Line-by-line analysis of DSL code
 */

import type {
  ParsedLine,
  PropertyToken,
  InlineSlot
} from '../types'
import {
  PROPERTIES as KNOWN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  BOOLEAN_PROPERTIES,
  isDirectionOrCombo,
  splitDirectionCombo
} from '../../dsl/properties'

/**
 * Parse a single line into structured data
 */
export function analyzeLine(line: string, lineNumber: number): ParsedLine {
  const raw = line
  const trimmed = line.trim()
  const indent = (line.match(/^(\s*)/)?.[1] || '').length

  // Empty line
  if (!trimmed) {
    return {
      lineNumber,
      indent,
      raw,
      trimmed,
      isEmpty: true,
      isComment: false,
      isDefinition: false,
      componentName: null,
      hasFrom: false,
      fromTarget: null,
      properties: [],
      content: null,
      inlineSlots: []
    }
  }

  // Comment (if we support them - starts with //)
  if (trimmed.startsWith('//')) {
    return {
      lineNumber,
      indent,
      raw,
      trimmed,
      isEmpty: false,
      isComment: true,
      isDefinition: false,
      componentName: null,
      hasFrom: false,
      fromTarget: null,
      properties: [],
      content: null,
      inlineSlots: []
    }
  }

  // Tokenize
  const tokens = tokenizeLine(trimmed)

  // First token should be component name or definition
  let componentName: string | null = null
  let isDefinition = false
  let tokenIndex = 0

  if (tokens.length > 0) {
    const firstToken = tokens[0]

    // Check for definition (ends with :)
    if (firstToken.endsWith(':')) {
      isDefinition = true
      componentName = firstToken.slice(0, -1)
    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(firstToken)) {
      componentName = firstToken
    }
    tokenIndex = 1
  }

  // Check for 'from' keyword
  let hasFrom = false
  let fromTarget: string | null = null

  if (tokenIndex < tokens.length && tokens[tokenIndex].toLowerCase() === 'from') {
    hasFrom = true
    tokenIndex++
    if (tokenIndex < tokens.length && /^[A-Z][a-zA-Z0-9]*$/.test(tokens[tokenIndex])) {
      fromTarget = tokens[tokenIndex]
      tokenIndex++
    }
  }

  // Parse properties and content
  const properties: PropertyToken[] = []
  const inlineSlots: InlineSlot[] = []
  let content: string | null = null

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex]
    const column = trimmed.indexOf(token)

    // String content
    if (token.startsWith('"') && token.endsWith('"')) {
      content = token.slice(1, -1)
      tokenIndex++
      continue
    }

    // Slot name (component name followed by string)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(token)) {
      // Check if next token is a string
      if (tokenIndex + 1 < tokens.length) {
        const nextToken = tokens[tokenIndex + 1]
        if (nextToken.startsWith('"') && nextToken.endsWith('"')) {
          inlineSlots.push({
            name: token,
            content: nextToken.slice(1, -1)
          })
          tokenIndex += 2
          continue
        }
      }
      // Just a component name reference (might be a slot without content)
      inlineSlots.push({ name: token, content: '' })
      tokenIndex++
      continue
    }

    // Property
    const propertyName = token.toLowerCase()
    if (KNOWN_PROPERTIES.has(propertyName) || propertyName.match(/^(pad|mar|bor)_[lrud]$/)) {
      const prop: PropertyToken = {
        name: propertyName,
        value: null,
        startColumn: column
      }

      // Check for pad/mar/bor with directions or CSS shorthand
      if ((propertyName === 'pad' || propertyName === 'mar' || propertyName === 'bor') && tokenIndex + 1 < tokens.length) {
        const directions: string[] = []
        while (tokenIndex + 1 < tokens.length && isDirectionOrCombo(tokens[tokenIndex + 1])) {
          // Split combined directions like 'u-d' into ['u', 'd']
          directions.push(...splitDirectionCombo(tokens[tokenIndex + 1]))
          tokenIndex++
        }

        // Collect all number values (CSS shorthand: pad 16 12 8 4)
        const values: number[] = []
        while (tokenIndex + 1 < tokens.length && /^\d+$/.test(tokens[tokenIndex + 1])) {
          values.push(parseInt(tokens[tokenIndex + 1], 10))
          tokenIndex++
        }

        if (values.length > 0) {
          if (directions.length > 0) {
            // pad u-d 8 → specific sides
            for (const dir of directions) {
              properties.push({
                name: `${propertyName}_${dir}`,
                value: values[0],
                startColumn: column
              })
            }
          } else if (values.length === 1) {
            // pad 16 → all sides
            prop.value = values[0]
            properties.push(prop)
          } else if (values.length === 2) {
            // pad 16 12 → vertical horizontal
            properties.push({ name: `${propertyName}_u`, value: values[0], startColumn: column })
            properties.push({ name: `${propertyName}_d`, value: values[0], startColumn: column })
            properties.push({ name: `${propertyName}_l`, value: values[1], startColumn: column })
            properties.push({ name: `${propertyName}_r`, value: values[1], startColumn: column })
          } else if (values.length === 3) {
            // pad 16 12 8 → top horizontal bottom
            properties.push({ name: `${propertyName}_u`, value: values[0], startColumn: column })
            properties.push({ name: `${propertyName}_l`, value: values[1], startColumn: column })
            properties.push({ name: `${propertyName}_r`, value: values[1], startColumn: column })
            properties.push({ name: `${propertyName}_d`, value: values[2], startColumn: column })
          } else if (values.length >= 4) {
            // pad 16 12 8 4 → top right bottom left
            properties.push({ name: `${propertyName}_u`, value: values[0], startColumn: column })
            properties.push({ name: `${propertyName}_r`, value: values[1], startColumn: column })
            properties.push({ name: `${propertyName}_d`, value: values[2], startColumn: column })
            properties.push({ name: `${propertyName}_l`, value: values[3], startColumn: column })
          }
          tokenIndex++
          continue
        }
      }

      // Get value
      if (needsValue(propertyName) && tokenIndex + 1 < tokens.length) {
        prop.value = parseValue(tokens[tokenIndex + 1])
        tokenIndex++
      } else if (BOOLEAN_PROPERTIES.has(propertyName)) {
        prop.value = true
      }

      properties.push(prop)
      tokenIndex++
    } else {
      // Unknown token - might be invalid property
      properties.push({
        name: token,
        value: null,
        startColumn: column
      })
      tokenIndex++
    }
  }

  return {
    lineNumber,
    indent,
    raw,
    trimmed,
    isEmpty: false,
    isComment: false,
    isDefinition,
    componentName,
    hasFrom,
    fromTarget,
    properties,
    content,
    inlineSlots
  }
}

/**
 * Tokenize a line preserving quoted strings
 */
function tokenizeLine(line: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuote) {
        current += char
        tokens.push(current)
        current = ''
        inQuote = false
      } else {
        if (current) {
          tokens.push(current)
          current = ''
        }
        current = '"'
        inQuote = true
      }
    } else if (char === ' ' && !inQuote) {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Check if a property needs a value
 */
function needsValue(property: string): boolean {
  return (
    COLOR_PROPERTIES.has(property) ||
    NUMBER_PROPERTIES.has(property) ||
    STRING_PROPERTIES.has(property)
  )
}

/**
 * Parse a value token to appropriate type
 */
function parseValue(token: string): string | number | boolean | null {
  // Number
  if (/^\d+$/.test(token)) {
    return parseInt(token, 10)
  }

  // Color
  if (token.startsWith('#')) {
    return token
  }

  // Quoted string
  if (token.startsWith('"') && token.endsWith('"')) {
    return token.slice(1, -1)
  }

  // Boolean keywords
  if (token === 'true') return true
  if (token === 'false') return false

  // Return as string
  return token
}

/**
 * Check if a line starts with a component name
 */
export function startsWithComponentName(line: string): boolean {
  const trimmed = line.trim()
  return /^[A-Z][a-zA-Z0-9]*:?[\s]/.test(trimmed) || /^[A-Z][a-zA-Z0-9]*:?$/.test(trimmed)
}

/**
 * Extract just the component name from a line
 */
export function extractComponentName(line: string): string | null {
  const trimmed = line.trim()
  const match = trimmed.match(/^([A-Z][a-zA-Z0-9]*):?/)
  return match ? match[1] : null
}
