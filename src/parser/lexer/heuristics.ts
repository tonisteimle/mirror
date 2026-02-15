/**
 * Heuristic functions for error-tolerant parsing.
 * These functions help detect likely typos and provide better error messages.
 */

import {
  PROPERTIES,
  CONTROL_KEYWORDS,
  EVENT_KEYWORDS,
  BEHAVIOR_TARGETS,
  ACTION_KEYWORDS,
  POSITION_KEYWORDS,
  ANIMATION_KEYWORDS,
  ANIMATION_ACTION_KEYWORDS,
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  TIMING_MODIFIERS
} from '../../dsl/properties'
import { RESERVED_WORDS } from './token-types'

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy matching to detect typos.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if a value looks like it's trying to be an event name.
 * Events start with "on" followed by letters.
 * Examples: "onclck" (onclick), "onhovr" (onhover), "onchng" (onchange)
 */
export function looksLikeEvent(value: string): boolean {
  // Must start with "on" and be followed by letters
  if (!value.startsWith('on') || value.length < 4) {
    return false
  }

  // Already a valid event - don't flag as unknown
  if (EVENT_KEYWORDS.has(value)) {
    return false
  }

  // Check if it's close to any known event
  const rest = value.slice(2) // part after "on"
  for (const event of EVENT_KEYWORDS) {
    const eventRest = event.slice(2)
    const distance = levenshteinDistance(rest, eventRest)
    // Allow up to 2 character differences for event names
    if (distance <= 2 && distance > 0) {
      return true
    }
  }

  // Also flag anything that looks like on[a-z]+ pattern
  // This catches things like "onmouseover" that aren't supported
  return /^on[a-z]+$/.test(value)
}

/**
 * Check if a value looks like it's trying to be an animation.
 * Examples: "slideup" (slide-up), "fde" (fade), "sacle" (scale)
 */
export function looksLikeAnimation(value: string): boolean {
  // Already a valid animation - don't flag as unknown
  if (ANIMATION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag action keywords (open, close, toggle, etc.)
  if (ACTION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag animation action keywords (show, hide, animate)
  if (ANIMATION_ACTION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag position keywords
  if (POSITION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag timing modifiers (debounce, delay)
  if (TIMING_MODIFIERS.has(value)) {
    return false
  }

  // Don't flag PascalCase names (those are component names)
  if (/^[A-Z]/.test(value)) {
    return false
  }

  // Don't flag reserved words
  if (RESERVED_WORDS.has(value)) {
    return false
  }

  const valueLower = value.toLowerCase()

  // Check for common missing-hyphen patterns
  const missingHyphenPatterns = [
    'slideup', 'slidedown', 'slideleft', 'slideright'
  ]
  if (missingHyphenPatterns.includes(valueLower)) {
    return true
  }

  // Check if it's close to any known animation
  for (const anim of ANIMATION_KEYWORDS) {
    // Remove hyphens for comparison
    const animNormalized = anim.replace(/-/g, '')
    const valueNormalized = valueLower.replace(/-/g, '')

    const distance = levenshteinDistance(valueNormalized, animNormalized)
    // Allow up to 2 character differences
    if (distance <= 2 && distance > 0) {
      return true
    }
  }

  return false
}

/**
 * Check if a value looks like it's trying to be a property.
 * Examples: "paddin" (pad/padding), "colr" (col), "radus" (rad)
 */
export function looksLikeProperty(value: string): boolean {
  // Already a valid property - don't flag as unknown
  if (PROPERTIES.has(value)) {
    return false
  }

  // Don't flag PascalCase names (those are component names)
  if (/^[A-Z]/.test(value)) {
    return false
  }

  // Don't flag control keywords
  if (CONTROL_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag action/position keywords (these are valid DSL elements)
  if (ACTION_KEYWORDS.has(value) || POSITION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag behavior targets (self, next, prev, highlighted)
  if (BEHAVIOR_TARGETS.has(value)) {
    return false
  }

  // Don't flag animation action keywords
  if (ANIMATION_ACTION_KEYWORDS.has(value)) {
    return false
  }

  // Don't flag system states (hover, focus, active, disabled)
  if (SYSTEM_STATES.has(value)) {
    return false
  }

  // Don't flag behavior states (valid, invalid, highlighted, selected, etc.)
  if (BEHAVIOR_STATES.has(value)) {
    return false
  }

  // Don't flag reserved words (booleans, CSS keywords, state names, etc.)
  if (RESERVED_WORDS.has(value)) {
    return false
  }

  const valueLower = value.toLowerCase()

  // Check if it's close to any known property
  for (const prop of PROPERTIES) {
    const distance = levenshteinDistance(valueLower, prop)
    // For short properties (1-3 chars), allow 1 char diff
    // For longer properties, allow 2 char diff
    const maxDistance = prop.length <= 3 ? 1 : 2
    if (distance <= maxDistance && distance > 0) {
      return true
    }
  }

  // Check for common typo patterns
  const commonTypos: Record<string, string[]> = {
    'padding': ['paddin', 'paddng', 'padd'],
    'margin': ['margn', 'mrgn', 'marg'],
    'background': ['backgroud', 'backgrund', 'backgrnd'],
    'color': ['colr', 'colour', 'clor'],
    'border': ['bordr', 'boder', 'boreder'],
    'radius': ['radus', 'radis', 'radious'],
    'opacity': ['opactiy', 'opcaity', 'opacty'],
    'height': ['heigt', 'hieght', 'heigth'],
    'width': ['widht', 'wdith', 'widh']
  }

  for (const typos of Object.values(commonTypos)) {
    if (typos.includes(valueLower)) {
      return true
    }
  }

  return false
}
