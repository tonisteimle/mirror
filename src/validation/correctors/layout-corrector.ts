/**
 * Layout tab corrector - removes properties that don't belong in layout
 */

import type { Correction } from '../types'
import { KNOWN_PROPERTIES, DIRECTIONS, isDirectionOrCombo } from '../types'
import { structureConfidence } from '../utils/confidence'

// CSS property names that should be removed from layout
const CSS_PROPERTIES = new Set([
  'padding', 'margin', 'background', 'background-color', 'backgroundcolor',
  'color', 'border', 'border-radius', 'borderradius', 'radius',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'minwidth', 'maxwidth', 'minheight', 'maxheight',
  'font-size', 'fontsize', 'font-weight', 'fontweight',
  'flex-direction', 'flexdirection', 'justify-content', 'justifycontent',
  'align-items', 'alignitems', 'flex-wrap', 'flexwrap', 'flex-grow', 'flexgrow',
  'display', 'position', 'top', 'left', 'right', 'bottom',
  'overflow', 'z-index', 'zindex', 'opacity', 'transform',
  'row', 'column', 'horizontal', 'vertical', 'center', 'space-between'
])

export interface LayoutCorrectionResult {
  correctedLine: string
  removedProperties: string[]
  corrections: Correction[]
}

/**
 * Check if a token is a property or property-related value
 */
function isPropertyToken(token: string): boolean {
  const lower = token.toLowerCase()

  // Direct property match
  if (KNOWN_PROPERTIES.has(lower)) {
    return true
  }

  // CSS property names
  if (CSS_PROPERTIES.has(lower)) {
    return true
  }

  // Direction or direction combo (l, r, u, d, l-r, u-d, etc.)
  if (DIRECTIONS.has(lower) || isDirectionOrCombo(lower)) {
    return true
  }

  // Number (property value)
  if (/^\d+$/.test(token)) {
    return true
  }

  // Number with unit (12px, 1rem, etc.)
  if (/^\d+(px|rem|em|%|vh|vw)$/.test(token)) {
    return true
  }

  // Color (property value) - but not if it looks like a component name
  if (/^#[0-9A-Fa-f]+$/.test(token)) {
    return true
  }

  // RGB/HSL color values
  if (/^(rgb|hsl)a?\s*\(/.test(lower)) {
    return true
  }

  return false
}

/**
 * Detect if a token is a component name
 */
function isComponentName(token: string): boolean {
  // Component names start with uppercase and contain only alphanumeric
  return /^[A-Z][a-zA-Z0-9]*$/.test(token)
}

/**
 * Detect if a token is a string content
 */
function isStringContent(token: string): boolean {
  return token.startsWith('"') && token.endsWith('"')
}

/**
 * Correct a layout line by removing properties
 * Layout should only have: ComponentName [SlotName "content"]* ["content"]
 */
export function correctLayoutLine(line: string, lineNumber: number): LayoutCorrectionResult {
  const trimmed = line.trim()
  const leadingWhitespace = line.match(/^(\s*)/)?.[1] || ''

  if (!trimmed) {
    return { correctedLine: line, removedProperties: [], corrections: [] }
  }

  // Parse line into tokens, preserving quoted strings
  const tokens: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (char === '"') {
      if (inQuote) {
        current += char
        tokens.push(current)
        current = ''
        inQuote = false
      } else {
        if (current) tokens.push(current)
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
  if (current) tokens.push(current)

  // First token should be component name
  if (tokens.length === 0 || !isComponentName(tokens[0])) {
    // This line might be completely invalid for layout
    return { correctedLine: line, removedProperties: [], corrections: [] }
  }

  const result: string[] = [tokens[0]]
  const removedProperties: string[] = []
  const corrections: Correction[] = []

  let i = 1
  while (i < tokens.length) {
    const token = tokens[i]

    // Check for 'from' keyword - this is valid in layout
    if (token.toLowerCase() === 'from') {
      result.push(token)
      i++
      // Next should be component name
      if (i < tokens.length && isComponentName(tokens[i])) {
        result.push(tokens[i])
        i++
      }
      continue
    }

    // String content - keep it
    if (isStringContent(token)) {
      result.push(token)
      i++
      continue
    }

    // Slot name (component name followed by string)
    if (isComponentName(token)) {
      result.push(token)
      i++
      // Check if next is string content
      if (i < tokens.length && isStringContent(tokens[i])) {
        result.push(tokens[i])
        i++
      }
      continue
    }

    // Property or property value - remove it
    if (isPropertyToken(token)) {
      removedProperties.push(token)
      i++
      continue
    }

    // Unknown token - keep it (might be valid)
    result.push(token)
    i++
  }

  const correctedLine = leadingWhitespace + result.join(' ')

  if (removedProperties.length > 0) {
    corrections.push({
      tab: 'layout',
      line: lineNumber,
      original: trimmed,
      corrected: result.join(' '),
      reason: `Removed properties from layout: ${removedProperties.join(', ')}`,
      confidence: structureConfidence('remove_property')
    })
  }

  return { correctedLine, removedProperties, corrections }
}

/**
 * Check if a line has properties (should trigger correction)
 */
export function layoutLineHasProperties(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Parse tokens
  const tokens = trimmed.split(/\s+/).filter(t => !t.startsWith('"'))

  // Skip first token (component name)
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase()

    // Skip 'from' and component names
    if (token === 'from') continue
    if (isComponentName(tokens[i])) continue

    // Check if it's a property
    if (KNOWN_PROPERTIES.has(token)) {
      return true
    }

    // Check if it's a number (likely property value)
    if (/^\d+$/.test(token)) {
      return true
    }

    // Check if it's a color
    if (/^#[0-9A-Fa-f]+$/.test(tokens[i])) {
      return true
    }
  }

  return false
}
