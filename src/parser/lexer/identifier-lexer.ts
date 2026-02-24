/**
 * @module identifier-lexer
 * @description Identifier- und Keyword-Parsing für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Identifier und bestimmt deren Token-Typ
 *
 * Dies ist der komplexeste Teil des Lexers:
 * - Unterscheidet 15+ verschiedene Token-Typen
 * - Handhabt hyphenated Identifier (slide-up, arrow-down)
 * - Erkennt Component Property Access (Email.value)
 * - Wendet Heuristiken für Tippfehler an
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-TYP ENTSCHEIDUNGSBAUM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @algorithm determineTokenType(value)
 *
 * 1. PROPERTIES Set?          → PROPERTY (pad, gap, bg, col)
 * 2. Direction/Combo?         → DIRECTION (l, r, l-r, u-d)
 * 3. BORDER_STYLES?           → BORDER_STYLE (solid, dashed)
 * 4. KEYWORDS?                → KEYWORD (from, as, named)
 * 5. STATE_KEYWORD?           → STATE (state)
 * 6. EVENTS_KEYWORD?          → EVENTS (events)
 * 7. EVENT_KEYWORDS?          → EVENT (onclick, onhover)
 * 8. CONTROL_KEYWORDS?        → CONTROL (if, not, and, else)
 * 9. ANIMATION_KEYWORDS?      → ANIMATION (fade, slide-up)
 * 10. ANIMATION_ACTION?       → ANIMATION_ACTION (show, hide)
 * 11. looksLikeEvent?         → UNKNOWN_EVENT (onclck)
 * 12. looksLikeAnimation?     → UNKNOWN_ANIMATION (slideup)
 * 13. looksLikeProperty?      → UNKNOWN_PROPERTY (paddin)
 * 14. PascalCase + "*"?       → MULTIPLE_DEF (Item*)
 * 15. PascalCase + ":"?       → COMPONENT_DEF (Button:)
 * 16. Sonst                   → COMPONENT_NAME
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HYPHENATED IDENTIFIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Greedy Matching (Behavior Targets, Actions, Events)
 *   self-and-before    → Vollständig matchen
 *   deactivate-siblings → Vollständig matchen
 *   onclick-outside    → Vollständig matchen
 *   clear-selection    → Vollständig matchen
 *
 * @syntax Incremental Matching (Properties, Animations, Key-Modifiers)
 *   slide-up           → ANIMATION
 *   arrow-down         → KEY_MODIFIER (via COMPONENT_NAME)
 *   border-color       → PROPERTY
 *   Primary-Button     → COMPONENT_NAME (PascalCase)
 *
 * @algorithm
 * 1. Versuche greedy match für bekannte Behavior Targets/Actions
 * 2. Falls nicht: Inkrementell matchen solange gültig
 * 3. Stoppe wenn Erweiterung nicht in bekannten Sets
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENT PROPERTY ACCESS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax ComponentName.property
 *   Email.value        → COMPONENT_NAME "Email.value"
 *   Submit.disabled    → COMPONENT_NAME "Submit.disabled"
 *   Panel.visible      → COMPONENT_NAME "Panel.visible"
 *
 * @condition PascalCase Name vor dem Punkt
 * @output Punkt und Property werden in value inkludiert
 *
 * @used-by index.ts als Haupt-Identifier-Parser
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
  THEME_KEYWORD,
  USE_KEYWORD,
  BORDER_STYLES,
  ANIMATION_KEYWORDS,
  ANIMATION_ACTION_KEYWORDS,
  CONTROL_KEYWORDS,
  PROPERTY_KEYWORD_VALUES,
  SYSTEM_STATES,
  BEHAVIOR_STATES
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

    // Check if the full greedy value is a valid behavior target, action keyword, event keyword,
    // or property keyword value (e.g., not-allowed for cursor)
    // (e.g., self-and-before, deactivate-siblings, toggle-state, clear-selection, onclick-outside, not-allowed)
    if (BEHAVIOR_TARGETS.has(greedyValue) || ACTION_KEYWORDS.has(greedyValue) || EVENT_KEYWORDS.has(greedyValue) || PROPERTY_KEYWORD_VALUES.has(greedyValue)) {
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
  // Check for state blocks BEFORE checking properties.
  // State names like 'disabled' are both in PROPERTIES and SYSTEM_STATES.
  // When followed by '{', they should be COMPONENT_NAME to enable state block parsing.
  if ((SYSTEM_STATES.has(value) || BEHAVIOR_STATES.has(value))) {
    // Check if followed by { (possibly with whitespace)
    const afterIdent = content.slice(pos).trimStart()
    if (afterIdent.startsWith('{')) {
      return 'COMPONENT_NAME'
    }
  }
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
  // Theme keyword: theme dark: or theme light:
  if (value === THEME_KEYWORD) {
    return 'THEME'
  }
  // Use keyword: use theme dark (handled as KEYWORD for parsing)
  if (value === USE_KEYWORD) {
    return 'KEYWORD'
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
  // And not for brace-syntax (Name: { }) - check if { follows after colon
  if (content[pos] === ':' && /^[A-Z]/.test(value) && content[pos + 1] !== ':') {
    // Check for brace-syntax: Name: { } or Name: Parent { }
    const afterColon = content.slice(pos + 1).trim()
    const isV2Syntax = afterColon.startsWith('{') || /^[A-Z][a-zA-Z0-9_-]*\s*\{/.test(afterColon)
    if (!isV2Syntax) {
      return 'COMPONENT_DEF'
    }
  }

  return 'COMPONENT_NAME'
}
