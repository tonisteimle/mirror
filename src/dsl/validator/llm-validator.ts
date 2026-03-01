/**
 * @module dsl/validator/llm-validator
 * @description Validiert LLM-generierten Mirror-Code gegen das Master-Schema
 *
 * Prüft:
 * - Properties: Name existiert, Wert-Typ korrekt, Range gültig
 * - Events: Name existiert, Key-Modifier gültig
 * - Actions: Name existiert, Target gültig
 * - States: Name existiert
 * - Animations: Name existiert
 */

import {
  MIRROR_SCHEMA,
  getPropertyDefinitionByAnyName,
  isValidEvent,
  isValidAction,
  isValidState,
  isValidAnimation,
  isValidKeyModifier,
  isValidActionTarget,
  getActionDefinition,
} from '../master-schema'
import type { PropertyDefinition } from '../master-schema'

// =============================================================================
// TYPES
// =============================================================================

export type ErrorType =
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_VALUE'
  | 'VALUE_OUT_OF_RANGE'
  | 'UNKNOWN_EVENT'
  | 'INVALID_KEY_MODIFIER'
  | 'UNKNOWN_ACTION'
  | 'INVALID_ACTION_TARGET'
  | 'UNKNOWN_STATE'
  | 'UNKNOWN_ANIMATION'
  | 'INVALID_DIRECTION'
  | 'INVALID_CORNER'
  | 'SYNTAX_ERROR'

export type WarningType =
  | 'DEPRECATED_PROPERTY'
  | 'PREFER_LONG_FORM'
  | 'MISSING_VALUE'
  | 'REDUNDANT_PROPERTY'
  // Quality warnings
  | 'HARDCODED_VALUE'
  | 'MISSING_HOVER_STATE'
  | 'MISSING_FOCUS_STATE'
  | 'REDUNDANT_DEFINITION'
  | 'INCONSISTENT_SPACING'
  | 'INCONSISTENT_COLORS'
  | 'COULD_USE_COMPONENT'

export interface ValidationError {
  type: ErrorType
  line: number
  column?: number
  message: string
  found: string
  suggestion?: string
}

export interface ValidationWarning {
  type: WarningType
  line: number
  message: string
  suggestion?: string
}

export interface QualityScore {
  overall: number // 0-100
  correctness: number // 0-100: Keine Syntaxfehler? (höchste Gewichtung)
  tokenUsage: number // 0-100: Wie viel % der Werte sind Tokens?
  consistency: number // 0-100: Konsistenz der Werte
  completeness: number // 0-100: Hover/Focus States für interaktive Elemente?
  reusability: number // 0-100: Werden Komponenten wiederverwendet?
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  quality: QualityScore
  stats: {
    linesChecked: number
    propertiesFound: number
    eventsFound: number
    actionsFound: number
    statesFound: number
    tokensUsed: number
    hardcodedValues: number
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Directions that can follow spacing properties
 */
const VALID_DIRECTIONS = new Set([
  'left', 'right', 'top', 'bottom',
  'l', 'r', 'u', 'd', 't', 'b',
  'left-right', 'top-bottom', 'l-r', 'u-d', 't-b',
])

/**
 * Corners that can follow radius
 */
const VALID_CORNERS = new Set([
  'tl', 'tr', 'bl', 'br',
  'top-left', 'top-right', 'bottom-left', 'bottom-right',
  't', 'b', 'l', 'r',
])

/**
 * Keywords that should be ignored in property validation
 */
const IGNORED_KEYWORDS = new Set([
  'if', 'then', 'else', 'each', 'in', 'where', 'and', 'or', 'not',
  'data', 'named', 'as', 'from', 'state', 'events', 'to',
  // Animation action keywords
  'show', 'hide', 'animate',
  // Timing modifiers
  'debounce', 'delay',
  // Action targets (used with actions like "select highlighted")
  'self', 'next', 'prev', 'first', 'last', 'first-empty',
  'highlighted', 'selected', 'self-and-before', 'all', 'none',
])

/**
 * All known actions
 */
const ALL_ACTIONS = new Set(Object.keys(MIRROR_SCHEMA.actions))

/**
 * All known events
 */
const ALL_EVENTS = new Set(Object.keys(MIRROR_SCHEMA.events))

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find similar property names for suggestions
 * Prefers canonical (long) forms over short forms
 */
function findSimilarProperty(input: string): string | undefined {
  // Get canonical names (long forms) and short forms separately
  const canonicalNames = Object.keys(MIRROR_SCHEMA.properties)
  const shortForms = Object.values(MIRROR_SCHEMA.properties).flatMap(p => p.shortForms)

  // Calculate Levenshtein distances for all names
  const candidates = [
    ...canonicalNames.map(n => ({
      name: n,
      dist: levenshteinDistance(input.toLowerCase(), n.toLowerCase()),
      isCanonical: true,
    })),
    ...shortForms.map(n => ({
      name: n,
      dist: levenshteinDistance(input.toLowerCase(), n.toLowerCase()),
      isCanonical: false,
    })),
  ]
    .filter(x => x.dist <= 3)
    .sort((a, b) => {
      // Sort by distance first
      if (a.dist !== b.dist) return a.dist - b.dist
      // Prefer canonical forms over short forms
      if (a.isCanonical !== b.isCanonical) return a.isCanonical ? -1 : 1
      // Prefer longer names (more specific)
      return b.name.length - a.name.length
    })

  return candidates[0]?.name
}

/**
 * Find similar event names
 */
function findSimilarEvent(input: string): string | undefined {
  const events = Object.keys(MIRROR_SCHEMA.events)
  const closest = events
    .map(e => ({ name: e, dist: levenshteinDistance(input.toLowerCase(), e.toLowerCase()) }))
    .filter(x => x.dist <= 3)
    .sort((a, b) => a.dist - b.dist)[0]
  return closest?.name
}

/**
 * Find similar action names
 */
function findSimilarAction(input: string): string | undefined {
  const actions = Object.keys(MIRROR_SCHEMA.actions)
  const closest = actions
    .map(a => ({ name: a, dist: levenshteinDistance(input.toLowerCase(), a.toLowerCase()) }))
    .filter(x => x.dist <= 3)
    .sort((a, b) => a.dist - b.dist)[0]
  return closest?.name
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if a string looks like a color value
 */
function isColorValue(value: string): boolean {
  return /^#[0-9A-Fa-f]{3,8}$/.test(value) || value.startsWith('$')
}

/**
 * Check if a string looks like a number
 */
function isNumericValue(value: string): boolean {
  return /^-?\d+(\.\d+)?(%)?$/.test(value)
}

/**
 * Parse a numeric value, handling percentages
 */
function parseNumericValue(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(%)?$/)
  if (!match) return null
  return parseFloat(match[1])
}

/**
 * Known component names that should not be validated as properties
 */
const COMPONENT_NAME_PATTERN = /^[A-Z][a-zA-Z0-9]*$/

/**
 * Check if a token looks like a component name (starts with uppercase)
 */
function isComponentName(token: string): boolean {
  return COMPONENT_NAME_PATTERN.test(token)
}

/**
 * Check if token looks like an event (starts with 'on')
 */
function looksLikeEvent(token: string): boolean {
  return token.startsWith('on')
}

/**
 * Check if token is a known property (accepts both short and long forms)
 */
function isKnownProperty(token: string): boolean {
  return getPropertyDefinitionByAnyName(token) !== undefined
}

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Validate a property and its value
 */
function validatePropertyValue(
  def: PropertyDefinition,
  value: string,
  line: number,
  errors: ValidationError[]
): void {
  switch (def.valueType) {
    case 'number':
      if (!isNumericValue(value) && !value.startsWith('$')) {
        errors.push({
          type: 'INVALID_VALUE',
          line,
          message: `Property '${def.name}' expects a number, got '${value}'`,
          found: value,
        })
      } else if (def.range && isNumericValue(value)) {
        const num = parseNumericValue(value)
        if (num !== null) {
          if (def.range.min !== undefined && num < def.range.min) {
            errors.push({
              type: 'VALUE_OUT_OF_RANGE',
              line,
              message: `Value ${num} is below minimum ${def.range.min} for '${def.name}'`,
              found: value,
              suggestion: `Use a value >= ${def.range.min}`,
            })
          }
          if (def.range.max !== undefined && num > def.range.max) {
            errors.push({
              type: 'VALUE_OUT_OF_RANGE',
              line,
              message: `Value ${num} is above maximum ${def.range.max} for '${def.name}'`,
              found: value,
              suggestion: `Use a value <= ${def.range.max}`,
            })
          }
        }
      }
      break

    case 'color':
      if (!isColorValue(value) && value !== 'transparent') {
        errors.push({
          type: 'INVALID_VALUE',
          line,
          message: `Property '${def.name}' expects a color (hex or token), got '${value}'`,
          found: value,
          suggestion: 'Use #RRGGBB or $tokenName',
        })
      }
      break

    case 'enum':
      if (def.enumValues && !def.enumValues.includes(value)) {
        errors.push({
          type: 'INVALID_VALUE',
          line,
          message: `Invalid value '${value}' for '${def.name}'`,
          found: value,
          suggestion: `Valid values: ${def.enumValues.join(', ')}`,
        })
      }
      break
  }
}

// =============================================================================
// TOKENIZER
// =============================================================================

interface Token {
  type: 'word' | 'string' | 'number' | 'color' | 'token' | 'operator' | 'colon' | 'comma'
  value: string
  column: number
}

/**
 * Simple tokenizer for Mirror code lines
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    // Skip whitespace
    if (/\s/.test(line[i])) {
      i++
      continue
    }

    // Comments
    if (line[i] === '/' && line[i + 1] === '/') {
      break // Rest of line is comment
    }

    // String literals
    if (line[i] === '"') {
      const start = i
      i++
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\') i++ // Skip escaped char
        i++
      }
      i++ // Skip closing quote
      tokens.push({ type: 'string', value: line.slice(start, i), column: start })
      continue
    }

    // Colon
    if (line[i] === ':') {
      tokens.push({ type: 'colon', value: ':', column: i })
      i++
      continue
    }

    // Comma
    if (line[i] === ',') {
      tokens.push({ type: 'comma', value: ',', column: i })
      i++
      continue
    }

    // Operators
    if (/[=<>!+\-*/]/.test(line[i])) {
      const start = i
      while (i < line.length && /[=<>!+\-*/]/.test(line[i])) i++
      tokens.push({ type: 'operator', value: line.slice(start, i), column: start })
      continue
    }

    // Color hex
    if (line[i] === '#') {
      const start = i
      i++
      while (i < line.length && /[0-9A-Fa-f]/.test(line[i])) i++
      tokens.push({ type: 'color', value: line.slice(start, i), column: start })
      continue
    }

    // Token (variable)
    if (line[i] === '$') {
      const start = i
      i++
      while (i < line.length && /[\w.-]/.test(line[i])) i++
      tokens.push({ type: 'token', value: line.slice(start, i), column: start })
      continue
    }

    // Number (including negative)
    if (/\d/.test(line[i]) || (line[i] === '-' && /\d/.test(line[i + 1] || ''))) {
      const start = i
      if (line[i] === '-') i++
      while (i < line.length && /[\d.]/.test(line[i])) i++
      if (line[i] === '%') i++
      tokens.push({ type: 'number', value: line.slice(start, i), column: start })
      continue
    }

    // Word
    if (/[\w-]/.test(line[i])) {
      const start = i
      while (i < line.length && /[\w-]/.test(line[i])) i++
      tokens.push({ type: 'word', value: line.slice(start, i), column: start })
      continue
    }

    // Unknown character, skip
    i++
  }

  return tokens
}

// =============================================================================
// MAIN VALIDATOR
// =============================================================================

/**
 * Quality tracking during validation
 */
interface QualityTracker {
  tokensUsed: number
  hardcodedColors: string[]
  hardcodedSpacing: number[]
  interactiveElements: Set<string> // Components that have onclick/onhover
  elementsWithHover: Set<string> // Components that have hover state defined
  elementsWithFocus: Set<string> // Components that have focus state defined
  componentDefinitions: Set<string> // Defined components
  componentInstances: Map<string, number> // How often each component is used
}

/**
 * Calculate quality scores from tracking data
 */
function calculateQualityScore(
  tracker: QualityTracker,
  errorCount: number,
  linesChecked: number
): QualityScore {
  // Correctness: Based on error rate (errors per line)
  // 0 errors = 100%, more errors = lower score
  const correctness = linesChecked === 0
    ? 100
    : Math.max(0, Math.round(100 - (errorCount / linesChecked) * 100))

  // Token Usage: % of values that are tokens
  const totalValues = tracker.tokensUsed + tracker.hardcodedColors.length + tracker.hardcodedSpacing.length
  const tokenUsage = totalValues > 0
    ? Math.round((tracker.tokensUsed / totalValues) * 100)
    : 100

  // Consistency: Fewer unique hardcoded values = more consistent
  const uniqueColors = new Set(tracker.hardcodedColors).size
  const uniqueSpacing = new Set(tracker.hardcodedSpacing).size
  const totalUnique = uniqueColors + uniqueSpacing
  // Penalize for many different hardcoded values
  const consistency = totalUnique === 0
    ? 100
    : Math.min(100, Math.max(0, 100 - (totalUnique - 3) * 10)) // Allow 3 unique values without penalty

  // Completeness: Interactive elements should have hover/focus states
  const interactiveElements = [...tracker.interactiveElements]
  let completeness: number
  if (interactiveElements.length === 0) {
    // No interactive elements = full completeness
    completeness = 100
  } else {
    // Check how many interactive elements have hover states
    let withHover = 0
    let withFocus = 0
    for (const elem of interactiveElements) {
      if (tracker.elementsWithHover.has(elem)) withHover++
      if (tracker.elementsWithFocus.has(elem)) withFocus++
    }
    // Hover is more important (70%), focus is nice-to-have (30%)
    const hoverRatio = withHover / interactiveElements.length
    const focusRatio = withFocus / interactiveElements.length
    completeness = Math.round(hoverRatio * 70 + focusRatio * 30)
  }

  // Reusability: Component reuse ratio
  let totalInstances = 0
  tracker.componentInstances.forEach(count => { totalInstances += count })
  const definitionCount = tracker.componentDefinitions.size
  const reusability = definitionCount === 0
    ? 100
    : Math.min(100, Math.round((totalInstances / Math.max(1, definitionCount)) * 25))

  // Overall: Weighted average
  // Correctness dominates (60%), rest shares 40%
  const overall = Math.round(
    correctness * 0.60 +
    tokenUsage * 0.15 +
    consistency * 0.10 +
    completeness * 0.10 +
    reusability * 0.05
  )

  return { overall, correctness, tokenUsage, consistency, completeness, reusability }
}

/**
 * Validate Mirror DSL code
 */
export function validateMirrorCode(code: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const stats = {
    linesChecked: 0,
    propertiesFound: 0,
    eventsFound: 0,
    actionsFound: 0,
    statesFound: 0,
    tokensUsed: 0,
    hardcodedValues: 0,
  }

  // Quality tracking
  const tracker: QualityTracker = {
    tokensUsed: 0,
    hardcodedColors: [],
    hardcodedSpacing: [],
    interactiveElements: new Set(),
    elementsWithHover: new Set(),
    elementsWithFocus: new Set(),
    componentDefinitions: new Set(),
    componentInstances: new Map(),
  }

  const lines = code.split('\n')
  let currentComponent: string | null = null

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) {
      continue
    }

    stats.linesChecked++
    const tokens = tokenizeLine(trimmed)

    if (tokens.length === 0) continue

    // Track position in token stream
    let i = 0

    // Skip leading component name (e.g., "Button", "Card:")
    if (tokens[i]?.type === 'word' && isComponentName(tokens[i].value)) {
      const componentName = tokens[i].value
      currentComponent = componentName
      i++

      // Check if this is a definition (has colon)
      if (tokens[i]?.type === 'colon') {
        tracker.componentDefinitions.add(componentName)
        i++
      } else {
        // It's an instance - track usage
        const count = tracker.componentInstances.get(componentName) || 0
        tracker.componentInstances.set(componentName, count + 1)
      }

      // Skip parent component in inheritance (e.g., "PrimaryButton: Button")
      if (tokens[i]?.type === 'word' && isComponentName(tokens[i].value)) {
        i++
      }
    }

    // Track all token values ($...) and hardcoded values in this line
    for (const t of tokens) {
      if (t.type === 'token') {
        tracker.tokensUsed++
        stats.tokensUsed++
      } else if (t.type === 'color') {
        tracker.hardcodedColors.push(t.value)
        stats.hardcodedValues++
      } else if (t.type === 'number') {
        const num = parseFloat(t.value)
        // Track spacing values (small numbers, likely padding/margin/gap)
        if (num > 0 && num <= 100) {
          tracker.hardcodedSpacing.push(num)
          stats.hardcodedValues++
        }
      }
    }

    // Process remaining tokens
    while (i < tokens.length) {
      const token = tokens[i]

      // Skip non-word tokens
      if (token.type !== 'word') {
        i++
        continue
      }

      const word = token.value

      // 1. Check for events (onclick, onhover, etc.)
      if (looksLikeEvent(word)) {
        if (isValidEvent(word)) {
          stats.eventsFound++

          // Track interactive elements for quality scoring
          if ((word === 'onclick' || word === 'onhover') && currentComponent) {
            tracker.interactiveElements.add(currentComponent)
          }

          // Check for key modifier (onkeydown escape:)
          if ((word === 'onkeydown' || word === 'onkeyup') && tokens[i + 1]?.type === 'word') {
            const modifier = tokens[i + 1].value
            // Check if next token is followed by colon (key modifier syntax)
            if (tokens[i + 2]?.type === 'colon' || modifier.endsWith(':')) {
              const cleanModifier = modifier.replace(/:$/, '')
              if (!isValidKeyModifier(cleanModifier)) {
                errors.push({
                  type: 'INVALID_KEY_MODIFIER',
                  line: lineNum + 1,
                  message: `Invalid key modifier: '${cleanModifier}'`,
                  found: cleanModifier,
                  suggestion: `Valid keys: ${MIRROR_SCHEMA.events.onkeydown.keyModifiers?.join(', ')}`,
                })
              }
              i += 2 // Skip modifier and colon
            }
          }
        } else {
          // Unknown event
          const suggestion = findSimilarEvent(word)
          errors.push({
            type: 'UNKNOWN_EVENT',
            line: lineNum + 1,
            message: `Unknown event: '${word}'`,
            found: word,
            suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
          })
        }
        i++
        continue
      }

      // 2. Check for actions
      if (ALL_ACTIONS.has(word)) {
        // Special case: "show"/"hide" followed by animation keywords are animation directives
        if ((word === 'show' || word === 'hide') && tokens[i + 1]?.type === 'word') {
          const nextWord = tokens[i + 1].value
          if (isValidAnimation(nextWord)) {
            // This is an animation directive like "show fade slide-up 300"
            // Skip all animation keywords
            i++
            while (i < tokens.length &&
                   tokens[i].type === 'word' &&
                   isValidAnimation(tokens[i].value)) {
              i++
            }
            // Skip duration if present
            if (tokens[i]?.type === 'number') {
              i++
            }
            continue
          }
        }

        stats.actionsFound++

        // Check target if applicable
        const nextToken = tokens[i + 1]
        if (nextToken?.type === 'word') {
          const target = nextToken.value
          const actionDef = getActionDefinition(word)
          // Skip target validation if target is an ignored keyword (like action targets)
          if (actionDef?.validTargets &&
              !isValidActionTarget(word, target) &&
              !isComponentName(target) &&
              !IGNORED_KEYWORDS.has(target)) {
            errors.push({
              type: 'INVALID_ACTION_TARGET',
              line: lineNum + 1,
              message: `Invalid target '${target}' for action '${word}'`,
              found: target,
              suggestion: `Valid targets: ${actionDef.validTargets.join(', ')}`,
            })
          }
        }
        i++
        continue
      }

      // 2b. Check for system state blocks BEFORE action typo checking
      // This prevents valid states like 'active' from being flagged as 'activate' typos
      if (isValidState(word) && tokens.length <= 2) {
        stats.statesFound++
        // Track hover/focus for completeness scoring
        if (word === 'hover' && currentComponent) {
          tracker.elementsWithHover.add(currentComponent)
        }
        if (word === 'focus' && currentComponent) {
          tracker.elementsWithFocus.add(currentComponent)
        }
        if (word === 'active' && currentComponent) {
          tracker.elementsWithHover.add(currentComponent) // active counts for completeness
        }
        i++
        continue
      }

      // 2c. Check for typos in actions (looks like action but not valid)
      // Skip if it's a valid state name
      if (!isKnownProperty(word) && !isComponentName(word) && !IGNORED_KEYWORDS.has(word) && !isValidState(word)) {
        const similarAction = findSimilarAction(word)
        if (similarAction && levenshteinDistance(word, similarAction) <= 2) {
          errors.push({
            type: 'UNKNOWN_ACTION',
            line: lineNum + 1,
            message: `Unknown action: '${word}'`,
            found: word,
            suggestion: `Did you mean '${similarAction}'?`,
          })
          i++
          continue
        }
      }

      // 3. Check for state blocks
      if (word === 'state' && tokens[i + 1]?.type === 'word') {
        const stateName = tokens[i + 1].value
        stats.statesFound++
        // Track hover/focus for completeness scoring
        if (stateName === 'hover' && currentComponent) {
          tracker.elementsWithHover.add(currentComponent)
        }
        if (stateName === 'focus' && currentComponent) {
          tracker.elementsWithFocus.add(currentComponent)
        }
        if (!isValidState(stateName)) {
          errors.push({
            type: 'UNKNOWN_STATE',
            line: lineNum + 1,
            message: `Unknown state: '${stateName}'`,
            found: stateName,
            suggestion: `Valid states: ${Object.keys(MIRROR_SCHEMA.states).join(', ')}`,
          })
        }
        i += 2
        continue
      }

      // 4. Check for animations
      if (isValidAnimation(word)) {
        i++
        continue
      }

      // 6. Check for properties (accepts both short and long forms)
      const propDef = getPropertyDefinitionByAnyName(word)
      if (propDef) {
        stats.propertiesFound++

        // Get value (next token if it's a value type)
        const nextToken = tokens[i + 1]
        if (nextToken && propDef.valueType !== 'boolean') {
          let valueToken = nextToken
          let tokensToSkip = 1 // Skip the value token

          // Check if next is a direction
          if (nextToken.type === 'word' && (VALID_DIRECTIONS.has(nextToken.value) || VALID_CORNERS.has(nextToken.value))) {
            // Direction/corner - look for value after
            valueToken = tokens[i + 2]
            tokensToSkip = 2 // Skip direction + value
          }

          if (valueToken && ['number', 'color', 'token', 'word'].includes(valueToken.type)) {
            validatePropertyValue(propDef, valueToken.value, lineNum + 1, errors)
            i += tokensToSkip // Skip the consumed value token(s)
          }
        }
        i++
        continue
      }

      // 7. Check for unknown tokens that look like properties
      if (!isComponentName(word) &&
          !IGNORED_KEYWORDS.has(word) &&
          !VALID_DIRECTIONS.has(word) &&
          !VALID_CORNERS.has(word) &&
          !isNumericValue(word) &&
          !ALL_EVENTS.has(word) &&
          !ALL_ACTIONS.has(word) &&
          !isValidState(word) &&
          !isValidAnimation(word)) {

        // This might be an unknown property
        const suggestion = findSimilarProperty(word)
        if (suggestion) {
          errors.push({
            type: 'UNKNOWN_PROPERTY',
            line: lineNum + 1,
            message: `Unknown property: '${word}'`,
            found: word,
            suggestion: `Did you mean '${suggestion}'?`,
          })
        }
      }

      i++
    }
  }

  // Generate quality warnings
  if (tracker.hardcodedColors.length > 0 && tracker.tokensUsed === 0) {
    warnings.push({
      type: 'HARDCODED_VALUE',
      line: 0,
      message: `${tracker.hardcodedColors.length} hardcoded color(s) found. Consider using tokens like $primary.bg`,
      suggestion: 'Use semantic tokens for better maintainability',
    })
  }

  // Check which interactive elements are missing hover states
  const missingHover = [...tracker.interactiveElements].filter(
    elem => !tracker.elementsWithHover.has(elem)
  )
  if (missingHover.length > 0) {
    warnings.push({
      type: 'MISSING_HOVER_STATE',
      line: 0,
      message: `Interactive element(s) without hover state: ${missingHover.join(', ')}`,
      suggestion: 'Add hover state for better UX',
    })
  }

  const uniqueSpacing = new Set(tracker.hardcodedSpacing)
  if (uniqueSpacing.size > 5) {
    warnings.push({
      type: 'INCONSISTENT_SPACING',
      line: 0,
      message: `${uniqueSpacing.size} different spacing values used: ${[...uniqueSpacing].sort((a, b) => a - b).join(', ')}`,
      suggestion: 'Consider using consistent spacing tokens like $sm.pad, $md.pad, $lg.pad',
    })
  }

  // Calculate quality score
  const quality = calculateQualityScore(tracker, errors.length, stats.linesChecked)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    quality,
    stats,
  }
}

/**
 * Format validation result as a human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = []

  if (result.valid) {
    lines.push('✅ Validation passed')
  } else {
    lines.push(`❌ Validation failed with ${result.errors.length} error(s)`)
  }

  lines.push('')

  // Quality Score
  const q = result.quality
  const scoreEmoji = q.overall >= 80 ? '🟢' : q.overall >= 50 ? '🟡' : '🔴'
  lines.push(`${scoreEmoji} Quality Score: ${q.overall}/100`)
  lines.push(`   Correctness: ${q.correctness}% (60%) | Tokens: ${q.tokenUsage}% (15%) | Consistency: ${q.consistency}% (10%)`)
  lines.push(`   Completeness: ${q.completeness}% (10%) | Reusability: ${q.reusability}% (5%)`)
  lines.push('')

  lines.push(`Stats: ${result.stats.linesChecked} lines, ${result.stats.propertiesFound} properties, ${result.stats.eventsFound} events, ${result.stats.tokensUsed} tokens, ${result.stats.hardcodedValues} hardcoded`)
  lines.push('')

  if (result.errors.length > 0) {
    lines.push('Errors:')
    for (const error of result.errors) {
      lines.push(`  Line ${error.line}: ${error.message}`)
      if (error.suggestion) {
        lines.push(`    → ${error.suggestion}`)
      }
    }
    lines.push('')
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:')
    for (const warning of result.warnings) {
      lines.push(`  ${warning.message}`)
      if (warning.suggestion) {
        lines.push(`    → ${warning.suggestion}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Quick validation check - returns true if valid
 */
export function isValidMirrorCode(code: string): boolean {
  return validateMirrorCode(code).valid
}
