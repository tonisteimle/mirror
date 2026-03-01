/**
 * @module dsl/normalizer
 * @description Normalizes Mirror DSL code to canonical (long) form
 *
 * This normalizer converts short forms to long forms for:
 * - Property names (pad -> padding, bg -> background)
 * - Directions (l -> left, u -> top)
 * - Corners (tl -> top-left)
 *
 * This enables semantic comparison of DSL code regardless of the form used.
 */

import {
  DSL_SCHEMA,
  getPropertyDefinitionByAnyName,
  normalizePropertyName,
  normalizeDirectionToLong,
  normalizeDirectionComboToLong,
  normalizeCornerToLong,
  supportsDirections,
  supportsCorners,
} from './dsl-schema'

// =============================================================================
// TOKEN TYPES FOR NORMALIZATION
// =============================================================================

interface Token {
  type: 'property' | 'direction' | 'corner' | 'value' | 'string' | 'color' | 'token' | 'number' | 'keyword' | 'operator' | 'newline' | 'indent' | 'comment' | 'component' | 'colon' | 'comma' | 'unknown'
  value: string
  raw: string
}

// =============================================================================
// LEXER
// =============================================================================

/**
 * Simple lexer to tokenize Mirror DSL code
 */
function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < code.length) {
    const char = code[pos]

    // Newline
    if (char === '\n') {
      tokens.push({ type: 'newline', value: '\n', raw: '\n' })
      pos++
      continue
    }

    // Whitespace (not newline) - track indentation at start of line
    if (/\s/.test(char)) {
      let spaces = ''
      while (pos < code.length && /[ \t]/.test(code[pos])) {
        spaces += code[pos]
        pos++
      }
      // Only add indent token if after newline or at start
      if (tokens.length === 0 || tokens[tokens.length - 1].type === 'newline') {
        if (spaces.length > 0) {
          tokens.push({ type: 'indent', value: spaces, raw: spaces })
        }
      }
      // Otherwise skip whitespace
      continue
    }

    // Comment
    if (char === '/' && code[pos + 1] === '/') {
      let comment = ''
      while (pos < code.length && code[pos] !== '\n') {
        comment += code[pos]
        pos++
      }
      tokens.push({ type: 'comment', value: comment, raw: comment })
      continue
    }

    // String (double or single quoted)
    if (char === '"' || char === "'") {
      const quote = char
      let str = quote
      pos++
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === '\\' && pos + 1 < code.length) {
          str += code[pos] + code[pos + 1]
          pos += 2
        } else {
          str += code[pos]
          pos++
        }
      }
      if (pos < code.length) {
        str += code[pos]
        pos++
      }
      tokens.push({ type: 'string', value: str, raw: str })
      continue
    }

    // Colon
    if (char === ':') {
      tokens.push({ type: 'colon', value: ':', raw: ':' })
      pos++
      continue
    }

    // Comma
    if (char === ',') {
      tokens.push({ type: 'comma', value: ',', raw: ',' })
      pos++
      continue
    }

    // Color (hex)
    if (char === '#') {
      let color = '#'
      pos++
      while (pos < code.length && /[0-9a-fA-F]/.test(code[pos])) {
        color += code[pos]
        pos++
      }
      tokens.push({ type: 'color', value: color, raw: color })
      continue
    }

    // Token reference ($name)
    if (char === '$') {
      let tokenRef = '$'
      pos++
      while (pos < code.length && /[\w.-]/.test(code[pos])) {
        tokenRef += code[pos]
        pos++
      }
      tokens.push({ type: 'token', value: tokenRef, raw: tokenRef })
      continue
    }

    // Number (including negative and decimal)
    // Must come BEFORE operators so -0.1 is parsed as number, not operator + number
    if (/[0-9]/.test(char) || (char === '-' && pos + 1 < code.length && /[0-9.]/.test(code[pos + 1]))) {
      let num = ''
      if (char === '-') {
        num = '-'
        pos++
      }
      while (pos < code.length && /[0-9.]/.test(code[pos])) {
        num += code[pos]
        pos++
      }
      // Check for percentage
      if (pos < code.length && code[pos] === '%') {
        num += '%'
        pos++
      }
      tokens.push({ type: 'number', value: num, raw: num })
      continue
    }

    // Operators (after number check so -0.1 is parsed correctly)
    if (/[=<>!+\-*/%]/.test(char)) {
      let op = char
      pos++
      // Handle multi-char operators (==, !=, >=, <=)
      if (pos < code.length && /[=]/.test(code[pos])) {
        op += code[pos]
        pos++
      }
      tokens.push({ type: 'operator', value: op, raw: op })
      continue
    }

    // Word (property, keyword, component name, direction, etc.)
    if (/[\w-]/.test(char)) {
      let word = ''
      while (pos < code.length && /[\w-]/.test(code[pos])) {
        word += code[pos]
        pos++
      }
      // Classify the word
      const type = classifyWord(word)
      tokens.push({ type, value: word, raw: word })
      continue
    }

    // Unknown character
    tokens.push({ type: 'unknown', value: char, raw: char })
    pos++
  }

  return tokens
}

/**
 * Classify a word token
 *
 * Note: For words that can be both properties and directions (left, right, top, bottom),
 * we classify them as 'direction' since context-aware processing happens later.
 */
function classifyWord(word: string): Token['type'] {
  // First, check if it's a corner - corners are unambiguous
  if (isCorner(word)) {
    return 'corner'
  }

  // Check if it's a direction - do this BEFORE property check
  // because left/right/top/bottom can be both, and we handle context later
  if (isDirection(word)) {
    return 'direction'
  }

  // Check if it's a property (short or long form)
  const propDef = getPropertyDefinitionByAnyName(word)
  if (propDef) {
    return 'property'
  }

  // Check if it starts with uppercase (component name)
  if (/^[A-Z]/.test(word)) {
    return 'component'
  }

  // Keywords and other values
  return 'keyword'
}

/**
 * Check if a word is a direction (short or long form)
 */
function isDirection(word: string): boolean {
  const singleDirs = ['l', 'r', 'u', 'd', 't', 'b', 'left', 'right', 'top', 'bottom']
  if (singleDirs.includes(word)) return true

  // Check for combos
  if (word.includes('-')) {
    const parts = word.split('-')
    return parts.every((p) => singleDirs.includes(p))
  }

  // Short combo like 'lr', 'ud'
  if (/^[lrudtb]+$/.test(word) && word.length > 1 && !isCorner(word)) {
    return true
  }

  return false
}

/**
 * Check if a word is a corner
 */
function isCorner(word: string): boolean {
  const corners = ['tl', 'tr', 'bl', 'br', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
  return corners.includes(word)
}

// =============================================================================
// NORMALIZER
// =============================================================================

/**
 * Normalize Mirror DSL code to canonical (long) form
 *
 * Converts:
 * - pad 12 -> padding 12
 * - bg #333 -> background #333
 * - pad l 8 -> padding left 8
 * - rad tl 8 -> radius top-left 8
 * - hor -> horizontal
 *
 * @param code - Mirror DSL code to normalize
 * @returns Normalized code with long forms
 */
export function normalize(code: string): string {
  const tokens = tokenize(code)
  const result: string[] = []

  let i = 0
  let lastPropertyDef: ReturnType<typeof getPropertyDefinitionByAnyName> | undefined

  while (i < tokens.length) {
    const token = tokens[i]

    switch (token.type) {
      case 'property': {
        // Normalize property name to long form
        const normalizedName = normalizePropertyName(token.value)
        result.push(normalizedName)
        lastPropertyDef = getPropertyDefinitionByAnyName(token.value)
        i++
        break
      }

      case 'direction': {
        // Check if this is a direction after a directional property
        if (lastPropertyDef && supportsDirections(lastPropertyDef.name)) {
          const normalizedDir = normalizeDirectionComboToLong(token.value)
          result.push(' ' + normalizedDir)
        } else {
          // Standalone direction words like 'left', 'right', 'top', 'bottom'
          // at line start are alignment properties
          const alignmentMap: Record<string, string> = {
            'left': 'horizontal-left',
            'right': 'horizontal-right',
            'top': 'vertical-top',
            'bottom': 'vertical-bottom',
          }
          const alignProp = alignmentMap[token.value]
          if (alignProp && !lastPropertyDef) {
            // At line start, treat as alignment property
            result.push(alignProp)
            lastPropertyDef = getPropertyDefinitionByAnyName(alignProp)
          } else {
            // After a non-directional property, just output as-is
            result.push(' ' + token.value)
          }
        }
        i++
        break
      }

      case 'corner': {
        // Only normalize if the previous property supports corners
        if (lastPropertyDef && supportsCorners(lastPropertyDef.name)) {
          const normalizedCorner = normalizeCornerToLong(token.value)
          result.push(' ' + normalizedCorner)
        } else {
          result.push(' ' + token.value)
        }
        i++
        break
      }

      case 'newline':
        result.push('\n')
        lastPropertyDef = undefined
        i++
        break

      case 'indent':
        result.push(token.value)
        i++
        break

      case 'comma':
        result.push(', ')
        i++
        break

      case 'colon':
        result.push(':')
        i++
        break

      case 'comment':
        result.push(token.value)
        i++
        break

      case 'component':
        result.push(token.value)
        lastPropertyDef = undefined
        i++
        break

      case 'string':
      case 'color':
      case 'token':
      case 'number':
      case 'operator':
      case 'keyword':
        result.push(' ' + token.value)
        i++
        break

      default:
        result.push(token.value)
        i++
    }
  }

  // Clean up multiple spaces within lines (not indentation)
  // This preserves leading whitespace on each line but collapses multiple spaces elsewhere
  return result.join('').split('\n').map(line => {
    const match = line.match(/^(\s*)(.*)$/)
    if (!match) return line
    const [, indent, content] = match
    return indent + content.replace(/ +/g, ' ').trim()
  }).join('\n')
}

/**
 * Normalize a single property line
 *
 * @param line - A single property line (e.g., "pad l 8" or "bg #333")
 * @returns Normalized line
 */
export function normalizeLine(line: string): string {
  return normalize(line)
}

/**
 * Normalize property name only (without values)
 *
 * @param prop - Property name (short or long form)
 * @returns Normalized (long form) property name
 */
export function normalizeProperty(prop: string): string {
  return normalizePropertyName(prop)
}

/**
 * Compare two DSL code snippets semantically
 *
 * Returns true if they are equivalent after normalization
 *
 * @param code1 - First DSL code
 * @param code2 - Second DSL code
 * @returns Whether the codes are semantically equivalent
 */
export function areEquivalent(code1: string, code2: string): boolean {
  const normalized1 = normalize(code1)
  const normalized2 = normalize(code2)
  return normalized1 === normalized2
}

/**
 * Get the difference between two normalized DSL codes
 *
 * @param expected - Expected DSL code
 * @param actual - Actual DSL code
 * @returns Object with normalized forms and whether they match
 */
export function compare(
  expected: string,
  actual: string
): {
  normalizedExpected: string
  normalizedActual: string
  isEquivalent: boolean
  differences: string[]
} {
  const normalizedExpected = normalize(expected)
  const normalizedActual = normalize(actual)

  const expectedLines = normalizedExpected.split('\n').filter((l) => l.trim())
  const actualLines = normalizedActual.split('\n').filter((l) => l.trim())

  const differences: string[] = []

  // Find lines in expected but not in actual
  for (const line of expectedLines) {
    if (!actualLines.includes(line)) {
      differences.push(`- ${line}`)
    }
  }

  // Find lines in actual but not in expected
  for (const line of actualLines) {
    if (!expectedLines.includes(line)) {
      differences.push(`+ ${line}`)
    }
  }

  return {
    normalizedExpected,
    normalizedActual,
    isEquivalent: normalizedExpected === normalizedActual,
    differences,
  }
}

// =============================================================================
// PROPERTY EXTRACTION
// =============================================================================

export interface ExtractedProperty {
  name: string          // Normalized (long form) property name
  value: string | number | boolean
  direction?: string    // Normalized direction (if applicable)
  corner?: string       // Normalized corner (if applicable)
  raw: string           // Original raw string
}

/**
 * Extract properties from a DSL code line
 *
 * @param line - A single line of DSL code
 * @returns Array of extracted properties
 */
export function extractProperties(line: string): ExtractedProperty[] {
  const tokens = tokenize(line)
  const properties: ExtractedProperty[] = []

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'property') {
      const propName = normalizePropertyName(token.value)
      const propDef = getPropertyDefinitionByAnyName(token.value)
      const rawParts = [token.value]

      let direction: string | undefined
      let corner: string | undefined
      let value: string | number | boolean = true // Default for boolean properties

      i++

      // Check for direction/corner/value
      while (i < tokens.length) {
        const next = tokens[i]

        if (next.type === 'direction' && propDef && supportsDirections(propDef.name)) {
          direction = normalizeDirectionComboToLong(next.value)
          rawParts.push(next.value)
          i++
        } else if (next.type === 'corner' && propDef && supportsCorners(propDef.name)) {
          corner = normalizeCornerToLong(next.value)
          rawParts.push(next.value)
          i++
        } else if (next.type === 'number') {
          value = parseFloat(next.value) || next.value
          rawParts.push(next.value)
          i++
          break
        } else if (next.type === 'color' || next.type === 'token' || next.type === 'string') {
          value = next.value
          rawParts.push(next.value)
          i++
          break
        } else if (next.type === 'keyword') {
          value = next.value
          rawParts.push(next.value)
          i++
          break
        } else if (next.type === 'property') {
          // Check if this property name is a valid enum value for the current property
          // This handles cases like "cursor pointer" where "pointer" is both a property
          // and an enum value for "cursor"
          if (propDef?.enumValues?.includes(next.value)) {
            value = next.value
            rawParts.push(next.value)
            i++
            break
          }
          // Otherwise, this is the start of a new property, stop here
          break
        } else if (next.type === 'comma' || next.type === 'newline') {
          break
        } else {
          break
        }
      }

      properties.push({
        name: propName,
        value,
        direction,
        corner,
        raw: rawParts.join(' '),
      })
    } else {
      i++
    }
  }

  return properties
}
