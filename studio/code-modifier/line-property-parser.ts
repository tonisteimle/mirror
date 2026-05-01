/**
 * LinePropertyParser - Parses and modifies property lines robustly
 *
 * Handles:
 * - Property aliases (bg → background, pad → padding)
 * - Multi-value properties (pad 16 12, bor 1 solid #333)
 * - Directional properties (pad left 16, rad tl 8)
 * - Quoted string values
 * - Token references ($accent.bg)
 *
 * This parser analyzes the ENTIRE line to ensure correct modifications.
 */

import { properties as schemaProperties } from '../../compiler/schema/properties'

/**
 * Parsed property from a line
 */
export interface ParsedProperty {
  name: string // Original name as used in source (e.g., "bg")
  canonicalName: string // Canonical name (e.g., "background")
  value: string // Full value including all parts
  startIndex: number // Start position in line
  endIndex: number // End position in line (exclusive)
  isBoolean: boolean // Property has no value
}

/**
 * Parsed line structure
 */
export interface ParsedLine {
  indent: string // Leading whitespace
  componentPart: string // Component name and definition marker
  properties: ParsedProperty[] // All properties in order
  textContent: string | null // Quoted text content at end
  original: string // Original line
}

/**
 * Build alias map from schema
 * Maps all names and aliases to canonical name
 */
const aliasMap = new Map<string, string>()
const booleanProperties = new Set<string>()
const multiValueProperties = new Set<string>()
const directionalProperties = new Set<string>()

// Initialize from schema
for (const prop of schemaProperties) {
  // Map canonical name to itself
  aliasMap.set(prop.name, prop.name)

  // Map all aliases to canonical name
  for (const alias of prop.aliases) {
    aliasMap.set(alias, prop.name)
  }

  // Track property types
  if (prop.type === 'boolean') {
    booleanProperties.add(prop.name)
    for (const alias of prop.aliases) {
      booleanProperties.add(alias)
    }
  }

  // Multi-value properties
  if (prop.type === 'spacing' || prop.type === 'border' || prop.type === 'size') {
    multiValueProperties.add(prop.name)
    for (const alias of prop.aliases) {
      multiValueProperties.add(alias)
    }
  }

  // Directional properties
  if (prop.directions && prop.directions.length > 0) {
    directionalProperties.add(prop.name)
    for (const alias of prop.aliases) {
      directionalProperties.add(alias)
    }
  }
}

/**
 * Get canonical property name
 */
export function getCanonicalName(name: string): string {
  return aliasMap.get(name) || name
}

/**
 * Check if two property names refer to the same property
 */
export function isSameProperty(name1: string, name2: string): boolean {
  return getCanonicalName(name1) === getCanonicalName(name2)
}

/**
 * Check if property is boolean (no value)
 */
export function isBooleanProperty(name: string): boolean {
  return booleanProperties.has(name) || booleanProperties.has(getCanonicalName(name))
}

/**
 * Check if property can have multiple values
 */
export function isMultiValueProperty(name: string): boolean {
  return multiValueProperties.has(name) || multiValueProperties.has(getCanonicalName(name))
}

/**
 * Direction keywords that can follow a property name
 */
const DIRECTION_KEYWORDS = new Set([
  'top',
  'right',
  'bottom',
  'left',
  't',
  'r',
  'b',
  'l',
  'tl',
  'tr',
  'bl',
  'br',
  'x',
  'y',
  'hor',
  'ver',
])

/**
 * Parse a Mirror property line into structured components
 */
export function parseLine(line: string): ParsedLine {
  const result: ParsedLine = {
    indent: '',
    componentPart: '',
    properties: [],
    textContent: null,
    original: line,
  }

  // Extract indent
  const indentMatch = line.match(/^(\s*)/)
  result.indent = indentMatch ? indentMatch[1] : ''

  const content = line.substring(result.indent.length)
  if (!content) return result

  // Find component part (everything before first property or comma)
  // Component names are: Word, Word:, Word as Parent:, etc.
  // Also handles lowercase component names (primitives like rect, box, text)
  const componentMatch = content.match(/^([a-zA-Z][a-zA-Z0-9]*(?:\s+as\s+[a-zA-Z][a-zA-Z0-9]*)?:?)/)
  if (!componentMatch) return result

  result.componentPart = componentMatch[1]
  let remaining = content.substring(componentMatch[0].length)

  // Track position in original line for accurate offsets
  let currentPos = result.indent.length + componentMatch[0].length

  // Parse remaining content as properties
  // Format: prop value, prop2 value2, "text content"
  // Also: prop, (boolean), prop value value2, (multi-value)

  while (remaining.length > 0) {
    // Skip leading whitespace and commas
    const leadingMatch = remaining.match(/^[\s,]+/)
    if (leadingMatch) {
      currentPos += leadingMatch[0].length
      remaining = remaining.substring(leadingMatch[0].length)
    }

    if (!remaining.length) break

    // Check for quoted text content. In Mirror's DSL, components like
    // `Button "Edit", bg #fff, …` carry the textContent BEFORE the
    // property list — so we must record it and KEEP parsing properties.
    // Previously this branch `break`-ed out of the loop, which silently
    // dropped every property after a textContent. That made
    // findPropertyInLine return null for `bg` on Button/Text/H1/…
    // lines, so updateProperty fell back to addProperty and appended
    // duplicates instead of replacing.
    if (remaining.startsWith('"') || remaining.startsWith("'")) {
      const quote = remaining[0]
      const endQuote = remaining.indexOf(quote, 1)
      if (endQuote !== -1) {
        result.textContent = remaining.substring(0, endQuote + 1)
        const consumed = endQuote + 1
        currentPos += consumed
        remaining = remaining.substring(consumed)
        continue
      } else {
        // Unterminated quote — best effort: treat the rest as text and
        // stop, since we can't reliably find the property boundary.
        result.textContent = remaining
        break
      }
    }

    // Parse property: name [direction] [value(s)]
    const propStartPos = currentPos
    const propParsed = parseNextProperty(remaining)

    if (propParsed) {
      result.properties.push({
        name: propParsed.name,
        canonicalName: getCanonicalName(propParsed.name),
        value: propParsed.value,
        startIndex: propStartPos,
        endIndex: propStartPos + propParsed.consumed,
        isBoolean: propParsed.isBoolean,
      })

      currentPos += propParsed.consumed
      remaining = remaining.substring(propParsed.consumed)
    } else {
      // Can't parse, skip to next comma or end
      const skipMatch = remaining.match(/^[^,]+/)
      if (skipMatch) {
        currentPos += skipMatch[0].length
        remaining = remaining.substring(skipMatch[0].length)
      } else {
        break
      }
    }
  }

  return result
}

/**
 * Parse the next property from a string
 */
function parseNextProperty(str: string): {
  name: string
  value: string
  consumed: number
  isBoolean: boolean
} | null {
  // Match property name (lowercase, may have hyphen)
  const nameMatch = str.match(/^([a-z][a-z0-9-]*)/)
  if (!nameMatch) return null

  const name = nameMatch[1]
  let consumed = name.length
  let remaining = str.substring(consumed)
  let value = ''

  // Check for direction keyword immediately after name
  const dirMatch = remaining.match(/^\s+(top|right|bottom|left|t|r|b|l|tl|tr|bl|br)\b/)
  if (dirMatch && directionalProperties.has(name)) {
    consumed += dirMatch[0].length
    remaining = str.substring(consumed)
    value = dirMatch[1]
  }

  // Check if this is a boolean property (no value)
  const nextChar = remaining.trimStart()[0]
  if (!nextChar || nextChar === ',' || isBooleanProperty(name)) {
    // Consume trailing whitespace before comma
    const wsMatch = remaining.match(/^(\s*)(?=,|$)/)
    if (wsMatch) {
      consumed += wsMatch[1].length
    }
    return { name, value, consumed, isBoolean: true }
  }

  // Parse value(s)
  // Skip whitespace between name and value
  const wsBeforeValue = remaining.match(/^(\s+)/)
  if (wsBeforeValue) {
    consumed += wsBeforeValue[0].length
    remaining = str.substring(consumed)
  }

  // Collect value parts until comma or end
  // Handle: single value, multiple values, quoted strings, tokens
  const valueParts: string[] = []

  while (remaining.length > 0) {
    const trimmedRemaining = remaining.trimStart()

    // Stop at comma or end
    if (!trimmedRemaining || trimmedRemaining.startsWith(',')) {
      break
    }

    // Check for quoted string (usually text content, not property value)
    if (trimmedRemaining.startsWith('"') || trimmedRemaining.startsWith("'")) {
      // Only include quoted string if it's the first value part
      // Otherwise it's likely text content
      if (valueParts.length === 0) {
        const quote = trimmedRemaining[0]
        const endQuote = trimmedRemaining.indexOf(quote, 1)
        if (endQuote !== -1) {
          const skipWs = remaining.length - trimmedRemaining.length
          const quotedPart = trimmedRemaining.substring(0, endQuote + 1)
          valueParts.push(quotedPart)
          consumed += skipWs + quotedPart.length
          remaining = str.substring(consumed)
          continue
        }
      }
      break // Text content, not part of this property
    }

    // Match next value token
    const skipWs = remaining.length - trimmedRemaining.length
    const tokenMatch = trimmedRemaining.match(/^([^\s,]+)/)

    if (tokenMatch) {
      const token = tokenMatch[1]

      // Check if this token looks like a property name (start of next property)
      // Property names are lowercase, followed by space+value or comma/end
      if (valueParts.length > 0 && /^[a-z][a-z0-9-]*$/.test(token)) {
        const afterToken = trimmedRemaining.substring(token.length)
        // If followed by space and non-comma, or is boolean property, it's a new property
        if (afterToken.match(/^\s+[^,]/) || isBooleanProperty(token)) {
          break
        }
      }

      valueParts.push(token)
      consumed += skipWs + token.length
      remaining = str.substring(consumed)
    } else {
      break
    }
  }

  value = valueParts.join(' ')

  return { name, value, consumed, isBoolean: false }
}

/**
 * Update a property in a parsed line
 */
export function updatePropertyInLine(
  parsedLine: ParsedLine,
  propName: string,
  newValue: string
): string {
  const canonicalName = getCanonicalName(propName)

  // Find the property (by canonical name)
  const propIndex = parsedLine.properties.findIndex(p => p.canonicalName === canonicalName)

  if (propIndex === -1) {
    // Property doesn't exist, add it
    return addPropertyToLine(parsedLine, propName, newValue)
  }

  const prop = parsedLine.properties[propIndex]
  const line = parsedLine.original

  // Build replacement
  let replacement: string
  if (newValue === '' || newValue === 'true') {
    // Boolean property
    replacement = prop.name
  } else {
    replacement = `${prop.name} ${newValue}`
  }

  // Replace in line
  const before = line.substring(0, prop.startIndex)
  const after = line.substring(prop.endIndex)

  return before + replacement + after
}

/**
 * Add a new property to a line. If the property already exists with the
 * same canonical name and the same value, return the line unchanged so that
 * idempotent operations (e.g. dropping into a center-aligned container that
 * already has `center`) don't produce duplicate directives.
 */
export function addPropertyToLine(parsedLine: ParsedLine, propName: string, value: string): string {
  const canonicalName = getCanonicalName(propName)
  const existing = parsedLine.properties.find(p => p.canonicalName === canonicalName)
  if (existing) {
    const existingValue = existing.value ?? ''
    const isStandalone = (value === '' || value === 'true') && existingValue === ''
    if (isStandalone || existingValue === value) {
      return parsedLine.original.trimEnd()
    }
  }

  const line = parsedLine.original.trimEnd()

  // Format the new property
  let propStr: string
  if (value === '' || value === 'true') {
    propStr = propName
  } else {
    propStr = `${propName} ${value}`
  }

  // Add with comma separator if there are existing properties
  if (parsedLine.properties.length > 0 || parsedLine.textContent) {
    return `${line}, ${propStr}`
  } else {
    return `${line} ${propStr}`
  }
}

/**
 * Remove a property from a line
 */
export function removePropertyFromLine(parsedLine: ParsedLine, propName: string): string {
  const canonicalName = getCanonicalName(propName)

  // Find the property
  const propIndex = parsedLine.properties.findIndex(p => p.canonicalName === canonicalName)

  if (propIndex === -1) {
    return parsedLine.original
  }

  const prop = parsedLine.properties[propIndex]
  const line = parsedLine.original

  // Determine what to remove (including surrounding comma/whitespace)
  let startRemove = prop.startIndex
  let endRemove = prop.endIndex

  // Look for comma before or after to remove
  const before = line.substring(0, prop.startIndex)
  const after = line.substring(prop.endIndex)

  // Remove preceding comma and whitespace
  const precedingMatch = before.match(/,\s*$/)
  if (precedingMatch) {
    startRemove -= precedingMatch[0].length
  } else {
    // Remove following comma and whitespace
    const followingMatch = after.match(/^\s*,\s*/)
    if (followingMatch) {
      endRemove += followingMatch[0].length
    }
  }

  return line.substring(0, startRemove) + line.substring(endRemove)
}

/**
 * Find a property in a line by name (supports aliases)
 */
export function findPropertyInLine(
  parsedLine: ParsedLine,
  propName: string
): ParsedProperty | null {
  const canonicalName = getCanonicalName(propName)
  return parsedLine.properties.find(p => p.canonicalName === canonicalName) || null
}

/**
 * Get property value from a line (supports aliases)
 */
export function getPropertyValue(parsedLine: ParsedLine, propName: string): string | null {
  const prop = findPropertyInLine(parsedLine, propName)
  return prop ? prop.value : null
}
