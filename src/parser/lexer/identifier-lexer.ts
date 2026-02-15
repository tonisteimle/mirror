/**
 * Identifier and keyword parsing logic for the Mirror DSL lexer.
 * Handles component names, properties, keywords, and special identifiers.
 */

import {
  PROPERTIES,
  KEYWORDS,
  DIRECTIONS,
  isDirectionOrCombo,
  EVENT_KEYWORDS,
  KEY_MODIFIERS,
  BEHAVIOR_TARGETS,
  ACTION_KEYWORDS,
  STATE_KEYWORD,
  EVENTS_KEYWORD,
  BORDER_STYLES,
  ANIMATION_KEYWORDS,
  ANIMATION_ACTION_KEYWORDS,
  CONTROL_KEYWORDS
} from '../../dsl/properties'
import type { Token, TokenType } from './token-types'
import { looksLikeEvent, looksLikeAnimation, looksLikeProperty } from './heuristics'

export interface IdentifierLexResult {
  token: Token
  newPos: number
  newColumn: number
}

/**
 * Parse an identifier token (word starting with a letter or underscore).
 * Determines the token type based on the identifier value.
 */
export function parseIdentifier(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): IdentifierLexResult {
  let value = ''

  // Collect initial word characters
  while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  // Check for hyphenated identifiers (properties, directions, animations, behavior targets, component names)
  // First: Try to match full hyphenated behavior targets like "self-and-before"
  // These need greedy matching because intermediate values may not be valid
  if (content[pos] === '-' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
    // Collect full hyphenated identifier (greedy)
    let greedyValue = value
    let greedyPos = pos
    while (content[greedyPos] === '-' && /[a-zA-Z]/.test(content[greedyPos + 1] || '')) {
      const restMatch = content.slice(greedyPos + 1).match(/^[a-zA-Z0-9_]+/)
      if (restMatch) {
        greedyValue += '-' + restMatch[0]
        greedyPos += 1 + restMatch[0].length
      } else {
        break
      }
    }

    // Check if the full greedy value is a valid behavior target, action keyword, or event keyword
    // (e.g., self-and-before, deactivate-siblings, toggle-state, clear-selection, onclick-outside)
    if (BEHAVIOR_TARGETS.has(greedyValue) || ACTION_KEYWORDS.has(greedyValue) || EVENT_KEYWORDS.has(greedyValue)) {
      value = greedyValue
      pos = greedyPos
    } else {
      // Fall back to incremental matching for properties, animations, etc.
      while (content[pos] === '-' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
        const restMatch = content.slice(pos + 1).match(/^[a-zA-Z0-9_]+/)
        if (restMatch) {
          const hyphenatedValue = value + '-' + restMatch[0]
          // Check if it's a valid property, direction combo, animation keyword,
          // key modifier (arrow-down, etc.), or a PascalCase component name
          const isPascalCase = /^[A-Z]/.test(value)
          if (PROPERTIES.has(hyphenatedValue) || isDirectionOrCombo(hyphenatedValue) || ANIMATION_KEYWORDS.has(hyphenatedValue) || KEY_MODIFIERS.has(hyphenatedValue) || isPascalCase) {
            value = hyphenatedValue
            pos += 1 + restMatch[0].length // skip hyphen + rest
          } else {
            break
          }
        } else {
          break
        }
      }
    }
  }

  // Check for component property access: ComponentName.property
  // (e.g., Email.value, Submit.disabled, Primary-Button.disabled)
  // Only for PascalCase component names (start with uppercase, may include hyphens)
  if (content[pos] === '.' && /^[A-Z][a-zA-Z0-9_-]*$/.test(value) && /[a-zA-Z]/.test(content[pos + 1] || '')) {
    // Include the dot and property name
    value += content[pos] // add '.'
    pos++
    while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
      value += content[pos]
      pos++
    }
  }

  // Determine token type
  const type = determineTokenType(value, content, pos)
  let newColumn = column + value.length

  // Handle special cases that consume additional characters
  if (type === 'MULTIPLE_DEF' && content[pos] === '*') {
    pos++
    newColumn++
  } else if (type === 'COMPONENT_DEF' && content[pos] === ':') {
    pos++
    newColumn++
  }

  return {
    token: { type, value, line: lineNum, column },
    newPos: pos,
    newColumn
  }
}

/**
 * Determine the token type for an identifier value.
 */
function determineTokenType(value: string, content: string, pos: number): TokenType {
  if (PROPERTIES.has(value)) {
    return 'PROPERTY'
  }
  if (isDirectionOrCombo(value)) {
    return 'DIRECTION'
  }
  if (BORDER_STYLES.has(value)) {
    return 'BORDER_STYLE'
  }
  if (KEYWORDS.has(value)) {
    return 'KEYWORD'
  }
  if (value === STATE_KEYWORD) {
    return 'STATE'
  }
  if (value === EVENTS_KEYWORD) {
    return 'EVENTS'
  }
  if (EVENT_KEYWORDS.has(value)) {
    return 'EVENT'
  }
  if (CONTROL_KEYWORDS.has(value)) {
    return 'CONTROL'
  }
  if (ANIMATION_KEYWORDS.has(value)) {
    return 'ANIMATION'
  }
  if (ANIMATION_ACTION_KEYWORDS.has(value)) {
    return 'ANIMATION_ACTION'
  }
  if (looksLikeEvent(value)) {
    // V7: Heuristic - looks like an event (on*) but not valid
    return 'UNKNOWN_EVENT'
  }
  if (looksLikeAnimation(value)) {
    // V7: Heuristic - looks like animation but not valid
    return 'UNKNOWN_ANIMATION'
  }
  if (looksLikeProperty(value)) {
    // V7: Heuristic - looks like property but not valid
    return 'UNKNOWN_PROPERTY'
  }

  // NOTE: ACTION_KEYWORDS and POSITION_KEYWORDS are now tokenized as COMPONENT_NAME
  // to allow using words like 'toggle', 'page', 'center' as component names.
  // The parser checks for these keywords by value when needed.

  // Check for * suffix (repeatable element marker)
  if (content[pos] === '*') {
    return 'MULTIPLE_DEF'
  }

  // PascalCase name followed by colon = inline definition (e.g., Input Email:)
  // But not :: which could be something else
  if (content[pos] === ':' && /^[A-Z]/.test(value) && content[pos + 1] !== ':') {
    return 'COMPONENT_DEF'
  }

  return 'COMPONENT_NAME'
}
