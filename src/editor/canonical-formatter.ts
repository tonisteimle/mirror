/**
 * Canonical Formatter
 *
 * Shared formatting logic for converting Mirror DSL shorthand to canonical block form.
 * Used by both expand-on-enter (single line) and format-on-blur (full document).
 */

import { preprocess } from '../parser/preprocessor'

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the base indentation of a line (leading whitespace)
 */
export function getIndent(line: string): string {
  const match = line.match(/^(\s*)/)
  return match ? match[1] : ''
}

/**
 * Split a string by commas, but respect quoted strings
 */
export function splitByComma(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (char === ',' && !inString) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

// =============================================================================
// LINE DETECTION
// =============================================================================

/** Short property names that indicate expandable content */
const SHORT_PROPS_PATTERN = /\b(p|pad|bg|col|c|rad|bor|hor|ver|cen|fs|ts|is|iw|ic|mar|m|g|w|h|minw|maxw|minh|maxh|opa|rot|boc)\b/

/** Keywords that start blocks we should NOT expand */
const BLOCK_KEYWORDS = /^(hover|focus|active|disabled|state|events?|if|else|each|data)\b/

/** Lines that should never be expanded */
const SKIP_PATTERNS = {
  empty: /^\s*$/,
  comment: /^\s*\/\//,
  token: /^\s*\$/,
  blockKeyword: BLOCK_KEYWORDS,
}

/**
 * Check if a line contains expandable shorthand syntax
 */
export function isExpandableLine(line: string): boolean {
  const trimmed = line.trim()
  const indent = getIndent(line)

  // Skip empty lines, comments, token definitions
  if (!trimmed || SKIP_PATTERNS.comment.test(line) || SKIP_PATTERNS.token.test(line)) {
    return false
  }

  // Skip block keywords (hover, state, events, if, etc.)
  if (SKIP_PATTERNS.blockKeyword.test(trimmed)) {
    return false
  }

  // Skip lines that are already just property definitions (indented, single property)
  if (indent.length >= 2 && !trimmed.includes(',')) {
    // Check if it's a short property name that needs expansion
    const shortPropStart = /^(p|pad|bg|col|c|rad|bor|hor|ver|fs|ts|is|iw|ic|mar|m|g|w|h|minw|maxw|minh|maxh|opa|rot)\s/
    if (!shortPropStart.test(trimmed)) {
      return false
    }
  }

  // Has comma-separated properties (inline syntax)
  if (trimmed.includes(',')) {
    // Make sure it's not just a string with commas
    const beforeString = trimmed.split('"')[0]
    if (beforeString.includes(',')) {
      return true
    }
  }

  // Has short property names
  if (SHORT_PROPS_PATTERN.test(trimmed)) {
    return true
  }

  // Has dimension sugar: ComponentName followed by number(s)
  const dimensionSugar = /^[A-Z][a-zA-Z]*\s+\d+/
  if (dimensionSugar.test(trimmed)) {
    return true
  }

  return false
}

// =============================================================================
// SINGLE LINE EXPANSION
// =============================================================================

/**
 * Convert a single line from inline to block syntax
 *
 * Input:  "Button padding 16, background #333"
 * Output: "Button\n  padding 16\n  background #333"
 */
export function expandLineToBlock(line: string): string {
  const baseIndent = getIndent(line)
  const trimmed = line.trim()
  const propertyIndent = baseIndent + '  '

  // First preprocess to normalize property names
  const preprocessed = preprocess(trimmed)

  // Check if line has component + properties pattern
  // ComponentName prop1 value1, prop2 value2
  const componentMatch = preprocessed.match(/^([A-Z][a-zA-Z0-9]*:?)\s+(.+)$/)

  if (!componentMatch) {
    // Not a component line, just return preprocessed with indent
    return baseIndent + preprocessed
  }

  const [, componentPart, rest] = componentMatch

  // Check if rest contains comma-separated properties
  if (rest.includes(',')) {
    const properties = splitByComma(rest)
    const result: string[] = [baseIndent + componentPart]

    for (const prop of properties) {
      const trimmedProp = prop.trim()
      if (trimmedProp) {
        result.push(propertyIndent + trimmedProp)
      }
    }

    return result.join('\n')
  }

  // Single property - expand to block if it's not just a string
  const isJustString = /^"[^"]*"$/.test(rest.trim())
  if (isJustString) {
    // Keep string on same line as component
    return baseIndent + preprocessed
  }

  // Expand single property to block
  return baseIndent + componentPart + '\n' + propertyIndent + rest
}

// =============================================================================
// DOCUMENT FORMATTING
// =============================================================================

/**
 * Format an entire document to canonical block form.
 * Preserves structure while expanding inline syntax.
 */
export function formatDocument(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Preserve empty lines
    if (!trimmed) {
      result.push(line)
      i++
      continue
    }

    // Preserve comments
    if (trimmed.startsWith('//')) {
      result.push(line)
      i++
      continue
    }

    // Preserve token definitions (but preprocess them)
    if (trimmed.startsWith('$')) {
      result.push(getIndent(line) + preprocess(trimmed))
      i++
      continue
    }

    // Check if this line starts a block we should preserve as-is
    // (hover, state, events, if, else, each)
    if (BLOCK_KEYWORDS.test(trimmed)) {
      result.push(getIndent(line) + preprocess(trimmed))
      i++
      continue
    }

    // Check if this is an expandable line
    if (isExpandableLine(line)) {
      const expanded = expandLineToBlock(line)
      result.push(expanded)
      i++
      continue
    }

    // Default: preprocess the line but keep structure
    result.push(getIndent(line) + preprocess(trimmed))
    i++
  }

  return result.join('\n')
}

/**
 * Check if formatting would change the document
 */
export function needsFormatting(content: string): boolean {
  const formatted = formatDocument(content)
  return formatted !== content
}
