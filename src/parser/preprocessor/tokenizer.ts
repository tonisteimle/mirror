/**
 * @module parser/preprocessor/tokenizer
 * @description Lightweight tokenizer for preprocessing
 *
 * Produces tokens that the preprocessor uses to normalize and transform.
 * This is simpler than the main parser's lexer - focused on categorization.
 *
 * Keywords imported from central source: src/dsl/properties.ts
 */

import { DSL_SCHEMA, getPropertyDefinitionByAnyName, supportsDirections, supportsCorners } from '../../dsl/dsl-schema'
import {
  EVENT_KEYWORDS,
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  ACTION_KEYWORDS,
  CONTROL_KEYWORDS,
  DIRECTIONS,
  LONG_DIRECTIONS,
  DIRECTION_COMBOS,
  CORNER_DIRECTIONS,
  KEYWORDS,
  BEHAVIOR_TARGETS,
  TIMING_MODIFIERS,
  ANIMATION_KEYWORDS,
  POSITION_KEYWORDS,
  PROPERTY_KEYWORD_VALUES,
} from '../../dsl/properties'

// =============================================================================
// TOKEN TYPES
// =============================================================================

export type TokenType =
  | 'COMPONENT'      // PascalCase names (Button, Card, MyComponent)
  | 'COMPONENT_DEF'  // Component definition (Button:)
  | 'COMPONENT_REF'  // Component property reference (Base.bg, Card.padding)
  | 'PROPERTY'       // Property names (padding, pad, bg)
  | 'DIRECTION'      // Directions (left, l, top-bottom)
  | 'CORNER'         // Corners (top-left, tl)
  | 'NUMBER'         // Numeric values (12, 0.5, 100%)
  | 'COLOR'          // Hex colors (#333, #3B82F6)
  | 'STRING'         // Quoted strings ("text", 'text')
  | 'TOKEN_REF'      // Token references ($primary, $spacing.md)
  | 'TOKEN_DEF'      // Token definition ($name:)
  | 'KEYWORD'        // Keywords (hug, full, true, false)
  | 'EVENT'          // Events (onclick, onhover)
  | 'STATE'          // States (hover, focus, active)
  | 'ACTION'         // Actions (show, hide, toggle)
  | 'CONTROL'        // Control flow (if, else, each, in)
  | 'OPERATOR'       // Operators (==, !=, >, <)
  | 'COMMA'          // ,
  | 'COLON'          // :
  | 'SEMICOLON'      // ;
  | 'NEWLINE'        // \n
  | 'INDENT'         // Leading whitespace
  | 'COMMENT'        // // comment
  | 'UNKNOWN'        // Unrecognized

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
  indent: number      // Indentation level (in spaces)
}

// =============================================================================
// KEYWORD SETS (imported from properties.ts, combined here for preprocessor use)
// =============================================================================

// Combined states (system + behavior)
const STATES = new Set([...SYSTEM_STATES, ...BEHAVIOR_STATES])

// Combined directions (short + long + combos)
const ALL_DIRECTIONS = new Set([...DIRECTIONS, ...LONG_DIRECTIONS, ...DIRECTION_COMBOS])

// Combined keywords for preprocessor (all keyword-like values)
const PREPROCESSOR_KEYWORDS = new Set([
  ...KEYWORDS,
  ...BEHAVIOR_TARGETS,
  ...TIMING_MODIFIERS,
  ...ANIMATION_KEYWORDS,
  ...POSITION_KEYWORDS,
  ...PROPERTY_KEYWORD_VALUES,
  // Additional preprocessor-specific keywords
  'hug', 'full', 'true', 'false', 'null',
  'solid', 'dashed', 'dotted', 'bold', 'normal', 'italic',
  'spread', 'wrap', 'stacked',
  'data', 'state', 'events', 'animate',
])

// =============================================================================
// TOKENIZER
// =============================================================================

/**
 * Tokenize Mirror DSL code
 */
export function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  const lines = code.split('\n')

  let lineNum = 1
  let lastPropertyDef: ReturnType<typeof getPropertyDefinitionByAnyName> | undefined

  // State for multiline strings
  let inMultilineString = false
  let multilineStringStart = 0
  let multilineStringColumn = 0
  let multilineStringIndent = 0
  let multilineStringContent = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // If we're inside a multiline string, accumulate content
    if (inMultilineString) {
      const closingQuoteIdx = line.indexOf("'")
      if (closingQuoteIdx !== -1) {
        // Found closing quote
        multilineStringContent += line.slice(0, closingQuoteIdx)
        tokens.push({
          type: 'STRING',
          value: "'" + multilineStringContent + "'",
          line: multilineStringStart,
          column: multilineStringColumn,
          indent: multilineStringIndent,
        })
        inMultilineString = false

        // Process rest of line after the closing quote
        const restOfLine = line.slice(closingQuoteIdx + 1)
        if (restOfLine.trim()) {
          const restTokens = tokenizeLine(restOfLine, lineNum, lastPropertyDef)
          tokens.push(...restTokens)
        }
      } else {
        // Continue accumulating
        multilineStringContent += line + '\n'
      }

      // Add newline token
      if (lineNum < lines.length || line.trim()) {
        tokens.push({
          type: 'NEWLINE',
          value: '\n',
          line: lineNum,
          column: line.length + 1,
          indent: 0,
        })
      }
      lineNum++
      continue
    }

    // Check if line starts a multiline string (single quote not closed on same line)
    const singleQuoteStart = findUnterminatedSingleQuote(line)
    if (singleQuoteStart !== null) {
      // Tokenize everything before the quote
      const beforeQuote = line.slice(0, singleQuoteStart)
      if (beforeQuote.trim()) {
        const beforeTokens = tokenizeLine(beforeQuote, lineNum, lastPropertyDef)
        tokens.push(...beforeTokens)
        const propToken = beforeTokens.find(t => t.type === 'PROPERTY')
        if (propToken) {
          lastPropertyDef = getPropertyDefinitionByAnyName(propToken.value)
        }
      }

      // Start multiline string accumulation
      inMultilineString = true
      multilineStringStart = lineNum
      multilineStringColumn = singleQuoteStart + 1
      multilineStringIndent = line.match(/^([ \t]*)/)?.[1]?.replace(/\t/g, '  ')?.length ?? 0
      multilineStringContent = line.slice(singleQuoteStart + 1) + '\n'

      // Add newline token
      if (lineNum < lines.length || line.trim()) {
        tokens.push({
          type: 'NEWLINE',
          value: '\n',
          line: lineNum,
          column: line.length + 1,
          indent: 0,
        })
      }
      lineNum++
      continue
    }

    // Normal line processing
    const lineTokens = tokenizeLine(line, lineNum, lastPropertyDef)
    tokens.push(...lineTokens)

    // Track last property for direction/corner context
    const propToken = lineTokens.find(t => t.type === 'PROPERTY')
    if (propToken) {
      lastPropertyDef = getPropertyDefinitionByAnyName(propToken.value)
    }

    // Add newline token (except for last line if empty)
    if (lineNum < lines.length || line.trim()) {
      tokens.push({
        type: 'NEWLINE',
        value: '\n',
        line: lineNum,
        column: line.length + 1,
        indent: 0,
      })
    }

    lineNum++
    // Reset property context at newline
    lastPropertyDef = undefined
  }

  return tokens
}

/**
 * Find an unterminated single quote on a line (starts but doesn't end)
 * Returns the position of the opening quote, or null if line is complete
 */
function findUnterminatedSingleQuote(line: string): number | null {
  let inString = false
  let stringChar = ''

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inString) {
      if (char === '\\' && i + 1 < line.length) {
        i++ // Skip escaped char
        continue
      }
      if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    } else {
      if (char === '"') {
        // Double quotes are single-line only
        inString = true
        stringChar = '"'
      } else if (char === "'") {
        // Single quote starts - check if it closes on this line
        let j = i + 1
        let foundClose = false
        while (j < line.length) {
          if (line[j] === '\\' && j + 1 < line.length) {
            j += 2
            continue
          }
          if (line[j] === "'") {
            foundClose = true
            break
          }
          j++
        }
        if (!foundClose) {
          return i // Unterminated single quote
        }
        // Skip past the closed string
        inString = true
        stringChar = "'"
      }
    }
  }

  return null // No unterminated single quote
}

/**
 * Tokenize a single line
 */
function tokenizeLine(
  line: string,
  lineNum: number,
  lastPropertyDef?: ReturnType<typeof getPropertyDefinitionByAnyName>
): Token[] {
  const tokens: Token[] = []
  let pos = 0
  let column = 1

  // Handle leading whitespace (indent)
  const indentMatch = line.match(/^([ \t]*)/)
  const indentStr = indentMatch ? indentMatch[1] : ''
  const indent = indentStr.replace(/\t/g, '  ').length // Convert tabs to 2 spaces

  if (indentStr) {
    tokens.push({
      type: 'INDENT',
      value: indentStr,
      line: lineNum,
      column: 1,
      indent,
    })
    pos = indentStr.length
    column = pos + 1
  }

  // Track property context within line
  let currentPropertyDef = lastPropertyDef

  while (pos < line.length) {
    const char = line[pos]
    const remaining = line.slice(pos)

    // Skip whitespace (non-indent)
    if (/[ \t]/.test(char)) {
      pos++
      column++
      continue
    }

    // Comment
    if (remaining.startsWith('//')) {
      tokens.push({
        type: 'COMMENT',
        value: remaining,
        line: lineNum,
        column,
        indent,
      })
      break
    }

    // String (double or single quoted)
    if (char === '"' || char === "'") {
      const str = parseString(remaining)
      tokens.push({
        type: 'STRING',
        value: str,
        line: lineNum,
        column,
        indent,
      })
      pos += str.length
      column += str.length
      continue
    }

    // Color (hex)
    if (char === '#') {
      const match = remaining.match(/^#[0-9a-fA-F]{3,8}/)
      if (match) {
        tokens.push({
          type: 'COLOR',
          value: match[0],
          line: lineNum,
          column,
          indent,
        })
        pos += match[0].length
        column += match[0].length
        continue
      }
    }

    // Color (rgb/rgba/hsl/hsla)
    if (remaining.match(/^rgba?\s*\(/i) || remaining.match(/^hsla?\s*\(/i)) {
      // Match the entire color function with balanced parentheses
      const colorMatch = remaining.match(/^(rgba?|hsla?)\s*\([^)]+\)/i)
      if (colorMatch) {
        tokens.push({
          type: 'COLOR',
          value: colorMatch[0],
          line: lineNum,
          column,
          indent,
        })
        pos += colorMatch[0].length
        column += colorMatch[0].length
        continue
      }
    }

    // Token reference or definition ($name or $name:)
    if (char === '$') {
      const match = remaining.match(/^\$[\w.-]+:?/)
      if (match) {
        const value = match[0]
        const type = value.endsWith(':') ? 'TOKEN_DEF' : 'TOKEN_REF'
        tokens.push({
          type,
          value,
          line: lineNum,
          column,
          indent,
        })
        pos += value.length
        column += value.length
        continue
      }
    }

    // Number (including negative and percentage)
    if (/[0-9]/.test(char) || (char === '-' && /[0-9.]/.test(line[pos + 1] || ''))) {
      const match = remaining.match(/^-?[0-9]+\.?[0-9]*%?/)
      if (match) {
        tokens.push({
          type: 'NUMBER',
          value: match[0],
          line: lineNum,
          column,
          indent,
        })
        pos += match[0].length
        column += match[0].length
        continue
      }
    }

    // Operators
    if (/[=<>!+\-*/%]/.test(char)) {
      const match = remaining.match(/^(==|!=|>=|<=|[=<>+\-*/%])/)
      if (match) {
        tokens.push({
          type: 'OPERATOR',
          value: match[0],
          line: lineNum,
          column,
          indent,
        })
        pos += match[0].length
        column += match[0].length
        continue
      }
    }

    // Comma
    if (char === ',') {
      tokens.push({
        type: 'COMMA',
        value: ',',
        line: lineNum,
        column,
        indent,
      })
      pos++
      column++
      continue
    }

    // Colon (standalone, not part of definition)
    if (char === ':') {
      tokens.push({
        type: 'COLON',
        value: ':',
        line: lineNum,
        column,
        indent,
      })
      pos++
      column++
      continue
    }

    // Semicolon
    if (char === ';') {
      tokens.push({
        type: 'SEMICOLON',
        value: ';',
        line: lineNum,
        column,
        indent,
      })
      pos++
      column++
      continue
    }

    // Component reference (Base.property) - must check before regular word
    if (/[A-Z]/.test(char)) {
      const refMatch = remaining.match(/^[A-Z][a-zA-Z0-9]*\.[a-z][\w-]*/)
      if (refMatch) {
        tokens.push({
          type: 'COMPONENT_REF',
          value: refMatch[0],
          line: lineNum,
          column,
          indent,
        })
        pos += refMatch[0].length
        column += refMatch[0].length
        continue
      }
    }

    // Word (identifier)
    if (/[\w-]/.test(char)) {
      const match = remaining.match(/^[\w-]+:?/)
      if (match) {
        const value = match[0]
        const isDefinition = value.endsWith(':')
        const word = isDefinition ? value.slice(0, -1) : value

        const type = classifyWord(word, isDefinition, currentPropertyDef)
        tokens.push({
          type,
          value,
          line: lineNum,
          column,
          indent,
        })

        // Update property context
        if (type === 'PROPERTY') {
          currentPropertyDef = getPropertyDefinitionByAnyName(word)
        }

        pos += value.length
        column += value.length
        continue
      }
    }

    // Unknown character
    tokens.push({
      type: 'UNKNOWN',
      value: char,
      line: lineNum,
      column,
      indent,
    })
    pos++
    column++
  }

  return tokens
}

/**
 * Parse a quoted string
 */
function parseString(str: string): string {
  const quote = str[0]
  let result = quote
  let i = 1

  while (i < str.length) {
    const char = str[i]
    if (char === '\\' && i + 1 < str.length) {
      result += char + str[i + 1]
      i += 2
    } else if (char === quote) {
      result += char
      break
    } else {
      result += char
      i++
    }
  }

  return result
}

/**
 * Check if a word is a valid enum value for the current property
 */
function isEnumValueForProperty(word: string, propDef: ReturnType<typeof getPropertyDefinitionByAnyName>): boolean {
  if (!propDef || propDef.valueType !== 'enum' || !propDef.enumValues) {
    return false
  }
  return propDef.enumValues.includes(word)
}

/**
 * Classify a word token
 */
function classifyWord(
  word: string,
  isDefinition: boolean,
  currentPropertyDef?: ReturnType<typeof getPropertyDefinitionByAnyName>
): TokenType {
  // Component definition (Name:)
  if (isDefinition && /^[A-Z]/.test(word)) {
    return 'COMPONENT_DEF'
  }

  // Component instance (PascalCase)
  if (/^[A-Z]/.test(word)) {
    return 'COMPONENT'
  }

  // Check if it's a corner (before direction, as corners are more specific)
  if (CORNER_DIRECTIONS.has(word)) {
    // Only if previous property supports corners
    if (currentPropertyDef && supportsCorners(currentPropertyDef.name)) {
      return 'CORNER'
    }
  }

  // Check if it's a direction
  if (ALL_DIRECTIONS.has(word)) {
    // Only if previous property supports directions
    if (currentPropertyDef && supportsDirections(currentPropertyDef.name)) {
      return 'DIRECTION'
    }
    // Also allow as standalone alignment keyword
    if (!currentPropertyDef && ['left', 'right', 'top', 'bottom', 'center'].includes(word)) {
      return 'PROPERTY'
    }
  }

  // IMPORTANT: If the word is a valid enum value for the current property,
  // treat it as a KEYWORD (value) rather than PROPERTY/STATE/etc.
  // This handles cases like `cursor pointer` where `pointer` is both a property
  // and an enum value for cursor.
  if (currentPropertyDef && isEnumValueForProperty(word, currentPropertyDef)) {
    return 'KEYWORD'
  }

  // Check if it's a property
  if (getPropertyDefinitionByAnyName(word)) {
    return 'PROPERTY'
  }

  // Events (imported from properties.ts)
  if (EVENT_KEYWORDS.has(word)) {
    return 'EVENT'
  }

  // Event typos - words starting with "on" that look like events
  // Treat as EVENT so they flow through to parser for proper error handling
  if (word.startsWith('on') && word.length >= 4 && /^on[a-z]+$/i.test(word)) {
    return 'EVENT'
  }

  // States (combined SYSTEM_STATES + BEHAVIOR_STATES)
  if (STATES.has(word)) {
    return 'STATE'
  }

  // Actions (imported from properties.ts)
  if (ACTION_KEYWORDS.has(word)) {
    return 'ACTION'
  }

  // Control flow (imported from properties.ts)
  if (CONTROL_KEYWORDS.has(word)) {
    return 'CONTROL'
  }

  // Keywords (combined from multiple imported sets)
  if (PREPROCESSOR_KEYWORDS.has(word)) {
    return 'KEYWORD'
  }

  // Default to keyword for unknown words
  return 'KEYWORD'
}
